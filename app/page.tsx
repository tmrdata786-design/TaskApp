'use client';

import { useEffect, useState, useRef } from 'react';
import Select from 'react-select';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, getDocs, arrayUnion, query, where } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';
import { CheckCircle, Clock, Trash2, LayoutList, Table2, KanbanSquare, CalendarDays, BarChartHorizontal, MessageSquare, Edit } from 'lucide-react';
import { useAdmin } from '../lib/useAdmin';
import EditTaskModal from '../components/EditTaskModal';
import FeedbackModal from '../components/FeedbackModal';
import { GanttViewCustom } from '../components/GanttViewCustom';
import { CalendarViewCustom } from '../components/CalendarViewCustom';

interface Task {
  id: string;
  area: string;
  task_type: string;
  project?: string;
  task: string;
  priority: string;
  assignee: string;
  status: string;
  progress: number;
  start_date?: string;
  end_date?: string;
  subtasks?: { id: string; title: string; isCompleted: boolean }[];
  activityLog?: { action: string; timestamp: number; user: string }[];
  feedbackStatus?: string;
}

function EditableDate({ taskId, field, value, isAdmin, onUpdate }: { taskId: string, field: 'start_date'|'end_date', value?: string, isAdmin: boolean, onUpdate: (id: string, field: string, val: string) => void }) {
  const [editing, setEditing] = useState(false);

  if (editing && isAdmin) {
    return (
      <input
        type="date"
        autoFocus
        defaultValue={value || ''}
        className="bg-gray-50 dark:bg-[#1A1D23] border border-indigo-500 rounded text-xs text-gray-900 dark:text-white px-1 py-0.5 outline-none inline-block w-auto"
        onBlur={(e) => {
          setEditing(false);
          if (e.target.value !== value) {
            onUpdate(taskId, field, e.target.value);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          } else if (e.key === 'Escape') {
            setEditing(false);
          }
        }}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <span 
      onDoubleClick={(e) => {
        if (isAdmin) {
          e.stopPropagation();
          e.preventDefault();
          setEditing(true);
        }
      }} 
      className={`cursor-pointer inline-block select-none ${isAdmin ? 'hover:text-indigo-400' : ''}`}
      title={isAdmin ? "Double click to edit" : ""}
    >
      {value || 'N/A'}
    </span>
  );
}

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin, isManager, userArea, userContactName, orgId, loading: adminLoading } = useAdmin();
  const [view, setView] = useState<'list' | 'table' | 'kanban' | 'calendar' | 'gantt'>('list');
  const [activeFeedbackTask, setActiveFeedbackTask] = useState<Task | null>(null);
  const [activeEditTask, setActiveEditTask] = useState<Task | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [areaFilter, setAreaFilter] = useState('All');
  const [projectFilter, setProjectFilter] = useState('All');
  const [assigneeFilter, setAssigneeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [taskTypeFilter, setTaskTypeFilter] = useState('All');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  useEffect(() => {
    const setupTasksListener = async () => {
      if (!orgId) {
        setLoading(false);
        return () => {};
      }
      const q = query(collection(db, 'tasks'), where('orgId', '==', orgId));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        let taskList: Task[] = [];
        snapshot.forEach((doc) => {
          taskList.push({ id: doc.id, ...doc.data() } as Task);
        });
        
        // Filter tasks if not admin
        if (!isAdmin && userContactName) {
          if (isManager && userArea) {
            taskList = taskList.filter(t => t.area === userArea || t.assignee === userContactName);
          } else {
            taskList = taskList.filter(t => t.assignee === userContactName);
          }
        } else if (!isAdmin) {
          // If no matching contact, they see no tasks, or maybe we just don't show any until they are added as a contact
          taskList = [];
        }

        // Sort: Pending/In Progress first
        taskList.sort((a, b) => {
          if (a.status === 'Completed' && b.status !== 'Completed') return 1;
          if (b.status === 'Completed' && a.status !== 'Completed') return -1;
          return 0;
        });
        setTasks(taskList);
        setLoading(false);
      }, (error) => {
        setLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'tasks');
      });
      return unsubscribe;
    };

    let unsubFn: (() => void) | undefined;
    
    // We only want to set this up when admin status has resolved
    if (!adminLoading) {
      setupTasksListener().then(unsub => {
        unsubFn = unsub;
      });
    }

    return () => {
      if (unsubFn) unsubFn();
    };
  }, [isAdmin, isManager, userArea, userContactName, orgId, adminLoading]);

  const updateStatus = async (id: string, currentStatus: string, taskArea: string, explicitStatus?: string) => {
    if (!isAdmin && !(isManager && taskArea === userArea)) return;
    const nextStatus = explicitStatus || (currentStatus === 'Pending' ? 'In Progress' : 
                       currentStatus === 'In Progress' ? 'Completed' : 'Pending');
    
    if (nextStatus === currentStatus) return;

    try {
      const userIdent = userContactName || auth.currentUser?.email || 'Unknown';
      // eslint-disable-next-line react-hooks/purity
      const timestamp = Date.now();
      await updateDoc(doc(db, 'tasks', id), { 
        status: nextStatus,
        activityLog: arrayUnion({ action: `Status changed from ${currentStatus} to ${nextStatus}`, timestamp, user: userIdent }),
        updated_at: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${id}`);
    }
  };

  const updateProgress = async (id: string, val: string, taskArea: string) => {
    if (!isAdmin && !(isManager && taskArea === userArea)) return;
    const newProgress = parseInt(val, 10) / 100;
    try {
      const userIdent = userContactName || auth.currentUser?.email || 'Unknown';
      const timestamp = Date.now();
      await updateDoc(doc(db, 'tasks', id), { 
        progress: newProgress,
        activityLog: arrayUnion({ action: `Progress updated to ${val}%`, timestamp, user: userIdent }),
        updated_at: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${id}`);
    }
  };

  const updateDate = async (id: string, field: string, val: string) => {
    if (!isAdmin) return;
    try {
      const userIdent = userContactName || auth.currentUser?.email || 'Unknown';
      const timestamp = Date.now();
      await updateDoc(doc(db, 'tasks', id), { 
        [field]: val,
        activityLog: arrayUnion({ action: `${field.replace('_', ' ')} updated to ${val}`, timestamp, user: userIdent }),
        updated_at: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${id}`);
    }
  };
  
  const deleteTask = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm('Delete this task?')) return;
    try {
      await deleteDoc(doc(db, 'tasks', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tasks/${id}`);
    }
  };

  if (adminLoading) {
    return <div className="p-8 text-center text-gray-500">Checking permissions...</div>;
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Fetching tasks...</div>;
  }

  const activeTasks = tasks.filter(t => t.status !== 'Completed').length;
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const highPriority = tasks.filter(t => t.priority === 'High' && t.status !== 'Completed').length;

  const allAreas = Array.from(new Set(tasks.map(t => t.area))).filter(Boolean);
  const allProjects = Array.from(new Set(tasks.map(t => t.project))).filter(Boolean);
  const allAssignees = Array.from(new Set(tasks.map(t => t.assignee))).filter(Boolean);
  const allStatuses = ['Pending', 'In Progress', 'Completed'];
  const allPriorities = ['High', 'Medium', 'Low'];
  const allTaskTypes = Array.from(new Set(tasks.map(t => t.task_type))).filter(Boolean);

  const selectStyles = {
    control: (base: any) => ({
      ...base,
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      boxShadow: 'none',
      cursor: 'pointer',
      minHeight: '38px',
      '&:hover': { borderColor: 'transparent' }
    }),
    singleValue: (base: any) => ({
      ...base,
      color: 'inherit'
    }),
    input: (base: any) => ({
      ...base,
      color: 'inherit'
    }),
    menu: (base: any) => ({
      ...base,
      backgroundColor: 'var(--rs-bg)',
      border: '1px solid',
      borderColor: 'var(--rs-border)',
      zIndex: 50
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused ? 'var(--rs-hover)' : 'transparent',
      color: 'inherit',
      '&:active': {
        backgroundColor: 'var(--rs-active)'
      }
    })
  };

  const filteredTasks = tasks.filter(t => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !t.task.toLowerCase().includes(q) &&
        !t.id.toLowerCase().includes(q) &&
        !t.assignee.toLowerCase().includes(q) &&
        !t.area.toLowerCase().includes(q) &&
        !(t.project && t.project.toLowerCase().includes(q))
      ) {
        return false;
      }
    }
    if (areaFilter !== 'All' && t.area !== areaFilter) return false;
    if (projectFilter !== 'All' && t.project !== projectFilter) return false;
    if (assigneeFilter !== 'All' && t.assignee !== assigneeFilter) return false;
    if (statusFilter !== 'All' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false;
    if (taskTypeFilter !== 'All' && t.task_type !== taskTypeFilter) return false;
    if (startDateFilter && (!t.start_date || t.start_date < startDateFilter)) return false;
    if (endDateFilter && (!t.end_date || t.end_date > endDateFilter)) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col mb-4 space-y-4 sm:flex-row sm:justify-between sm:items-end sm:space-y-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white shrink-0">Dashboard Overview</h1>
          <input 
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-white dark:bg-[#11141A] border border-gray-200 dark:border-[#1F2937] rounded-xl text-sm text-gray-700 dark:text-gray-300 px-4 py-2 outline-none focus:border-indigo-500 transition w-full sm:w-64"
          />
        </div>
        <div className="flex bg-white dark:bg-[#11141A] p-1 rounded-xl border border-gray-200 dark:border-[#1F2937] self-start sm:self-auto overflow-x-auto shrink-0">
          <button onClick={() => setView('list')} className={`p-1.5 rounded-lg transition ${view === 'list' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-700 dark:text-gray-300'}`} title="List View"><LayoutList size={18} /></button>
          <button onClick={() => setView('table')} className={`p-1.5 rounded-lg transition ${view === 'table' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-700 dark:text-gray-300'}`} title="Table View"><Table2 size={18} /></button>
          <button onClick={() => setView('kanban')} className={`p-1.5 rounded-lg transition ${view === 'kanban' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-700 dark:text-gray-300'}`} title="Kanban View"><KanbanSquare size={18} /></button>
          <button onClick={() => setView('calendar')} className={`p-1.5 rounded-lg transition ${view === 'calendar' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-700 dark:text-gray-300'}`} title="Calendar View"><CalendarDays size={18} /></button>
          <button onClick={() => setView('gantt')} className={`p-1.5 rounded-lg transition ${view === 'gantt' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-700 dark:text-gray-300'}`} title="Gantt View"><BarChartHorizontal size={18} /></button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#11141A] p-4 rounded-2xl border border-gray-200 dark:border-[#1F2937]">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Active Tasks</p>
          <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{activeTasks}</p>
        </div>
        <div className="bg-white dark:bg-[#11141A] p-4 rounded-2xl border border-gray-200 dark:border-[#1F2937]">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Completed</p>
          <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{completedTasks}</p>
        </div>
        <div className="bg-white dark:bg-[#11141A] p-4 rounded-2xl border border-gray-200 dark:border-[#1F2937]">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">High Priority</p>
          <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{highPriority}</p>
        </div>
      </div>

      {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white dark:bg-[#11141A] border border-gray-200 dark:border-[#1F2937] rounded-lg text-sm min-w-[140px] focus-within:border-indigo-500 transition">
            <Select
              options={[{ value: 'All', label: 'All Areas' }, ...allAreas.map(a => ({ value: a, label: a }))]}
              value={{ value: areaFilter, label: areaFilter === 'All' ? 'All Areas' : areaFilter }}
              onChange={(opt: any) => setAreaFilter(opt?.value || 'All')}
              placeholder="Area"
              styles={selectStyles}
              className="text-gray-700 dark:text-gray-300"
            />
          </div>
          <div className="bg-white dark:bg-[#11141A] border border-gray-200 dark:border-[#1F2937] rounded-lg text-sm min-w-[140px] focus-within:border-indigo-500 transition">
            <Select
              options={[{ value: 'All', label: 'All Projects' }, ...allProjects.map(p => ({ value: p, label: p }))]}
              value={{ value: projectFilter, label: projectFilter === 'All' ? 'All Projects' : projectFilter }}
              onChange={(opt: any) => setProjectFilter(opt?.value || 'All')}
              placeholder="Project"
              styles={selectStyles}
              className="text-gray-700 dark:text-gray-300"
            />
          </div>
          <div className="bg-white dark:bg-[#11141A] border border-gray-200 dark:border-[#1F2937] rounded-lg text-sm min-w-[140px] focus-within:border-indigo-500 transition">
            <Select
              options={[{ value: 'All', label: 'All Assignees' }, ...allAssignees.map(a => ({ value: a, label: a }))]}
              value={{ value: assigneeFilter, label: assigneeFilter === 'All' ? 'All Assignees' : assigneeFilter }}
              onChange={(opt: any) => setAssigneeFilter(opt?.value || 'All')}
              placeholder="Assignee"
              styles={selectStyles}
              className="text-gray-700 dark:text-gray-300"
            />
          </div>
          <div className="bg-white dark:bg-[#11141A] border border-gray-200 dark:border-[#1F2937] rounded-lg text-sm min-w-[140px] focus-within:border-indigo-500 transition">
            <Select
              options={[{ value: 'All', label: 'All Statuses' }, ...allStatuses.map(s => ({ value: s, label: s }))]}
              value={{ value: statusFilter, label: statusFilter === 'All' ? 'All Statuses' : statusFilter }}
              onChange={(opt: any) => setStatusFilter(opt?.value || 'All')}
              placeholder="Status"
              styles={selectStyles}
              className="text-gray-700 dark:text-gray-300"
            />
          </div>
          <div className="bg-white dark:bg-[#11141A] border border-gray-200 dark:border-[#1F2937] rounded-lg text-sm min-w-[140px] focus-within:border-indigo-500 transition">
            <Select
              options={[{ value: 'All', label: 'All Priorities' }, ...allPriorities.map(p => ({ value: p, label: p }))]}
              value={{ value: priorityFilter, label: priorityFilter === 'All' ? 'All Priorities' : priorityFilter }}
              onChange={(opt: any) => setPriorityFilter(opt?.value || 'All')}
              placeholder="Priority"
              styles={selectStyles}
              className="text-gray-700 dark:text-gray-300"
            />
          </div>
          <div className="bg-white dark:bg-[#11141A] border border-gray-200 dark:border-[#1F2937] rounded-lg text-sm min-w-[140px] focus-within:border-indigo-500 transition">
            <Select
              options={[{ value: 'All', label: 'All Task Types' }, ...allTaskTypes.map(t => ({ value: t, label: t }))]}
              value={{ value: taskTypeFilter, label: taskTypeFilter === 'All' ? 'All Task Types' : taskTypeFilter }}
              onChange={(opt: any) => setTaskTypeFilter(opt?.value || 'All')}
              placeholder="Task Type"
              styles={selectStyles}
              className="text-gray-700 dark:text-gray-300"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">Date Range:</span>
            <input 
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              onClick={(e) => {
                try { e.currentTarget.showPicker(); } catch(err) {} 
              }}
              className="bg-white dark:bg-[#11141A] border border-gray-200 dark:border-[#1F2937] rounded-lg text-sm text-gray-700 dark:text-gray-300 px-3 py-1.5 outline-none focus:border-indigo-500 transition cursor-pointer"
              title="Start Date (From)"
            />
            <span className="text-gray-500 text-sm">to</span>
            <input 
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              onClick={(e) => {
                try { e.currentTarget.showPicker(); } catch(err) {} 
              }}
              className="bg-white dark:bg-[#11141A] border border-gray-200 dark:border-[#1F2937] rounded-lg text-sm text-gray-700 dark:text-gray-300 px-3 py-1.5 outline-none focus:border-indigo-500 transition cursor-pointer"
              title="End Date (To)"
            />
            {(startDateFilter || endDateFilter) && (
              <button 
                onClick={() => { setStartDateFilter(''); setEndDateFilter(''); }}
                className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-white transition underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>

      <div className="bg-white dark:bg-[#11141A] rounded-2xl border border-gray-200 dark:border-[#1F2937] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-[#1F2937] flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white capitalize">{view} View <span className="ml-2 text-xs text-gray-500 bg-gray-50 dark:bg-[#1A1D23] px-2 py-0.5 rounded-full">{filteredTasks.length} tasks</span></h3>
        </div>
        
        {filteredTasks.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No tasks match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          {view === 'list' && (
            <div className="flex flex-col divide-y divide-[#1F2937]/50 min-w-[300px]">
              {filteredTasks.map((t) => (
                <div key={t.id} className="p-4 flex flex-col space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center space-x-2 mb-1 flex-wrap gap-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">
                          {t.area}
                        </span>
                        {t.project && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                            {t.project}
                          </span>
                        )}
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                          t.priority === 'High' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                          t.priority === 'Medium' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20'
                        }`}>
                          {t.priority}
                        </span>
                        {t.feedbackStatus && (
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                            t.feedbackStatus === 'On Track' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                            t.feedbackStatus === 'Needs Input' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                            t.feedbackStatus === 'Stuck' ? 'bg-red-500/10 text-red-500 border-red-500/20' : ''
                          }`}>
                            {t.feedbackStatus}
                          </span>
                        )}
                      </div>
                      {t.id.startsWith('Task') && (
                        <div className="text-[10px] text-indigo-400 font-bold mb-1">
                          {t.id}
                        </div>
                      )}
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white leading-tight">{t.task}</h3>
                      <p className="text-xs font-medium text-gray-500 mt-1">Assignee: {t.assignee}</p>
                      <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                        <CalendarDays size={12} className="inline mr-1"/>
                        <EditableDate taskId={t.id} field="start_date" value={t.start_date} isAdmin={isAdmin} onUpdate={updateDate} />
                        {' to '}
                        <EditableDate taskId={t.id} field="end_date" value={t.end_date} isAdmin={isAdmin} onUpdate={updateDate} />
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <button 
                        onClick={() => setActiveFeedbackTask(t)}
                        className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-indigo-400 rounded-lg hover:bg-gray-50 dark:bg-[#1A1D23] transition flex items-center"
                        title="Feedback"
                      >
                        <MessageSquare size={16} />
                      </button>
                      
                      {isAdmin && (
                        <button 
                          onClick={() => setActiveEditTask(t)}
                          className="p-1.5 text-gray-500 hover:text-indigo-400 rounded-lg hover:bg-gray-50 dark:bg-[#1A1D23] transition"
                          title="Edit Task"
                        >
                          <Edit size={16} />
                        </button>
                      )}
                      
                      {isAdmin && (
                        <button 
                          onClick={() => deleteTask(t.id)}
                          className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-gray-50 dark:bg-[#1A1D23] transition"
                          title="Delete task"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 items-center">
                    <div className="flex flex-col">
                      <button 
                        onClick={() => updateStatus(t.id, t.status, t.area)}
                        disabled={!isAdmin && !(isManager && t.area === userArea)}
                        className={`flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-lg text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                          t.status === 'Completed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                          t.status === 'In Progress' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                          'bg-gray-50 dark:bg-[#1A1D23] text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-[#2D3139]'
                        }`}
                      >
                        {t.status === 'Completed' ? <CheckCircle size={14} /> : <Clock size={14} />}
                        <span>{t.status}</span>
                      </button>
                    </div>
                    
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1">
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            step="10" 
                            value={t.progress * 100}
                            onChange={(e) => updateProgress(t.id, e.target.value, t.area)}
                            disabled={!isAdmin && !(isManager && t.area === userArea)}
                            className="w-full h-1.5 bg-[#2D3139] rounded appearance-none cursor-pointer accent-indigo-500 block disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-8 text-right">{Math.round(t.progress * 100)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === 'table' && (
            <table className="w-full text-left text-sm whitespace-nowrap min-w-[900px]">
              <thead className="bg-gray-50 dark:bg-[#1A1D23] text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-[#1F2937]">
                <tr>
                  <th className="px-4 py-3 font-medium cursor-pointer hover:text-gray-900 dark:text-white transition">Task</th>
                  <th className="px-4 py-3 font-medium cursor-pointer hover:text-gray-900 dark:text-white transition">Project</th>
                  <th className="px-4 py-3 font-medium cursor-pointer hover:text-gray-900 dark:text-white transition">Area</th>
                  <th className="px-4 py-3 font-medium cursor-pointer hover:text-gray-900 dark:text-white transition">Assignee</th>
                  <th className="px-4 py-3 font-medium cursor-pointer hover:text-gray-900 dark:text-white transition">Dates</th>
                  <th className="px-4 py-3 font-medium cursor-pointer hover:text-gray-900 dark:text-white transition">Status</th>
                  <th className="px-4 py-3 font-medium cursor-pointer hover:text-gray-900 dark:text-white transition">Progress</th>
                  <th className="px-4 py-3 font-medium cursor-pointer hover:text-gray-900 dark:text-white transition">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2937]/50">
                {filteredTasks.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:bg-[#1A1D23]/50 transition">
                    <td className="px-4 py-3 truncate max-w-[200px] text-gray-800 dark:text-gray-200">
                      {t.id.startsWith('Task') && <div className="text-[10px] text-indigo-400 font-bold mb-0.5">{t.id}</div>}
                      {t.task}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{t.project || '-'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{t.area}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{t.assignee}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      <EditableDate taskId={t.id} field="start_date" value={t.start_date} isAdmin={isAdmin} onUpdate={updateDate} />
                      {' - '}
                      <EditableDate taskId={t.id} field="end_date" value={t.end_date} isAdmin={isAdmin} onUpdate={updateDate} />
                    </td>
                    <td className="px-4 py-3">
                      <button 
                        onClick={() => updateStatus(t.id, t.status, t.area)}
                        disabled={!isAdmin && !(isManager && t.area === userArea)}
                        className={`px-2 py-1 rounded text-xs inline-flex items-center gap-1 border disabled:cursor-not-allowed ${
                        t.status === 'Completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        t.status === 'In Progress' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                        'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20'
                        }`}
                      >
                        {t.status === 'Completed' ? <CheckCircle size={12} /> : <Clock size={12} />}
                        {t.status}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2 w-24">
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          step="10" 
                          value={t.progress * 100}
                          onChange={(e) => updateProgress(t.id, e.target.value, t.area)}
                          disabled={!isAdmin && !(isManager && t.area === userArea)}
                          className="w-full h-1.5 bg-[#2D3139] rounded appearance-none cursor-pointer accent-indigo-500 block disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <span className="text-xs text-gray-600 dark:text-gray-400 w-8 text-right">{Math.round(t.progress * 100)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-1">
                        <button onClick={() => setActiveFeedbackTask(t)} className="p-1 text-gray-600 dark:text-gray-400 hover:text-indigo-400 rounded transition" title="Feedback">
                          <MessageSquare size={14} />
                        </button>
                        {isAdmin && (
                          <button onClick={() => setActiveEditTask(t)} className="p-1 text-gray-500 hover:text-indigo-400 rounded transition" title="Edit Task">
                            <Edit size={14} />
                          </button>
                        )}
                        {isAdmin && (
                          <button onClick={() => deleteTask(t.id)} className="p-1 text-gray-500 hover:text-red-400 rounded transition" title="Delete task">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {view === 'kanban' && (
            <div className="flex space-x-4 p-4 min-w-[800px] overflow-x-auto bg-gray-100 dark:bg-[#0B0D10]/50">
              {['Pending', 'In Progress', 'Completed'].map(status => {
                const columnTasks = filteredTasks.filter(t => t.status === status);
                return (
                  <div 
                    key={status} 
                    className="flex-1 bg-white dark:bg-[#11141A] rounded-xl border border-gray-200 dark:border-[#1F2937] p-3 flex flex-col min-w-[250px]"
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const droppedTaskId = e.dataTransfer.getData('taskId');
                      const taskArea = e.dataTransfer.getData('taskArea');
                      const currentStatus = e.dataTransfer.getData('currentStatus');
                      if (droppedTaskId && currentStatus !== status) {
                        updateStatus(droppedTaskId, currentStatus, taskArea, status);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-4 px-1">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{status}</h4>
                      <span className="text-xs bg-gray-50 dark:bg-[#1A1D23] px-2 py-0.5 rounded text-gray-500">{columnTasks.length}</span>
                    </div>
                    <div className="space-y-3 flex-1">
                      {columnTasks.map(t => (
                        <div 
                          key={t.id} 
                          draggable={isAdmin || (isManager && t.area === userArea)}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('taskId', t.id);
                            e.dataTransfer.setData('taskArea', t.area);
                            e.dataTransfer.setData('currentStatus', t.status);
                          }}
                          className={`${(isAdmin || (isManager && t.area === userArea)) ? 'cursor-grab active:cursor-grabbing hover:border-indigo-500/50' : ''} bg-gray-50 dark:bg-[#1A1D23] p-3 rounded-lg border border-gray-300 dark:border-[#2D3139] space-y-2 transition relative group`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 pr-4">
                              {t.id.startsWith('Task') && <div className="text-[9px] text-indigo-400 font-bold mb-0.5">{t.id}</div>}
                              <h5 className="text-xs font-medium text-gray-800 dark:text-gray-200 line-clamp-2">{t.task}</h5>
                            </div>
                            <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                              t.priority === 'High' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                              t.priority === 'Medium' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20'
                            }`}>{t.priority}</span>
                          </div>
                          
                          {t.project && (
                             <div className="text-[10px] text-emerald-400/80 font-medium">#{t.project}</div>
                          )}
                          
                          {t.feedbackStatus && (
                            <div className="flex">
                              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                                t.feedbackStatus === 'On Track' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                t.feedbackStatus === 'Needs Input' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                t.feedbackStatus === 'Stuck' ? 'bg-red-500/10 text-red-500 border-red-500/20' : ''
                              }`}>
                                {t.feedbackStatus}
                              </span>
                            </div>
                          )}
                          
                          <div className="text-[10px] text-gray-500">
                             <EditableDate taskId={t.id} field="start_date" value={t.start_date} isAdmin={isAdmin} onUpdate={updateDate} />
                             {' - '}
                             <EditableDate taskId={t.id} field="end_date" value={t.end_date} isAdmin={isAdmin} onUpdate={updateDate} />
                          </div>

                          <div className="flex justify-between items-end text-gray-500">
                            <span className="text-[10px] bg-gray-100 dark:bg-[#0B0D10] px-1.5 py-0.5 rounded">{t.assignee}</span>
                            <span className="text-[10px] font-medium">{Math.round(t.progress * 100)}%</span>
                          </div>
                          {(isAdmin || (isManager && t.area === userArea)) && (
                            <button 
                              onClick={() => updateStatus(t.id, status, t.area)}
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition p-1 bg-[#2D3139] hover:bg-indigo-600 rounded text-white"
                              title="Update Status"
                            >
                              <CheckCircle size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {view === 'calendar' && (
            <div className="p-4 overflow-x-auto min-w-[300px]">
              <CalendarViewCustom tasks={filteredTasks} />
            </div>
          )}

          {view === 'gantt' && (
            <div className="p-4 overflow-x-auto min-w-[600px]">
               <GanttViewCustom tasks={filteredTasks} />
            </div>
          )}

          </div>
        )}
      </div>

      {activeEditTask && (
        <EditTaskModal 
          taskId={activeEditTask.id} 
          onClose={() => setActiveEditTask(null)} 
        />
      )}
      
      {activeFeedbackTask && (
        <FeedbackModal 
          taskId={activeFeedbackTask.id} 
          taskName={activeFeedbackTask.task} 
          onClose={() => setActiveFeedbackTask(null)} 
        />
      )}
    </div>
  );
}

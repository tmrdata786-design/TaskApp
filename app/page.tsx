'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';
import { CheckCircle, Clock, Trash2, LayoutList, Table2, KanbanSquare, CalendarDays, BarChartHorizontal } from 'lucide-react';
import { useAdmin } from '../lib/useAdmin';

interface Task {
  id: string;
  area: string;
  task_type: string;
  task: string;
  priority: string;
  assignee: string;
  status: string;
  progress: number;
  start_date?: string;
  end_date?: string;
}

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [view, setView] = useState<'list' | 'table' | 'kanban' | 'calendar' | 'gantt'>('list');

  useEffect(() => {
    // 1. Fetch contacts so we know the user's name
    let userContactName: string | null = null;
    
    const setupTasksListener = async () => {
      try {
        const contactSnap = await getDocs(collection(db, 'contacts'));
        const userEmail = auth.currentUser?.email;
        if (userEmail) {
          const contact = contactSnap.docs.find(d => d.data().email === userEmail);
          if (contact) userContactName = contact.data().name;
        }
      } catch (e) {
        console.warn("Failed to load contacts for user matching", e);
      }

      const q = collection(db, 'tasks');
      const unsubscribe = onSnapshot(q, (snapshot) => {
        let taskList: Task[] = [];
        snapshot.forEach((doc) => {
          taskList.push({ id: doc.id, ...doc.data() } as Task);
        });
        
        // Filter tasks if not admin
        if (!isAdmin && userContactName) {
          taskList = taskList.filter(t => t.assignee === userContactName);
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
  }, [isAdmin, adminLoading]);

  const updateStatus = async (id: string, currentStatus: string) => {
    if (!isAdmin) return;
    const nextStatus = currentStatus === 'Pending' ? 'In Progress' : 
                       currentStatus === 'In Progress' ? 'Completed' : 'Pending';
    try {
      await updateDoc(doc(db, 'tasks', id), { 
        status: nextStatus,
        updated_at: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${id}`);
    }
  };

  const updateProgress = async (id: string, val: string) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'tasks', id), { 
        progress: parseInt(val, 10) / 100,
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

  if (loading || adminLoading) {
    return <div className="p-8 text-center text-gray-500">Loading tasks...</div>;
  }

  const activeTasks = tasks.filter(t => t.status !== 'Completed').length;
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const highPriority = tasks.filter(t => t.priority === 'High' && t.status !== 'Completed').length;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col mb-4 space-y-4 sm:flex-row sm:justify-between sm:items-end sm:space-y-0">
        <h1 className="text-xl font-semibold text-white">Dashboard Overview</h1>
        <div className="flex bg-[#11141A] p-1 rounded-xl border border-[#1F2937] self-start sm:self-auto overflow-x-auto">
          <button onClick={() => setView('list')} className={`p-1.5 rounded-lg transition ${view === 'list' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`} title="List View"><LayoutList size={18} /></button>
          <button onClick={() => setView('table')} className={`p-1.5 rounded-lg transition ${view === 'table' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`} title="Table View"><Table2 size={18} /></button>
          <button onClick={() => setView('kanban')} className={`p-1.5 rounded-lg transition ${view === 'kanban' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`} title="Kanban View"><KanbanSquare size={18} /></button>
          <button onClick={() => setView('calendar')} className={`p-1.5 rounded-lg transition ${view === 'calendar' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`} title="Calendar View"><CalendarDays size={18} /></button>
          <button onClick={() => setView('gantt')} className={`p-1.5 rounded-lg transition ${view === 'gantt' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`} title="Gantt View"><BarChartHorizontal size={18} /></button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#11141A] p-4 rounded-2xl border border-[#1F2937]">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Active Tasks</p>
          <p className="text-2xl font-bold mt-1 text-white">{activeTasks}</p>
        </div>
        <div className="bg-[#11141A] p-4 rounded-2xl border border-[#1F2937]">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Completed</p>
          <p className="text-2xl font-bold mt-1 text-white">{completedTasks}</p>
        </div>
        <div className="bg-[#11141A] p-4 rounded-2xl border border-[#1F2937]">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">High Priority</p>
          <p className="text-2xl font-bold mt-1 text-white">{highPriority}</p>
        </div>
      </div>

      <div className="bg-[#11141A] rounded-2xl border border-[#1F2937] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-[#1F2937] flex items-center justify-between">
          <h3 className="font-semibold text-white capitalize">{view} View</h3>
        </div>
        
        {tasks.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No tasks assigned yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          {view === 'list' && (
            <div className="flex flex-col divide-y divide-[#1F2937]/50 min-w-[300px]">
              {tasks.map((t) => (
                <div key={t.id} className="p-4 flex flex-col space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">
                          {t.area}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                          t.priority === 'High' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                          t.priority === 'Medium' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                        }`}>
                          {t.priority}
                        </span>
                      </div>
                      <h3 className="text-sm font-medium text-white leading-tight mt-1">{t.task}</h3>
                      <p className="text-xs font-medium text-gray-500 mt-1">Assignee: {t.assignee}</p>
                    </div>
                    
                    {isAdmin && (
                      <button 
                        onClick={() => deleteTask(t.id)}
                        className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-[#1A1D23] transition"
                        title="Delete task"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 items-center">
                    <div className="flex flex-col">
                      <button 
                        onClick={() => updateStatus(t.id, t.status)}
                        disabled={!isAdmin}
                        className={`flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-lg text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                          t.status === 'Completed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                          t.status === 'In Progress' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                          'bg-[#1A1D23] text-gray-400 border border-[#2D3139]'
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
                            onChange={(e) => updateProgress(t.id, e.target.value)}
                            disabled={!isAdmin}
                            className="w-full h-1.5 bg-[#2D3139] rounded appearance-none cursor-pointer accent-indigo-500 block disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-400 w-8 text-right">{Math.round(t.progress * 100)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === 'table' && (
            <table className="w-full text-left text-sm whitespace-nowrap min-w-[700px]">
              <thead className="bg-[#1A1D23] text-gray-400 border-b border-[#1F2937]">
                <tr>
                  <th className="px-4 py-3 font-medium">Task</th>
                  <th className="px-4 py-3 font-medium">Area</th>
                  <th className="px-4 py-3 font-medium">Assignee</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2937]/50">
                {tasks.map(t => (
                  <tr key={t.id} className="hover:bg-[#1A1D23]/50 transition">
                    <td className="px-4 py-3 truncate max-w-[200px] text-gray-200">{t.task}</td>
                    <td className="px-4 py-3 text-gray-400">{t.area}</td>
                    <td className="px-4 py-3 text-gray-400">{t.assignee}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs inline-flex items-center gap-1 border ${
                        t.status === 'Completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        t.status === 'In Progress' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                        'bg-gray-500/10 text-gray-400 border-gray-500/20'
                      }`}>
                        {t.status === 'Completed' ? <CheckCircle size={12} /> : <Clock size={12} />}
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{Math.round(t.progress * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {view === 'kanban' && (
            <div className="flex space-x-4 p-4 min-w-[800px] overflow-x-auto bg-[#0B0D10]/50">
              {['Pending', 'In Progress', 'Completed'].map(status => {
                const columnTasks = tasks.filter(t => t.status === status);
                return (
                  <div key={status} className="flex-1 bg-[#11141A] rounded-xl border border-[#1F2937] p-3 flex flex-col min-w-[250px]">
                    <div className="flex items-center justify-between mb-4 px-1">
                      <h4 className="text-sm font-semibold text-gray-300">{status}</h4>
                      <span className="text-xs bg-[#1A1D23] px-2 py-0.5 rounded text-gray-500">{columnTasks.length}</span>
                    </div>
                    <div className="space-y-3 flex-1">
                      {columnTasks.map(t => (
                        <div key={t.id} className="bg-[#1A1D23] p-3 rounded-lg border border-[#2D3139] space-y-2 cursor-pointer hover:border-indigo-500/50 transition">
                          <div className="flex items-start justify-between gap-2">
                            <h5 className="text-xs font-medium text-gray-200 line-clamp-2">{t.task}</h5>
                            <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                              t.priority === 'High' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                              t.priority === 'Medium' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                            }`}>{t.priority}</span>
                          </div>
                          <div className="flex justify-between items-end text-gray-500">
                            <span className="text-[10px] bg-[#0B0D10] px-1.5 py-0.5 rounded">{t.assignee}</span>
                            <span className="text-[10px] font-medium">{Math.round(t.progress * 100)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {view === 'calendar' && (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 min-w-[300px]">
              {tasks.filter(t => t.start_date || t.end_date).map(t => (
                <div key={t.id} className="bg-[#1A1D23] p-3 rounded-xl border border-[#2D3139]">
                  <div className="flex items-center gap-2 mb-2 text-indigo-400">
                    <CalendarDays size={14} />
                    <span className="text-xs font-medium">{t.start_date || 'N/A'} - {t.end_date || 'N/A'}</span>
                  </div>
                  <h5 className="text-sm font-medium text-gray-200 truncate">{t.task}</h5>
                  <p className="text-xs text-gray-500 mt-1">{t.status}</p>
                </div>
              ))}
              {tasks.filter(t => !t.start_date && !t.end_date).length > 0 && (
                <div className="col-span-full p-3 pt-4 border-t border-[#1F2937] mt-2">
                   <p className="text-xs text-gray-500">Plus {tasks.filter(t => !t.start_date && !t.end_date).length} tasks with no dates scheduled.</p>
                </div>
              )}
            </div>
          )}

          {view === 'gantt' && (
            <div className="p-4 overflow-x-auto min-w-[600px]">
              <div className="flex flex-col space-y-2 border-l border-b border-[#1F2937] pb-4 pl-4 relative">
                {tasks.map(t => {
                  if (!t.start_date || !t.end_date) return null;
                  
                  const start = new Date(t.start_date).getTime();
                  const end = new Date(t.end_date).getTime();
                  if (isNaN(start) || isNaN(end) || end < start) return null;
                  
                  const durationDays = Math.max(1, (end - start) / (1000 * 60 * 60 * 24));
                  const width = Math.min(durationDays * 20, 300); // 20px per day, max 300px
                  
                  return (
                    <div key={t.id} className="flex items-center gap-3">
                      <div className="w-32 text-xs text-gray-400 truncate text-right">{t.task}</div>
                      <div className="h-6 bg-indigo-600/20 border border-indigo-500/50 rounded flex items-center px-2 relative" style={{ width: `${width}px` }}>
                        <div className="absolute top-0 left-0 bottom-0 bg-indigo-600/40" style={{ width: `${t.progress * 100}%` }} />
                        <span className="text-[9px] text-white whitespace-nowrap z-10 shrink-0 select-none">
                          {t.start_date}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
               <p className="text-xs text-gray-600 mt-4 text-center">Gantt view shows tasks with both valid Start and End dates.</p>
            </div>
          )}

          </div>
        )}
      </div>
    </div>
  );
}

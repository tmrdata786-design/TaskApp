import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp, getDocs, collection, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';
import { Loader2, Plus, Trash2, CheckCircle, Circle } from 'lucide-react';
import { useAdmin } from '../lib/useAdmin';

export default function EditTaskModal({ taskId, onClose }: { taskId: string, onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [originalForm, setOriginalForm] = useState<any>(null);
  const { userContactName } = useAdmin();
  
  const [areas, setAreas] = useState<{ id: string; name: string; task_types: string[] }[]>([]);
  const [contacts, setContacts] = useState<{ id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'subtasks' | 'activity'>('details');

  useEffect(() => {
    async function load() {
      try {
        const areaSnap = await getDocs(collection(db, 'areas'));
        setAreas(areaSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)));

        const contactSnap = await getDocs(collection(db, 'contacts'));
        setContacts(contactSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
        
        const projectSnap = await getDocs(collection(db, 'projects'));
        setProjects(projectSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)));

        const taskSnap = await getDoc(doc(db, 'tasks', taskId));
        if (taskSnap.exists()) {
          const data = taskSnap.data();
          if (!data.subtasks) data.subtasks = [];
          if (!data.activityLog) data.activityLog = [];
          setForm(data);
          setOriginalForm(data);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `tasks/${taskId}`);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [taskId]);

  const handleUpdate = (field: string, val: string | number) => {
    setForm((prev: any) => {
      let next = { ...prev, [field]: val };
      if (field === 'area') {
        const area = areas.find(a => a.name === val);
        next.task_type = area?.task_types[0] || '';
      }
      return next;
    });
  };

  const addSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setForm((prev: any) => ({
      ...prev,
      subtasks: [...(prev.subtasks || []), { id: Date.now().toString(), title: newSubtaskTitle, isCompleted: false }]
    }));
    setNewSubtaskTitle('');
  };

  const toggleSubtask = (startId: string) => {
    setForm((prev: any) => {
      const nextSubtasks = prev.subtasks.map((st: any) => 
        st.id === startId ? { ...st, isCompleted: !st.isCompleted } : st
      );
      
      const completed = nextSubtasks.filter((st: any) => st.isCompleted).length;
      const total = nextSubtasks.length;
      const newProgress = total > 0 ? completed / total : (prev.progress || 0);

      return {
        ...prev,
        subtasks: nextSubtasks,
        progress: newProgress
      };
    });
  };

  const deleteSubtask = (stId: string) => {
    setForm((prev: any) => {
      const nextSubtasks = prev.subtasks.filter((st: any) => st.id !== stId);
      const completed = nextSubtasks.filter((st: any) => st.isCompleted).length;
      const total = nextSubtasks.length;
      const newProgress = total > 0 ? completed / total : 0;
      return { ...prev, subtasks: nextSubtasks, progress: newProgress };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const userIdent = userContactName || auth.currentUser?.email || 'Unknown';
      let updates: any = {
        area: form.area,
        task_type: form.task_type,
        project: form.project || '',
        task: form.task,
        priority: form.priority,
        assignee: form.assignee,
        start_date: form.start_date || '',
        end_date: form.end_date || '',
        progress: form.progress !== undefined ? form.progress : 0,
        subtasks: form.subtasks || [],
        updated_at: serverTimestamp()
      };

      const logEntries = [];
      if (originalForm.assignee !== form.assignee) {
        logEntries.push({ action: `Assignee changed to ${form.assignee}`, timestamp: Date.now(), user: userIdent });
      }
      if (originalForm.priority !== form.priority) {
        logEntries.push({ action: `Priority changed to ${form.priority}`, timestamp: Date.now(), user: userIdent });
      }
      if (originalForm.progress !== form.progress) {
        logEntries.push({ action: `Progress updated to ${Math.round((form.progress || 0) * 100)}%`, timestamp: Date.now(), user: userIdent });
      }
      if (originalForm.task !== form.task) {
        logEntries.push({ action: "Task description updated", timestamp: Date.now(), user: userIdent });
      }

      if (logEntries.length > 0) {
        updates.activityLog = arrayUnion(...logEntries);
      }

      await updateDoc(doc(db, 'tasks', taskId), updates);
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${taskId}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#11141A] p-6 rounded-2xl border border-gray-200 dark:border-[#1F2937]">
         <Loader2 className="animate-spin text-indigo-500" />
      </div>
    </div>
  );

  if (!form) return null;

  const currentArea = areas.find(a => a.name === form.area);
  const taskTypes = currentArea?.task_types || [];
  
  const activityLog = [...(form.activityLog || [])].sort((a: any, b: any) => b.timestamp - a.timestamp);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#11141A] p-6 rounded-2xl border border-gray-200 dark:border-[#1F2937] w-full max-w-xl max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Task</h2>
        </div>
        
        <div className="flex border-b border-gray-200 dark:border-[#1F2937] mb-4">
          <button 
            type="button"
            className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'details' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
          <button 
            type="button"
            className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'subtasks' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            onClick={() => setActiveTab('subtasks')}
          >
            Subtasks ({form.subtasks?.length || 0})
          </button>
          <button 
            type="button"
            className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'activity' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            onClick={() => setActiveTab('activity')}
          >
            Activity
          </button>
        </div>

        {activeTab === 'details' && (
          <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500">Task Description</label>
            <input 
              type="text" required
              value={form.task} onChange={e => handleUpdate('task', e.target.value)}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-[#0B0D10] border border-gray-200 dark:border-[#1F2937] rounded-lg text-gray-900 dark:text-white"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500">Area</label>
              <select value={form.area} onChange={e => handleUpdate('area', e.target.value)} className="w-full px-3 py-2 bg-gray-100 dark:bg-[#0B0D10] border border-gray-200 dark:border-[#1F2937] rounded-lg text-gray-900 dark:text-white">
                {areas.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500">Task Type</label>
              <select value={form.task_type} onChange={e => handleUpdate('task_type', e.target.value)} className="w-full px-3 py-2 bg-gray-100 dark:bg-[#0B0D10] border border-gray-200 dark:border-[#1F2937] rounded-lg text-gray-900 dark:text-white">
                {taskTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500">Project</label>
              <select value={form.project || ''} onChange={e => handleUpdate('project', e.target.value)} className="w-full px-3 py-2 bg-gray-100 dark:bg-[#0B0D10] border border-gray-200 dark:border-[#1F2937] rounded-lg text-gray-900 dark:text-white">
                <option value="">No Project</option>
                {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500">Assignee</label>
              <select value={form.assignee} onChange={e => handleUpdate('assignee', e.target.value)} className="w-full px-3 py-2 bg-gray-100 dark:bg-[#0B0D10] border border-gray-200 dark:border-[#1F2937] rounded-lg text-gray-900 dark:text-white">
                {contacts.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500">Priority</label>
              <select value={form.priority} onChange={e => handleUpdate('priority', e.target.value)} className="w-full px-3 py-2 bg-gray-100 dark:bg-[#0B0D10] border border-gray-200 dark:border-[#1F2937] rounded-lg text-gray-900 dark:text-white">
                {['High', 'Medium', 'Low'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500">Start Date</label>
              <input type="date" value={form.start_date || ''} onChange={e => handleUpdate('start_date', e.target.value)} className="w-full px-3 py-2 bg-gray-100 dark:bg-[#0B0D10] border border-gray-200 dark:border-[#1F2937] rounded-lg text-gray-900 dark:text-white" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500">End Date</label>
              <input type="date" value={form.end_date || ''} onChange={e => handleUpdate('end_date', e.target.value)} className="w-full px-3 py-2 bg-gray-100 dark:bg-[#0B0D10] border border-gray-200 dark:border-[#1F2937] rounded-lg text-gray-900 dark:text-white" />
            </div>
          </div>

            <div className="space-y-1.5 mt-3 border-t pt-3 dark:border-[#1F2937]">
               <div className="flex items-center justify-between text-xs font-medium text-gray-500">
                 <label>Progress</label>
                 <span>{Math.round((form.progress || 0) * 100)}%</span>
               </div>
               <input 
                 type="range" min="0" max="100" step="1" 
                 value={Math.round((form.progress || 0) * 100)} 
                 onChange={(e) => handleUpdate('progress', parseInt(e.target.value)/100)}
                 className="w-full accent-indigo-500 cursor-pointer"
               />
            </div>

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-white transition">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-50">
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
        )}

        {activeTab === 'subtasks' && (
          <div className="space-y-4">
             <div className="flex gap-2">
               <input 
                 type="text" 
                 placeholder="Add a new subtask..."
                 value={newSubtaskTitle}
                 onChange={e => setNewSubtaskTitle(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && addSubtask()}
                 className="flex-1 px-3 py-2 bg-gray-100 dark:bg-[#0B0D10] border border-gray-200 dark:border-[#1F2937] rounded-lg text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
               />
               <button type="button" onClick={addSubtask} className="px-3 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-[#1A1D23] dark:hover:bg-[#2D3139] text-gray-900 dark:text-white rounded-lg transition">
                 <Plus size={18} />
               </button>
             </div>
             
             <div className="space-y-2 mt-4 max-h-60 overflow-y-auto pr-2">
               {form.subtasks?.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No subtasks added yet.</p>}
               {form.subtasks?.map((st: any) => (
                 <div key={st.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-[#1A1D23] rounded-lg group border border-gray-200 dark:border-[#2D3139]">
                   <div className="flex items-center gap-3 flex-1 overflow-hidden cursor-pointer" onClick={() => toggleSubtask(st.id)}>
                     <button type="button" className={`shrink-0 ${st.isCompleted ? 'text-green-500' : 'text-gray-400 hover:text-indigo-500'}`}>
                       {st.isCompleted ? <CheckCircle size={18} /> : <Circle size={18} />}
                     </button>
                     <span className={`text-sm truncate ${st.isCompleted ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                       {st.title}
                     </span>
                   </div>
                   <button type="button" onClick={() => deleteSubtask(st.id)} className="text-gray-400 hover:text-red-500 transition p-1 ml-2 disabled:opacity-50">
                     <Trash2 size={16} />
                   </button>
                 </div>
               ))}
             </div>
             
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-[#1F2937]">
              <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-white transition">Cancel</button>
              <button type="button" onClick={handleSubmit} disabled={submitting} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-50">
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-4">
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {activityLog.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No activity recorded yet.</p>
              ) : (
                activityLog.map((log: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 text-sm pb-3 border-b border-gray-100 dark:border-[#1F2937] px-1">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-indigo-500 shrink-0" />
                    <div>
                      <p className="text-gray-900 dark:text-white leading-snug">{log.action}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        <span className="font-medium">{log.user}</span> • {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="flex justify-end mt-4 pt-4 border-t border-gray-200 dark:border-[#1F2937]">
               <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-white transition">Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

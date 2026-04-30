import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp, getDocs, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';
import { Loader2 } from 'lucide-react';

export default function EditTaskModal({ taskId, onClose }: { taskId: string, onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<any>(null);
  
  const [areas, setAreas] = useState<{ id: string; name: string; task_types: string[] }[]>([]);
  const [contacts, setContacts] = useState<{ id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

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
          setForm(taskSnap.data());
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateDoc(doc(db, 'tasks', taskId), {
        area: form.area,
        task_type: form.task_type,
        project: form.project || '',
        task: form.task,
        priority: form.priority,
        assignee: form.assignee,
        start_date: form.start_date || '',
        end_date: form.end_date || '',
        updated_at: serverTimestamp()
      });
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

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#11141A] p-6 rounded-2xl border border-gray-200 dark:border-[#1F2937] w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Edit Task</h2>
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

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-white transition">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-50">
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

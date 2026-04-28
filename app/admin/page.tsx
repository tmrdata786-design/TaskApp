'use client';

import { useState, useEffect } from 'react';
import { collection, doc, setDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/firestoreError';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AdminEntry() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [areas, setAreas] = useState<{ id: string; name: string; task_types: string[] }[]>([]);
  const [contacts, setContacts] = useState<{ id: string; name: string }[]>([]);

  const [form, setForm] = useState({
    area: '',
    task_type: '',
    task: '',
    priority: 'High',
    assignee: '',
    status: 'Pending',
    progress: 0,
    frequency: 'Once',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    notes: '',
    flag: '',
    feedback: ''
  });

  useEffect(() => {
    async function initData() {
      try {
        const areaSnap = await getDocs(collection(db, 'areas'));
        let areaList = areaSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        
        // Seed initial data if empty
        if (areaList.length === 0) {
          const initialAreas = [
            { id: 'sale', name: 'Sale', task_types: ['Sales', 'Marketing'] },
            { id: 'hr', name: 'HR', task_types: ['HR', 'Admin'] },
            { id: 'accounts', name: 'Accounts', task_types: ['Accounts', 'Finance'] },
            { id: 'operations', name: 'Operations', task_types: ['Productions', 'Quality'] }
          ];
          const batch = writeBatch(db);
          for (const a of initialAreas) {
            batch.set(doc(db, 'areas', a.id), { name: a.name, task_types: a.task_types });
          }
          await batch.commit();
          areaList = initialAreas;
        }
        setAreas(areaList);

        const contactSnap = await getDocs(collection(db, 'contacts'));
        setContacts(contactSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)));

        // Set defaults
        if (areaList.length > 0) {
          setForm(prev => ({
            ...prev,
            area: areaList[0].name,
            task_type: areaList[0].task_types[0] || ''
          }));
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.LIST, 'config');
      } finally {
        setLoading(false);
      }
    }
    initData();
  }, []);

  const handleUpdate = (field: string, val: string | number) => {
    setForm(prev => {
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
    if (!form.task.trim()) {
      setErrorMsg('Task description is required');
      return;
    }
    if (!form.assignee.trim()) {
      setErrorMsg('Assignee is required');
      return;
    }
    
    setSubmitting(true);
    setErrorMsg('');
    try {
      const tasksRef = collection(db, 'tasks');
      const newDoc = doc(tasksRef);
      const now = new Date().toISOString();
      await setDoc(newDoc, {
        ...form,
        created_at: now,
        updated_at: now
      });
      router.push('/');
    } catch (error) {
      setErrorMsg('Failed to save task.');
      handleFirestoreError(error, OperationType.CREATE, 'tasks');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading configurations...</div>;

  const currentArea = areas.find(a => a.name === form.area);
  const taskTypes = currentArea?.task_types || [];

  return (
    <div className="pb-20">
      <h1 className="text-xl font-semibold text-white mb-6">Delegate Task</h1>
      
      {errorMsg && (
        <div className="bg-red-500/10 text-red-400 border border-red-500/20 p-4 rounded-lg mb-6 font-medium text-sm">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-[#11141A] p-6 rounded-2xl border border-[#1F2937] space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-gray-500">Area</label>
            <select 
              value={form.area} 
              onChange={e => handleUpdate('area', e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0B0D10] border border-[#1F2937] rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition text-white"
            >
              {areas.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-gray-500">Task Type</label>
            <select 
              value={form.task_type} 
              onChange={e => handleUpdate('task_type', e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0B0D10] border border-[#1F2937] rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition text-white"
            >
              {taskTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-gray-500">Task Description</label>
          <textarea 
            value={form.task}
            onChange={e => handleUpdate('task', e.target.value)}
            className="w-full px-4 py-2.5 bg-[#0B0D10] border border-[#1F2937] rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition min-h-[100px] text-white placeholder-gray-600"
            placeholder="Describe the task clearly..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-gray-500">Assignee</label>
            <select 
              value={form.assignee}
              onChange={e => handleUpdate('assignee', e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0B0D10] border border-[#1F2937] rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition text-white"
            >
              <option value="">Select Assignee</option>
              {contacts.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-gray-500">Priority</label>
            <select 
              value={form.priority}
              onChange={e => handleUpdate('priority', e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0B0D10] border border-[#1F2937] rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition text-white"
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-gray-500">Start Date</label>
            <input 
              type="date"
              value={form.start_date}
              onChange={e => handleUpdate('start_date', e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0B0D10] border border-[#1F2937] rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition block text-white"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-gray-500">End Date</label>
            <input 
              type="date"
              value={form.end_date}
              onChange={e => handleUpdate('end_date', e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0B0D10] border border-[#1F2937] rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition block text-white"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-gray-500">Frequency</label>
          <select 
            value={form.frequency}
            onChange={e => handleUpdate('frequency', e.target.value)}
            className="w-full px-4 py-2.5 bg-[#0B0D10] border border-[#1F2937] rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition block text-white"
          >
            {['Once', 'Daily', 'Weekly', 'Monthly'].map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <button 
          type="submit" 
          disabled={submitting}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-lg py-3 rounded-xl transition mt-6 flex justify-center items-center"
        >
          {submitting ? <Loader2 className="animate-spin w-6 h-6" /> : 'Delegate Task'}
        </button>
      </form>
    </div>
  );
}

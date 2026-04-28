'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';
import { CheckCircle, Clock, Trash2 } from 'lucide-react';

interface Task {
  id: string;
  area: string;
  task_type: string;
  task: string;
  priority: string;
  assignee: string;
  status: string;
  progress: number;
}

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = collection(db, 'tasks');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskList: Task[] = [];
      snapshot.forEach((doc) => {
        taskList.push({ id: doc.id, ...doc.data() } as Task);
      });
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

    return () => unsubscribe();
  }, []);

  const updateStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Pending' ? 'In Progress' : 
                       currentStatus === 'In Progress' ? 'Completed' : 'Pending';
    try {
      await updateDoc(doc(db, 'tasks', id), { 
        status: nextStatus,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${id}`);
    }
  };

  const updateProgress = async (id: string, val: string) => {
    try {
      await updateDoc(doc(db, 'tasks', id), { 
        progress: parseInt(val, 10) / 100,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${id}`);
    }
  };
  
  const deleteTask = async (id: string) => {
    if (!confirm('Delete this task?')) return;
    try {
      await deleteDoc(doc(db, 'tasks', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tasks/${id}`);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading tasks...</div>;
  }

  const activeTasks = tasks.filter(t => t.status !== 'Completed').length;
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const highPriority = tasks.filter(t => t.priority === 'High' && t.status !== 'Completed').length;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-end mb-2">
        <h1 className="text-xl font-semibold text-white">Dashboard Overview</h1>
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

      <div className="bg-[#11141A] rounded-2xl border border-[#1F2937] flex flex-col">
        <div className="p-4 border-b border-[#1F2937] flex items-center justify-between">
          <h3 className="font-semibold text-white">All Tasks</h3>
        </div>
        
        {tasks.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No tasks assigned yet.</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-[#1F2937]/50">
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
                  
                  <button 
                    onClick={() => deleteTask(t.id)}
                    className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-[#1A1D23] transition"
                    title="Delete task"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 items-center">
                  <div className="flex flex-col">
                    <button 
                      onClick={() => updateStatus(t.id, t.status)}
                      className={`flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-lg text-xs font-medium transition ${
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
                          className="w-full h-1.5 bg-[#2D3139] rounded appearance-none cursor-pointer accent-indigo-500 block"
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
      </div>
    </div>
  );
}

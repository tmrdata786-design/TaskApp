'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/firestoreError';
import { Loader2, Plus, Trash2, Save, User, MapPin, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'areas' | 'contacts' | 'admin'>('areas');
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  // States for data
  const [areas, setAreas] = useState<{ id: string; name: string; task_types: string[] }[]>([]);
  const [contacts, setContacts] = useState<{ id: string; name: string; email: string }[]>([]);
  const [admin, setAdmin] = useState({ developer_name: 'Umar Latif', company_name: 'TM Rubber', admin_email: '' });

  // Form states
  const [newArea, setNewArea] = useState('');
  const [newTaskType, setNewTaskType] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  useEffect(() => {
    const checkAuth = () => {
      const user = auth.currentUser;
      if (user?.email === 'tmrdata786@gmail.com') {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
      }
    };
    checkAuth();

    // Listen to Areas
    const areasUnsub = onSnapshot(collection(db, 'areas'), (snap) => {
      setAreas(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    });

    // Listen to Contacts
    const contactsUnsub = onSnapshot(collection(db, 'contacts'), (snap) => {
      setContacts(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    });

    // Get Admin Settings
    getDoc(doc(db, 'settings', 'admin')).then((snap) => {
      if (snap.exists()) {
        setAdmin(snap.data() as any);
      }
    }).finally(() => setLoading(false));

    return () => {
      areasUnsub();
      contactsUnsub();
    };
  }, []);

  const saveAdmin = async () => {
    try {
      await setDoc(doc(db, 'settings', 'admin'), admin);
      alert('Admin settings saved!');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'settings/admin');
    }
  };

  const addArea = async () => {
    if (!newArea.trim()) return;
    try {
      const id = newArea.toLowerCase().replace(/\s+/g, '-');
      await setDoc(doc(db, 'areas', id), { name: newArea, task_types: [] });
      setNewArea('');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'areas');
    }
  };

  const addTaskType = async (areaId: string) => {
    if (!newTaskType.trim()) return;
    const area = areas.find(a => a.id === areaId);
    if (!area) return;
    try {
      await setDoc(doc(db, 'areas', areaId), { 
        ...area, 
        task_types: [...area.task_types, newTaskType] 
      });
      setNewTaskType('');
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `areas/${areaId}`);
    }
  };

  const removeTaskType = async (areaId: string, index: number) => {
    const area = areas.find(a => a.id === areaId);
    if (!area) return;
    try {
      const nextTypes = [...area.task_types];
      nextTypes.splice(index, 1);
      await setDoc(doc(db, 'areas', areaId), { 
        ...area, 
        task_types: nextTypes 
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `areas/${areaId}`);
    }
  };

  const addContact = async () => {
    if (!contactName.trim()) return;
    try {
      const id = contactName.toLowerCase().replace(/\s+/g, '-');
      await setDoc(doc(db, 'contacts', id), { name: contactName, email: contactEmail });
      setContactName('');
      setContactEmail('');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'contacts');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading settings...</div>;

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <AlertTriangle size={48} className="text-amber-500" />
        <h2 className="text-xl font-bold text-white">Access Denied</h2>
        <p className="text-gray-400 text-center">Only authorized administrators can access this page.</p>
        <button 
          onClick={() => window.location.href = '/'}
          className="bg-indigo-600 text-white px-6 py-2 rounded-xl"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="pb-20 space-y-6">
      <h1 className="text-xl font-semibold text-white mb-6">Settings & Configuration</h1>

      {/* Tabs */}
      <div className="flex bg-[#11141A] p-1 rounded-xl border border-[#1F2937]">
        <button 
          onClick={() => setActiveTab('areas')}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition ${activeTab === 'areas' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Areas (Tab 1)
        </button>
        <button 
          onClick={() => setActiveTab('contacts')}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition ${activeTab === 'contacts' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Contacts
        </button>
        <button 
          onClick={() => setActiveTab('admin')}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition ${activeTab === 'admin' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Admin
        </button>
      </div>

      {/* Tab: Areas */}
      {activeTab === 'areas' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-[#11141A] p-5 rounded-2xl border border-[#1F2937] space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <MapPin size={16} className="text-indigo-400" /> Add Functional Area
            </h3>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newArea}
                onChange={e => setNewArea(e.target.value)}
                placeholder="e.g. Sales, HR, Logistics"
                className="flex-1 px-4 py-2 bg-[#0B0D10] border border-[#1F2937] rounded-xl text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
              />
              <button 
                onClick={addArea}
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl transition"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {areas.map(area => (
              <div key={area.id} className="bg-[#11141A] rounded-2xl border border-[#1F2937] overflow-hidden">
                <div className="p-4 border-b border-[#1F2937] flex justify-between items-center bg-[#1A1D23]/50">
                  <h4 className="font-bold text-indigo-400">{area.name}</h4>
                  <button 
                    onClick={() => deleteDoc(doc(db, 'areas', area.id))}
                    className="text-gray-600 hover:text-red-500 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {area.task_types.map((type, idx) => (
                      <span key={idx} className="flex items-center gap-1.5 bg-[#0B0D10] border border-[#1F2937] text-gray-300 px-2.5 py-1 rounded-lg text-xs">
                        {type}
                        <button onClick={() => removeTaskType(area.id, idx)} className="text-gray-600 hover:text-red-500 font-bold ml-1">×</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-[#1F2937]/50 mt-2">
                    <input 
                      type="text" 
                      placeholder="Add task type..."
                      className="flex-1 bg-transparent text-xs text-gray-400 outline-none"
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          setNewTaskType(e.currentTarget.value);
                          addTaskType(area.id);
                          e.currentTarget.value = '';
                        }
                      }}
                      onBlur={e => {
                        if (e.target.value) {
                          setNewTaskType(e.target.value);
                          addTaskType(area.id);
                          e.target.value = '';
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Contacts */}
      {activeTab === 'contacts' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-[#11141A] p-5 rounded-2xl border border-[#1F2937] space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <User size={16} className="text-indigo-400" /> New Contact
            </h3>
            <div className="space-y-3">
              <input 
                type="text" 
                value={contactName}
                onChange={e => setContactName(e.target.value)}
                placeholder="Full Name"
                className="w-full px-4 py-2 bg-[#0B0D10] border border-[#1F2937] rounded-xl text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
              />
              <div className="flex gap-2">
                <input 
                  type="email" 
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  placeholder="Email (optional)"
                  className="flex-1 px-4 py-2 bg-[#0B0D10] border border-[#1F2937] rounded-xl text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                />
                <button 
                  onClick={addContact}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-[#11141A] rounded-2xl border border-[#1F2937] divide-y divide-[#1F2937]">
            {contacts.map(c => (
              <div key={c.id} className="p-4 flex justify-between items-center bg-[#1A1D23]/30">
                <div>
                  <p className="text-sm font-medium text-white">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.email || 'No email set'}</p>
                </div>
                <button 
                  onClick={() => deleteDoc(doc(db, 'contacts', c.id))}
                  className="p-2 text-gray-600 hover:text-red-500 transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Admin */}
      {activeTab === 'admin' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-[#11141A] p-6 rounded-2xl border border-[#1F2937] space-y-6">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <ShieldCheck size={16} className="text-indigo-400" /> Admin Details
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Developer Name</label>
                <input 
                  type="text"
                  value={admin.developer_name}
                  onChange={e => setAdmin({ ...admin, developer_name: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0B0D10] border border-[#1F2937] rounded-xl text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Company Name</label>
                <input 
                  type="text"
                  value={admin.company_name}
                  onChange={e => setAdmin({ ...admin, company_name: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0B0D10] border border-[#1F2937] rounded-xl text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Admin Email</label>
                <input 
                  type="email"
                  value={admin.admin_email}
                  onChange={e => setAdmin({ ...admin, admin_email: e.target.value })}
                  placeholder="admin@example.com"
                  className="w-full px-4 py-3 bg-[#0B0D10] border border-[#1F2937] rounded-xl text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none transition"
                />
              </div>
            </div>

            <button 
              onClick={saveAdmin}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition shadow-lg flex items-center justify-center gap-2"
            >
              <Save size={20} /> Save Admin Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

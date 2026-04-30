'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/firestoreError';
import { Loader2, Plus, Trash2, Save, Edit, User, MapPin, ShieldCheck, AlertTriangle, CheckCircle, FolderKanban } from 'lucide-react';
import { useAdmin } from '../../lib/useAdmin';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'areas' | 'contacts' | 'projects' | 'admin'>('areas');
  const [loadingConfig, setLoadingConfig] = useState(true);
  
  const { isAdmin: isAuthorized, loading: adminLoading } = useAdmin();
  
  // States for data
  const [areas, setAreas] = useState<{ id: string; name: string; task_types: string[] }[]>([]);
  const [contacts, setContacts] = useState<{ id: string; name: string; email: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string; description: string; created_at: string }[]>([]);
  const [admin, setAdmin] = useState<any>({ developer_name: 'Umar Latif', company_name: 'TM Rubber', admin_email: '', admin_emails: [] });

  // Form states
  const [editingContact, setEditingContact] = useState<{ id: string; name: string; email: string } | null>(null);
  const [editingProject, setEditingProject] = useState<{ id: string; name: string; description: string } | null>(null);
  const [newArea, setNewArea] = useState('');
  const [newTaskType, setNewTaskType] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');

  useEffect(() => {
    // Listen to Areas
    const areasUnsub = onSnapshot(collection(db, 'areas'), (snap) => {
      setAreas(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    });

    // Listen to Contacts
    const contactsUnsub = onSnapshot(collection(db, 'contacts'), (snap) => {
      setContacts(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    });

    // Listen to Projects
    const projectsUnsub = onSnapshot(collection(db, 'projects'), (snap) => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    });

    // Get Admin Settings
    getDoc(doc(db, 'settings', 'admin')).then((snap) => {
      if (snap.exists()) {
        setAdmin(snap.data() as any);
      }
    }).finally(() => setLoadingConfig(false));

    return () => {
      areasUnsub();
      contactsUnsub();
      projectsUnsub();
    };
  }, []);

  const [saveSuccess, setSaveSuccess] = useState(false);

  const saveAdmin = async () => {
    try {
      const updatedAdmin = { ...admin, developer_name: 'Umar Latif' };
      await setDoc(doc(db, 'settings', 'admin'), updatedAdmin);
      setAdmin(updatedAdmin);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
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

  const updateContact = async () => {
    if (!editingContact) return;
    try {
      await setDoc(doc(db, 'contacts', editingContact.id), { 
        name: editingContact.name, 
        email: editingContact.email 
      });
      setEditingContact(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `contacts/${editingContact.id}`);
    }
  };

  const addProject = async () => {
    if (!projectName.trim()) return;
    try {
      // Find max project number
      let maxNum = 0;
      projects.forEach(p => {
        const match = p.id.match(/^Project-(\d+)$/);
        if (match) {
          const num = parseInt(match[1]);
          if (num > maxNum) maxNum = num;
        }
      });
      const nextNum = maxNum + 1;
      const nextId = `Project-${nextNum.toString().padStart(5, '0')}`;
      
      await setDoc(doc(db, 'projects', nextId), { 
        name: projectName, 
        description: projectDescription,
        created_at: new Date().toISOString()
      });
      setProjectName('');
      setProjectDescription('');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'projects');
    }
  };

  const updateProject = async () => {
    if (!editingProject) return;
    try {
      const existing = projects.find(p => p.id === editingProject.id);
      await setDoc(doc(db, 'projects', editingProject.id), { 
        ...existing,
        name: editingProject.name, 
        description: editingProject.description 
      });
      setEditingProject(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `projects/${editingProject.id}`);
    }
  };

  if (loadingConfig || adminLoading) return <div className="p-8 text-center text-gray-500">Loading settings...</div>;

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <AlertTriangle size={48} className="text-amber-500" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Access Denied</h2>
        <p className="text-gray-600 dark:text-gray-400 text-center">Only authorized administrators can access this page.</p>
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
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Settings & Configuration</h1>

      {/* Tabs */}
      <div className="flex bg-white dark:bg-[#11141A] p-1 rounded-xl border border-gray-200 dark:border-[#1F2937]">
        <button 
          onClick={() => setActiveTab('areas')}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition ${activeTab === 'areas' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-700 dark:text-gray-300'}`}
        >
          Areas (Tab 1)
        </button>
        <button 
          onClick={() => setActiveTab('contacts')}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition ${activeTab === 'contacts' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-700 dark:text-gray-300'}`}
        >
          Contacts
        </button>
        <button 
          onClick={() => setActiveTab('projects')}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition ${activeTab === 'projects' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-700 dark:text-gray-300'}`}
        >
          Projects
        </button>
        <button 
          onClick={() => setActiveTab('admin')}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition ${activeTab === 'admin' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-700 dark:text-gray-300'}`}
        >
          Admin
        </button>
      </div>

      {/* Tab: Areas */}
      {activeTab === 'areas' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-white dark:bg-[#11141A] p-5 rounded-2xl border border-gray-200 dark:border-[#1F2937] space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <MapPin size={16} className="text-indigo-400" /> Add Functional Area
            </h3>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newArea}
                onChange={e => setNewArea(e.target.value)}
                placeholder="e.g. Sales, HR, Logistics"
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-[#0B0D10] border border-gray-200 dark:border-[#1F2937] rounded-xl text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none"
              />
              <button 
                onClick={addArea}
                className="bg-indigo-600 hover:bg-indigo-700 text-gray-900 dark:text-white p-2 rounded-xl transition"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {areas.map(area => (
              <div key={area.id} className="bg-white dark:bg-[#11141A] rounded-2xl border border-gray-200 dark:border-[#1F2937] overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-[#1F2937] flex justify-between items-center bg-gray-50 dark:bg-[#1A1D23]/50">
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
                      <span key={idx} className="flex items-center gap-1.5 bg-gray-100 dark:bg-[#0B0D10] border border-gray-200 dark:border-[#1F2937] text-gray-700 dark:text-gray-300 px-2.5 py-1 rounded-lg text-xs">
                        {type}
                        <button onClick={() => removeTaskType(area.id, idx)} className="text-gray-600 hover:text-red-500 font-bold ml-1">×</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-[#1F2937]/50 mt-2">
                    <input 
                      type="text" 
                      placeholder="Add task type..."
                      className="flex-1 bg-transparent text-xs text-gray-600 dark:text-gray-400 outline-none"
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
          {/* Add/Edit Contact Form */}
          <div className="bg-white dark:bg-[#11141A] p-5 rounded-2xl border border-gray-200 dark:border-[#1F2937] space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <User size={16} className="text-indigo-400" /> {editingContact ? 'Edit Contact' : 'New Contact'}
            </h3>
            <div className="space-y-3">
              <input 
                type="text" 
                value={editingContact ? editingContact.name : contactName}
                onChange={e => editingContact ? setEditingContact({...editingContact, name: e.target.value}) : setContactName(e.target.value)}
                placeholder="Full Name"
                className="w-full px-4 py-2 bg-gray-100 dark:bg-[#0B0D10] border border-gray-200 dark:border-[#1F2937] rounded-xl text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none"
              />
              <div className="flex gap-2">
                <input 
                  type="email" 
                  value={editingContact ? editingContact.email : contactEmail}
                  onChange={e => editingContact ? setEditingContact({...editingContact, email: e.target.value}) : setContactEmail(e.target.value)}
                  placeholder="Email (optional)"
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-[#0B0D10] border border-gray-200 dark:border-[#1F2937] rounded-xl text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                />
                {editingContact ? (
                  <div className="flex gap-2">
                    <button 
                      onClick={updateContact}
                      className="bg-emerald-600 hover:bg-emerald-700 text-gray-900 dark:text-white px-4 py-2 rounded-xl transition font-medium"
                    >
                      Update
                    </button>
                    <button 
                      onClick={() => setEditingContact(null)}
                      className="bg-gray-200 dark:bg-[#1A1D23] text-gray-600 dark:text-gray-300 px-4 py-2 rounded-xl transition"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={addContact}
                    className="bg-indigo-600 hover:bg-indigo-700 text-gray-900 dark:text-white px-4 py-2 rounded-xl transition"
                  >
                    <Plus size={20} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#11141A] rounded-2xl border border-gray-200 dark:border-[#1F2937] divide-y divide-[#1F2937]">
            {contacts.map(c => (
              <div key={c.id} className="p-4 flex justify-between items-center bg-gray-50 dark:bg-[#1A1D23]/30">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.email || 'No email set'}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setEditingContact(c)}
                    className="p-2 text-gray-400 hover:text-indigo-400 transition"
                    title="Edit Contact"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => deleteDoc(doc(db, 'contacts', c.id))}
                    className="p-2 text-gray-600 hover:text-red-500 transition"
                    title="Delete Contact"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Projects */}
      {activeTab === 'projects' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Add/Edit Project Form */}
          <div className="bg-white dark:bg-[#11141A] p-5 rounded-2xl border border-gray-200 dark:border-[#1F2937] space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FolderKanban size={16} className="text-indigo-400" /> {editingProject ? 'Edit Project' : 'New Project'}
            </h3>
            <div className="space-y-3">
              <input 
                type="text" 
                value={editingProject ? editingProject.name : projectName}
                onChange={e => editingProject ? setEditingProject({...editingProject, name: e.target.value}) : setProjectName(e.target.value)}
                placeholder="Project Name"
                className="w-full px-4 py-2 bg-gray-100 dark:bg-[#0B0D10] border border-gray-200 dark:border-[#1F2937] rounded-xl text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none"
              />
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={editingProject ? editingProject.description : projectDescription}
                  onChange={e => editingProject ? setEditingProject({...editingProject, description: e.target.value}) : setProjectDescription(e.target.value)}
                  placeholder="Description (optional)"
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-[#0B0D10] border border-gray-200 dark:border-[#1F2937] rounded-xl text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                />
                {editingProject ? (
                  <div className="flex gap-2">
                    <button 
                      onClick={updateProject}
                      className="bg-emerald-600 hover:bg-emerald-700 text-gray-900 dark:text-white px-4 py-2 rounded-xl transition font-medium"
                    >
                      Update
                    </button>
                    <button 
                      onClick={() => setEditingProject(null)}
                      className="bg-gray-200 dark:bg-[#1A1D23] text-gray-600 dark:text-gray-300 px-4 py-2 rounded-xl transition"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={addProject}
                    className="bg-indigo-600 hover:bg-indigo-700 text-gray-900 dark:text-white px-4 py-2 rounded-xl transition flex items-center shrink-0"
                  >
                    <Plus size={20} className="mr-1" /> Add
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#11141A] rounded-2xl border border-gray-200 dark:border-[#1F2937] divide-y divide-[#1F2937]">
            {projects.map(p => (
              <div key={p.id} className="p-4 flex justify-between items-center bg-gray-50 dark:bg-[#1A1D23]/30 hover:bg-gray-50 dark:bg-[#1A1D23]/50 transition">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">{p.id}</span>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</h4>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{p.description || 'No description'}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setEditingProject(p)}
                    className="p-2 text-gray-400 hover:text-indigo-400 transition"
                    title="Edit Project"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => deleteDoc(doc(db, 'projects', p.id))}
                    className="p-2 text-gray-600 hover:text-red-500 transition ml-4 shrink-0"
                    title="Delete Project"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {projects.length === 0 && (
               <div className="p-8 text-center text-gray-500">No projects created yet.</div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Admin */}
      {activeTab === 'admin' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-white dark:bg-[#11141A] p-6 rounded-2xl border border-gray-200 dark:border-[#1F2937] space-y-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldCheck size={16} className="text-indigo-400" /> Admin Details
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Developer Name</label>
                <div className="w-full px-4 py-3 bg-gray-100 dark:bg-[#0B0D10] border border-gray-200 dark:border-[#1F2937] rounded-xl text-sm text-gray-900 dark:text-white font-medium">
                  {admin.developer_name}
                </div>
                <p className="text-[10px] text-gray-400 mt-1 italic">* Hardcoded by system request</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Company Name</label>
                <input 
                  type="text"
                  value={admin.company_name}
                  onChange={e => setAdmin({ ...admin, company_name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-[#0B0D10] border border-gray-200 dark:border-[#1F2937] rounded-xl text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none transition"
                />
              </div>
              
              <div className="mt-8 p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-indigo-400">Support & Customization</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-500 text-white rounded">Promo ERP</span>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <h5 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-tighter">Description</h5>
                    <p className="text-[11px] text-gray-500 leading-relaxed mt-1">
                      Promo ERP is a dedicated Enterprise Resource Planning (ERP) service provider specializing in scalable, feature-rich solutions designed for businesses of all sizes.
                      <br /><br />
                      Our mission is to synchronize your company operations by integrating essential functions like finance, inventory, and sales into a single, unified platform. By offering tiered packages, we ensure that every client receives the precise level of automation and functionality required for their current scale and growth trajectory.
                      <br /><br />
                      Now also offer customization, integrations, Custom Apps and AI Automation.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-indigo-500/10">
                    <div className="space-y-2">
                       <h5 className="text-[10px] font-bold text-indigo-400 uppercase">Contact Information</h5>
                       <div className="space-y-1">
                         <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                           <span className="font-semibold text-[10px] w-12 shrink-0">Email:</span>
                           <a href="mailto:promoerp786@gmail.com" className="text-indigo-400 hover:underline">promoerp786@gmail.com</a>
                         </div>
                         <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                           <span className="font-semibold text-[10px] w-12 shrink-0">Phone:</span>
                           <span>+92-300-4439445</span>
                         </div>
                       </div>
                    </div>

                    <div className="space-y-2">
                       <h5 className="text-[10px] font-bold text-indigo-400 uppercase">Links</h5>
                       <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                         <a href="https://sites.google.com/view/promoerp/home" target="_blank" className="text-[10px] text-gray-500 hover:text-indigo-400 transition underline">Website</a>
                         <a href="https://facebook.com/promoerp786" target="_blank" className="text-[10px] text-gray-500 hover:text-indigo-400 transition underline">Facebook</a>
                         <a href="https://wa.me/923218833616" target="_blank" className="text-[10px] text-gray-500 hover:text-indigo-400 transition underline">WhatsApp</a>
                         <a href="https://www.youtube.com/@PromoERP" target="_blank" className="text-[10px] text-gray-500 hover:text-indigo-400 transition underline">YouTube</a>
                       </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Admin Emails (comma separated)</label>
                <textarea 
                  value={(admin as any).admin_emails ? (admin as any).admin_emails.join(', ') : admin.admin_email}
                  onChange={e => setAdmin({ ...admin, admin_emails: e.target.value.split(',').map(s => s.trim()) })}
                  placeholder="admin@example.com, user2@example.com"
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-[#0B0D10] border border-gray-200 dark:border-[#1F2937] rounded-xl text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none transition"
                  rows={3}
                />
              </div>
            </div>

            <button 
              onClick={saveAdmin}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-gray-900 dark:text-white font-bold py-4 rounded-xl transition shadow-lg flex items-center justify-center gap-2 relative overflow-hidden"
            >
              <Save size={20} /> Save Admin Settings
            </button>
            {saveSuccess && (
              <div className="absolute bottom-4 right-4 bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-2 rounded-xl text-sm font-medium animate-in slide-in-from-bottom flex items-center gap-2">
                 <CheckCircle size={16} /> Settings saved successfully!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

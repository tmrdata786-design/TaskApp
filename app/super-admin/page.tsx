'use client';

import { useState, useEffect } from 'react';
import { collection, doc, setDoc, getDocs, serverTimestamp, query, where } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/firestoreError';
import { useAuth } from '../../components/AuthProvider';
import { Loader2 } from 'lucide-react';

export default function SuperAdmin() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    adminEmail: '',
  });

  useEffect(() => {
    if (authLoading || !isSuperAdmin) {
      if (!authLoading && !isSuperAdmin) {
         window.location.href = '/';
      }
      return;
    }

    async function loadOrgs() {
      try {
        const snap = await getDocs(collection(db, 'organizations'));
        setOrganizations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'organizations');
      } finally {
        setLoading(false);
      }
    }
    loadOrgs();
  }, [isSuperAdmin, authLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.adminEmail) return;
    setSubmitting(true);

    try {
      const orgId = `org-${Date.now()}`;
      await setDoc(doc(db, 'organizations', orgId), {
        name: form.name,
        adminEmail: form.adminEmail,
        created_at: serverTimestamp(),
      });
      
      // Assign the user to the organization as an Admin
      const userId = form.adminEmail.replace(/[@.]/g, '_');
      await setDoc(doc(db, 'users', userId), {
        email: form.adminEmail,
        orgId: orgId,
        role: 'Admin',
      });

      // Also create a contact for them
      await setDoc(doc(collection(db, 'contacts')), {
        name: form.adminEmail.split('@')[0],
        email: form.adminEmail,
        role: 'Admin',
        orgId: orgId,
      });

      setForm({ name: '', adminEmail: '' });
      
      const snap = await getDocs(collection(db, 'organizations'));
      setOrganizations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'organizations');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500" /></div>;
  if (!isSuperAdmin) return null;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Super Admin Dashboard</h1>
      
      <form onSubmit={handleSubmit} className="bg-white dark:bg-[#11141A] p-6 rounded-2xl border border-gray-200 dark:border-[#1F2937] space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Create New Organization</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name</label>
            <input 
              type="text" 
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg dark:bg-[#0B0D10] dark:border-[#1F2937] dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Initial Admin Email</label>
            <input 
              type="email" 
              value={form.adminEmail}
              onChange={e => setForm({...form, adminEmail: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg dark:bg-[#0B0D10] dark:border-[#1F2937] dark:text-white"
              required
            />
          </div>
        </div>
        <button 
          type="submit" 
          disabled={submitting}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
        >
          {submitting ? 'Creating...' : 'Create Organization'}
        </button>
      </form>

      <div className="bg-white dark:bg-[#11141A] p-6 rounded-2xl border border-gray-200 dark:border-[#1F2937]">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Organizations</h2>
        <table className="w-full text-left bg-gray-50 dark:bg-[#0B0D10] rounded-lg border border-gray-200 dark:border-[#1F2937]">
          <thead>
            <tr className="border-b border-gray-200 dark:border-[#1F2937]">
              <th className="px-4 py-3 text-sm font-medium text-gray-500">ID</th>
              <th className="px-4 py-3 text-sm font-medium text-gray-500">Name</th>
              <th className="px-4 py-3 text-sm font-medium text-gray-500">Admin Email</th>
            </tr>
          </thead>
          <tbody>
            {organizations.map(org => (
              <tr key={org.id} className="border-b border-gray-200 dark:border-[#1F2937] last:border-0">
                <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-400">{org.id}</td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{org.name}</td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{org.adminEmail}</td>
              </tr>
            ))}
            {organizations.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-4 text-center text-sm text-gray-500">No organizations found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

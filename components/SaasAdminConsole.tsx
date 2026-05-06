'use client';

import { useState, useEffect } from 'react';
import Select from 'react-select';
import { useAuth } from './AuthProvider';
import { db } from '../lib/firebase';
import { collection, query, doc, updateDoc, where, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';

export default function SaasAdminConsole() {
  const { user, isSuperAdmin } = useAuth();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalCompanies: 0, totalUsers: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

  // New Org Form States
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgAdminEmail, setNewOrgAdminEmail] = useState('');
  const [isAddingOrg, setIsAddingOrg] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin) {
      setTimeout(() => setLoading(false), 0);
      return;
    }

    let currentOrgs: any[] = [];
    let currentUsers: any[] = [];

    const updateState = () => {
      // Calculate revenue
      const revenue = currentOrgs.reduce((sum, c: any) => {
        const plan = c.plan || 'trial';
        const planPrice = { trial: 0, basic: 10, regular: 20, business: 50, enterprise: 100 }[plan as string] || 0;
        return sum + (c.subscription?.status === 'active' ? planPrice : 0);
      }, 0);

      const enhancedOrgs = currentOrgs.map(org => {
        const orgUsers = currentUsers.filter(u => u.orgId === org.id);
        const adminUsers = orgUsers.filter(u => u.role === 'Admin');
        return {
          ...org,
          userCount: orgUsers.length,
          admins: adminUsers.map(a => a.email).join(', ')
        }
      });

      setOrganizations(enhancedOrgs);
      setUsers(currentUsers);
      setStats({
        totalCompanies: currentOrgs.length,
        totalUsers: currentUsers.length,
        revenue
      });
      setLoading(false);
    };

    const orgsUnsub = onSnapshot(collection(db, 'organizations'), (orgsSnap) => {
      currentOrgs = orgsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      updateState();
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'organizations'));
    
    const usersUnsub = onSnapshot(collection(db, 'users'), (usersSnap) => {
      currentUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      updateState();
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'users'));

    return () => {
      orgsUnsub();
      usersUnsub();
    };
  }, [isSuperAdmin]);

  // Only show for super admin
  if (!isSuperAdmin) {
    return <div className="p-8 text-center text-red-500">Access Denied</div>;
  }

  const getPlanBadge = (plan?: string) => {
    const p = plan || 'trial';
    const colors: Record<string, string> = {
      trial: 'bg-gray-500',
      basic: 'bg-green-500',
      regular: 'bg-blue-500',
      business: 'bg-purple-500',
      enterprise: 'bg-amber-500'
    };
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${colors[p]} border-0`}>{p.replace('_', ' ').toUpperCase()}</span>;
  };

  const updateOrgPlan = async (orgId: string, newPlan: string) => {
    try {
      await updateDoc(doc(db, 'organizations', orgId), {
        plan: newPlan,
        'subscription.status': 'active'
      });
    } catch (e: any) {
      console.error(e);
      alert(`Failed to update plan: ${e.message}`);
      handleFirestoreError(e, OperationType.UPDATE, `organizations/${orgId}`);
    }
  };

  const deleteOrganization = async (orgId: string, orgName: string) => {
    try {
      await deleteDoc(doc(db, 'organizations', orgId));
      alert("Organization deleted successfully!");
    } catch (e: any) {
      console.error(e);
      alert(`Failed to delete organization: ${e.message}`);
      handleFirestoreError(e, OperationType.DELETE, `organizations/${orgId}`);
    }
  };

  const handleAddOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim() || !newOrgAdminEmail.trim()) return;
    
    setIsAddingOrg(true);
    try {
      const orgId = newOrgName.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).substring(2, 7);
      const now = new Date().toISOString();
      
      // 1. Create Organization
      await setDoc(doc(db, 'organizations', orgId), {
        name: newOrgName,
        adminEmail: newOrgAdminEmail,
        plan: 'trial',
        subscription: { status: 'trial' },
        created_at: now
      });

      // 2. Map Admin User to this Org
      const userId = newOrgAdminEmail.replace(/[@.]/g, '_');
      await setDoc(doc(db, 'users', userId), {
        email: newOrgAdminEmail,
        orgId: orgId,
        role: 'Admin'
      });

      setNewOrgName('');
      setNewOrgAdminEmail('');
      alert("Organization added successfully!");
    } catch (e) {
      console.error("Error adding organization:", e);
      alert("Failed to add organization");
    } finally {
      setIsAddingOrg(false);
    }
  };
  
  const selectStyles = {
    control: (base: any) => ({
      ...base,
      backgroundColor: 'white',
      borderColor: '#E5E7EB',
      boxShadow: 'none',
      minHeight: '28px',
      fontSize: '12px',
      '&:hover': { borderColor: '#E5E7EB' }
    }),
    valueContainer: (base: any) => ({
      ...base,
      padding: '0 8px'
    }),
    indicatorsContainer: (base: any) => ({
      ...base,
      height: '28px'
    }),
    menu: (base: any) => ({
      ...base,
      fontSize: '12px',
      zIndex: 9999
    }),
    menuPortal: (base: any) => ({
      ...base,
      zIndex: 9999
    })
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading SaaS Dashboard...</div>;

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">SaaS Admin Console</h2>
        <p className="text-sm text-gray-500 mt-2">Manage all registered organizations, users, and subscription plans.</p>
      </div>

      {/* Add New Organization Section */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Organization</h3>
        <form onSubmit={handleAddOrganization} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Organization Name</label>
            <input 
              type="text" 
              required
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              placeholder="e.g. Acme Corp"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Admin Email</label>
            <input 
              type="email" 
              required
              value={newOrgAdminEmail}
              onChange={(e) => setNewOrgAdminEmail(e.target.value)}
              placeholder="admin@acme.com"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition text-sm"
            />
          </div>
          <div className="flex items-end">
            <button 
              type="submit"
              disabled={isAddingOrg}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg transition disabled:bg-gray-400 text-sm h-[38px]"
            >
              {isAddingOrg ? 'Adding...' : 'Add Organization'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="text-sm font-medium text-gray-500 mb-2">Organizations</div>
          <div className="text-3xl font-bold text-gray-900">{stats.totalCompanies}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="text-sm font-medium text-gray-500 mb-2">Total Users</div>
          <div className="text-3xl font-bold text-gray-900">{stats.totalUsers}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="text-sm font-medium text-gray-500 mb-2">Projected MRR</div>
          <div className="text-3xl font-bold text-green-600">${stats.revenue}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto min-h-[800px]">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 border-b">
              <tr>
                <th className="px-6 py-3 font-medium">Organization</th>
                <th className="px-6 py-3 font-medium text-center">Plan</th>
                <th className="px-6 py-3 font-medium text-center">Users</th>
                <th className="px-6 py-3 font-medium text-center">Status</th>
                <th className="px-6 py-3 font-medium">Admin Email(s)</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {organizations.map(org => (
                <tr key={org.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{org.name}</div>
                    <div className="text-xs text-gray-500 font-mono mt-1">{org.id}</div>
                  </td>
                  <td className="px-6 py-4 text-center">{getPlanBadge(org.plan)}</td>
                  <td className="px-6 py-4 text-center">
                    {org.userCount} / {org.plan === 'enterprise' ? 100 : org.plan === 'business' ? 25 : org.plan === 'regular' ? 10 : org.plan === 'basic' ? 5 : 1}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${org.subscription?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {org.subscription?.status || 'trial'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-xs">
                    {org.admins || org.adminEmail}
                  </td>
                  <td className="px-6 py-4 flex items-center gap-2">
                    <div className="w-[180px]">
                      <Select
                        options={[
                          { value: 'trial', label: 'Trial (1 User)' },
                          { value: 'basic', label: 'Basic (5 Users)' },
                          { value: 'regular', label: 'Regular (10 Users)' },
                          { value: 'business', label: 'Business (25 Users)' },
                          { value: 'enterprise', label: 'Enterprise (100 Users)' }
                        ]}
                        value={{ 
                          value: org.plan || 'trial', 
                          label: { trial: 'Trial (1 User)', basic: 'Basic (5 Users)', regular: 'Regular (10 Users)', business: 'Business (25 Users)', enterprise: 'Enterprise (100 Users)' }[org.plan as string || 'trial'] 
                        }}
                        onChange={(opt: any) => opt && updateOrgPlan(org.id, opt.value)}
                        styles={selectStyles}
                        isSearchable={false}
                        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                        menuPosition="fixed"
                      />
                    </div>
                    <button
                      onClick={() => deleteOrganization(org.id, org.name)}
                      className="p-1 px-2 text-xs bg-red-100 text-red-600 hover:bg-red-200 rounded transition"
                      title="Delete Organization"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {organizations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No organizations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

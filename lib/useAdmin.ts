import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from '../components/AuthProvider';

export function useAdmin() {
  const { user, orgId, orgRole, isSuperAdmin, loading: authLoading } = useAuth();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [userArea, setUserArea] = useState<string | null>(null);
  const [userContactName, setUserContactName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user || (!orgId && !isSuperAdmin)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsAdmin(false);
      setIsManager(false);
      setUserArea(null);
      setUserContactName(null);
      setLoading(false);
      return;
    }

    if (isSuperAdmin) {
      setIsAdmin(true);
      setLoading(false);
      return;
    }

    async function loadRoles() {
      let finalIsAdmin = false;
      let finalIsManager = false;
      let finalUserArea = null;
      let finalUserContactName = null;

      if (orgRole === 'Admin') {
        finalIsAdmin = true;
      }

      try {
        if (orgId && user?.email) {
          const q = query(
            collection(db, 'contacts'), 
            where('orgId', '==', orgId),
            where('email', '==', user.email)
          );
          const contactSnap = await getDocs(q);
          if (!contactSnap.empty) {
            const contact = contactSnap.docs[0].data();
            finalUserContactName = contact.name;
            if (contact.role === 'Manager') {
              finalIsManager = true;
              finalUserArea = contact.area;
            } else if (contact.role === 'Admin') {
              finalIsAdmin = true;
            }
          }
        }
      } catch (error) {
        console.error("Error loading contacts for role access:", error);
      }
      
      setIsAdmin(finalIsAdmin);
      setIsManager(finalIsManager);
      setUserArea(finalUserArea);
      setUserContactName(finalUserContactName);
      setLoading(false);
    }

    loadRoles();
  }, [user, orgId, orgRole, isSuperAdmin, authLoading]);

  // Expose orgId as well so other components can use it for querying/saving.
  return { isAdmin, isManager, userArea, userContactName, orgId, isSuperAdmin, loading: loading || authLoading };
}

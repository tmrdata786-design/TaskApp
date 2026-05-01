import { useState, useEffect } from 'react';
import { doc, getDoc, getDocs, collection } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './firebase';

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [userArea, setUserArea] = useState<string | null>(null);
  const [userContactName, setUserContactName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user?.email) {
        setIsAdmin(false);
        setIsManager(false);
        setUserArea(null);
        setUserContactName(null);
        setLoading(false);
        return;
      }
      
      let finalIsAdmin = false;
      let finalIsManager = false;
      let finalUserArea = null;
      let finalUserContactName = null;

      if (user.email === 'tmrdata786@gmail.com') {
        finalIsAdmin = true;
      }

      try {
        const snap = await getDoc(doc(db, 'settings', 'admin'));
        if (snap.exists()) {
          const data = snap.data();
          const emails = data.admin_emails || [];
          if (emails.includes(user.email) || data.admin_email === user.email) {
            finalIsAdmin = true;
          }
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
      }

      try {
        const contactSnap = await getDocs(collection(db, 'contacts'));
        const contact = contactSnap.docs.find(d => d.data().email === user.email);
        if (contact) {
          finalUserContactName = contact.data().name;
          if (contact.data().role === 'Manager') {
            finalIsManager = true;
            finalUserArea = contact.data().area;
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
    });

    return () => unsubscribe();
  }, []);

  return { isAdmin, isManager, userArea, userContactName, loading };
}

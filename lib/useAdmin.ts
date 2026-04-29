import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      const user = auth.currentUser;
      if (!user?.email) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      
      if (user.email === 'tmrdata786@gmail.com') {
        setIsAdmin(true);
        setLoading(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, 'settings', 'admin'));
        if (snap.exists()) {
          const data = snap.data();
          const emails = data.admin_emails || [];
          if (emails.includes(user.email)) {
            setIsAdmin(true);
          } else if (data.admin_email === user.email) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      }
      
      setLoading(false);
    };

    checkAdmin();
  }, []);

  return { isAdmin, loading };
}

'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { LoaderCircle } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  orgId: string | null;
  orgRole: string | null;
  isSuperAdmin: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  orgId: null,
  orgRole: null,
  isSuperAdmin: false,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgRole, setOrgRole] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        setOrgId(null);
        setOrgRole(null);
        setIsSuperAdmin(false);
        setAccessDenied(false);
        setLoading(false);
        return;
      }
      
      const email = u.email;
      if (!email) {
        setUser(u);
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      const SUPER_ADMIN_EMAIL = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || 'auinternational4u@gmail.com';
      if (email === SUPER_ADMIN_EMAIL) {
        setIsSuperAdmin(true);
        setUser(u);
        setAccessDenied(false);
        setLoading(false);
        return;
      }

      try {
        const { getDoc, doc } = await import('firebase/firestore');
        const userDocId = email.replace(/[@.]/g, '_');
        const actDoc = await getDoc(doc(db, 'users', userDocId));
        
        if (actDoc.exists()) {
          const userData = actDoc.data();
          setOrgId(userData.orgId || null);
          setOrgRole(userData.role || null);
          setIsSuperAdmin(false);
          setUser(u);
          setAccessDenied(false);
        } else {
          setUser(u);
          setAccessDenied(true);
        }
      } catch (err) {
        console.error("Error fetching user org:", err);
        setUser(u);
        setAccessDenied(true);
      }
      
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      console.error("Auth error", e);
      if (e.code === 'auth/unauthorized-domain') {
        setError("This domain is not authorized in Firebase Console.");
      } else if (e.code === 'auth/popup-blocked') {
        setError("Sign-in popup was blocked by your browser. Please allow popups for this site.");
      } else {
        setError(e.message || "Sign-in failed. Please try again.");
      }
    }
  };

  const signOut = async () => {
    await auth.signOut();
  }

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center h-screen bg-[#0B0D10]">
        <LoaderCircle 
          className="w-8 h-8 animate-spin text-indigo-600" 
          aria-hidden="true" 
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0B0D10] text-gray-100 p-4">
        <div className="bg-[#11141A] border border-[#1F2937] p-8 rounded-2xl shadow-sm text-center max-w-sm w-full mx-auto">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-white shadow-lg bg-indigo-600 text-xl">TM</div>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-white">Welcome</h2>
          <p className="text-gray-400 mb-6">Sign in to access TM Rubber task tracking.</p>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg mb-6 text-left">
              {error}
            </div>
          )}

          <button 
            onClick={signIn}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }
  
  if (accessDenied && !isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0B0D10] text-gray-100 p-4">
        <div className="bg-[#11141A] border border-[#1F2937] p-8 rounded-2xl shadow-sm text-center max-w-sm w-full mx-auto">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-white shadow-lg bg-red-600 text-xl">X</div>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-white">Access Denied</h2>
          <p className="text-gray-400 mb-6">Your email ({user.email}) is not registered to any Organization. Contact your administrator.</p>
          
          <button 
            onClick={signOut}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-xl border border-gray-700 transition"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={{ user, loading, orgId, orgRole, isSuperAdmin, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

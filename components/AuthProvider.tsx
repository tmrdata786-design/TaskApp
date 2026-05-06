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
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
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

      const SUPER_ADMIN_EMAIL = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || 'tmrdata786@gmail.com';
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
            <div className="px-4 py-2 rounded-lg flex items-center justify-center font-bold text-white shadow-lg bg-indigo-600 text-xl">Promo ERP</div>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-white">{authMode === 'signin' ? 'Sign In' : 'Sign Up'}</h2>
          <p className="text-gray-400 mb-6">
            {authMode === 'signin' 
              ? 'Access your Project Management and Task Tracking Dashboard.' 
              : 'Create your account via Google to join Promo ERP Project Management App'}
          </p>
          
          <div className="flex mb-6 bg-[#0B0D10] p-1 rounded-xl border border-[#1F2937]">
            <button 
              onClick={() => setAuthMode('signin')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${authMode === 'signin' ? 'bg-[#1F2937] text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Sign In
            </button>
            <button 
              onClick={() => setAuthMode('signup')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${authMode === 'signup' ? 'bg-[#1F2937] text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Sign Up
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg mb-6 text-left">
              {error}
            </div>
          )}

          <button 
            onClick={signIn}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.9 3.34-2.02 4.48-1.12 1.12-2.5 1.86-4.66 1.86-4.24 0-7.3-3.48-7.3-7.72 0-4.24 3.06-7.72 7.3-7.72 2.3 0 4.14.82 5.56 2.1l2.3-2.3C19.16 3.08 16.5 2 13.38 2 7.6 2 3 6.66 3 12.38s4.6 10.38 10.38 10.38c3.12 0 5.64-1.02 7.56-3.02 2.06-2.06 2.7-4.94 2.7-7.22 0-.6-.06-1.14-.14-1.6h-11z" />
            </svg>
            {authMode === 'signin' ? 'Sign in with Google' : 'Sign up with Google'}
          </button>
        </div>
      </div>
    );
  }
  
  if (accessDenied && !isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0B0D10] text-gray-100 p-4">
        <div className="bg-[#11141A] border border-[#1F2937] p-8 rounded-2xl shadow-sm text-center max-w-xl w-full mx-auto">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-white shadow-lg bg-red-600 text-xl">X</div>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-white">Access Denied</h2>
          <p className="text-gray-400 mb-6">Your email ({user.email}) is not registered to any Organization. Contact your administrator.</p>
          
          <button 
            onClick={signOut}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-xl border border-gray-700 transition mb-6"
          >
            Sign out
          </button>

          <div className="text-left border-t border-[#1F2937] pt-6 mt-2">
            <h3 className="text-xl font-bold text-white mb-2">Please contact developers to get the Web App</h3>
            <h4 className="text-lg font-bold text-indigo-400 mt-4 mb-2">Promo ERP</h4>
            
            <h5 className="font-bold text-gray-300 mt-4">Description</h5>
            <p className="text-sm text-gray-400 mt-1 leading-relaxed">
              Promo ERP is a dedicated Enterprise Resource Planning (ERP) service provider specializing in scalable, feature-rich solutions designed for businesses of all sizes.
            </p>
            <p className="text-sm text-gray-400 mt-2 leading-relaxed">
              Our mission is to synchronize your company operations by integrating essential functions like finance, inventory, and sales into a single, unified platform. By offering tiered packages, we ensure that every client receives the precise level of automation and functionality required for their current scale and growth trajectory.
            </p>
            <p className="text-sm text-gray-400 mt-2 font-medium">
              Now we also offer customization, integrations, Custom Apps and AI Automation
            </p>

            <h5 className="font-bold text-gray-300 mt-6">Contact Information</h5>
            <div className="text-sm text-gray-400 mt-2 space-y-1">
              <p>Email: <a href="mailto:promoerp786@gmail.com" className="text-indigo-400 hover:underline">promoerp786@gmail.com</a></p>
              <p>Contact Number: +92-321-8833616</p>
            </div>

            <h5 className="font-bold text-gray-300 mt-6">Links</h5>
            <div className="text-sm text-gray-400 mt-2 space-y-2">
              <p><span className="font-medium text-gray-300">Website:</span> <a href="https://sites.google.com/view/promoerp/home" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline break-all">sites.google.com/view/promoerp/home</a></p>
              <p><span className="font-medium text-gray-300">FaceBook:</span> <a href="https://facebook.com/promoerp786" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline break-all">facebook.com/promoerp786</a></p>
              <p><span className="font-medium text-gray-300">WhatsApp:</span> <a href="https://wa.me/923218833616" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline break-all">wa.me/923218833616</a></p>
              <p><span className="font-medium text-gray-300">YouTube:</span> <a href="https://www.youtube.com/@PromoERP" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline break-all">www.youtube.com/@PromoERP</a></p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={{ user, loading, orgId, orgRole, isSuperAdmin, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
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
        setError("This domain is not authorized in Firebase Console. Please add 'task-app-three-phi.vercel.app' to Authorized Domains.");
      } else if (e.code === 'auth/popup-blocked') {
        setError("Sign-in popup was blocked by your browser. Please allow popups for this site.");
      } else {
        setError(e.message || "Sign-in failed. Please try again.");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 space-y-6 pt-20 px-4">
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

  return <AuthContext.Provider value={{ user, loading, signIn }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

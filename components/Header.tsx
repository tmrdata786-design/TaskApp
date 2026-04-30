'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTheme } from './ThemeProvider';
import { Sun, Moon } from 'lucide-react';

export function Header() {
  const [admin, setAdmin] = useState({ developer_name: 'Umar Latif', company_name: 'TM Rubber' });
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'admin'), (snap) => {
      if (snap.exists()) {
        setAdmin(snap.data() as any);
      }
    });
    return () => unsub();
  }, []);

  return (
    <header className="h-16 border-b border-gray-200 dark:border-[#1F2937] px-4 flex items-center justify-between bg-white/80 dark:bg-[#0B0D10]/80 sticky top-0 z-10 backdrop-blur transition-colors duration-200">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shadow-lg bg-indigo-600">
          {admin.company_name.substring(0, 2).toUpperCase()}
        </div>
        <div className="font-bold text-lg tracking-tight text-gray-900 dark:text-white hidden sm:block">
          {admin.company_name} Tasks
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-[10px] opacity-80 uppercase tracking-widest text-gray-600 dark:text-gray-400">
          Developed by Umar Latif
        </div>
        <button 
          onClick={toggleTheme} 
          className="p-2 rounded-lg bg-gray-100 dark:bg-[#1A1D23] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2D3139] transition-colors"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>
    </header>
  );
}

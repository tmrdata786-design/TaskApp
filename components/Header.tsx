'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function Header() {
  const [admin, setAdmin] = useState({ developer_name: 'Umar Latif', company_name: 'TM Rubber' });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'admin'), (snap) => {
      if (snap.exists()) {
        setAdmin(snap.data() as any);
      }
    });
    return () => unsub();
  }, []);

  return (
    <header className="h-16 border-b border-[#1F2937] px-4 flex items-center justify-between bg-[#0B0D10]/80 sticky top-0 z-10 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shadow-lg bg-indigo-600">
          {admin.company_name.substring(0, 2).toUpperCase()}
        </div>
        <div className="font-bold text-lg tracking-tight text-white hidden sm:block">
          {admin.company_name} Tasks
        </div>
      </div>
      <div className="text-[10px] opacity-80 uppercase tracking-widest text-gray-400">
        Developed by {admin.developer_name}
      </div>
    </header>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, PlusCircle, Settings } from 'lucide-react';
import { useAdmin } from '../lib/useAdmin';

export function BottomNav() {
  const pathname = usePathname();
  const { isAdmin, isManager } = useAdmin();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-100 dark:bg-[#0B0D10] border-t border-gray-200 dark:border-[#1F2937] flex justify-around items-center h-16 pb-safe z-50">
      <Link 
        href="/" 
        className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${pathname === '/' ? 'text-indigo-400 bg-indigo-600/10' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:bg-[#1A1D23] transition'}`}
      >
        <LayoutDashboard size={24} />
        <span className="text-[10px] font-medium tracking-wide uppercase">Dashboard</span>
      </Link>
      {(isAdmin || isManager) && (
        <Link 
          href="/admin" 
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${pathname === '/admin' ? 'text-indigo-400 bg-indigo-600/10' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:bg-[#1A1D23] transition'}`}
        >
          <PlusCircle size={24} />
          <span className="text-[10px] font-medium tracking-wide uppercase">New Task</span>
        </Link>
      )}
      {isAdmin && (
        <Link 
          href="/settings" 
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${pathname === '/settings' ? 'text-indigo-400 bg-indigo-600/10' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:bg-[#1A1D23] transition'}`}
        >
          <Settings size={24} />
          <span className="text-[10px] font-medium tracking-wide uppercase">Settings</span>
        </Link>
      )}
    </div>
  );
}

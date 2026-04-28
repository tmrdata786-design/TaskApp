import type {Metadata} from 'next';
import './globals.css';
import { AuthProvider } from '../components/AuthProvider';
import { BottomNav } from '../components/BottomNav';
import { PwaRegistration } from '../components/PwaRegistration';
import { Header } from '../components/Header';

export const metadata: Metadata = {
  title: 'TM Rubber Task Manager',
  description: 'Task Manager for TM Rubber',
  manifest: '/manifest.json',
  themeColor: '#2563eb',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TM Rubber Tasks',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body className="bg-[#0B0D10] text-[#E5E7EB] font-sans sm:pb-0 pb-[72px]" suppressHydrationWarning>
        <PwaRegistration />
        <AuthProvider>
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 flex flex-col p-4 w-full max-w-4xl mx-auto">
              {children}
            </main>
            <BottomNav />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}

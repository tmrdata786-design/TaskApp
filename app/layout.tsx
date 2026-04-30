import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '../components/AuthProvider';
import { BottomNav } from '../components/BottomNav';
import { PwaRegistration } from '../components/PwaRegistration';
import { Header } from '../components/Header';
import { ThemeProvider } from '../components/ThemeProvider';

export const metadata: Metadata = {
  title: 'TM Rubber Task Manager',
  description: 'Task Manager for TM Rubber',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TM Rubber Tasks',
  },
};

export const viewport: Viewport = {
  themeColor: '#0B0D10',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body className="bg-gray-50 dark:bg-[#0B0D10] text-gray-900 dark:text-[#E5E7EB] font-sans sm:pb-0 pb-[72px]" suppressHydrationWarning>
        <ThemeProvider>
          <PwaRegistration />
          <AuthProvider>
            <div className="flex flex-col min-h-screen transition-colors duration-200">
              <Header />
              <main className="flex-1 flex flex-col w-full max-w-7xl mx-auto md:p-4 p-2">
                {children}
              </main>
              <BottomNav />
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

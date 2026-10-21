'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { NewSampleModal } from '@/components/samples/NewSampleModal';
import { FlaskConical, Loader2, ShieldCheck } from 'lucide-react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAccessionOpen, setIsAccessionOpen] = useState(false);

  // If on login route, render bare layout without header or sidebar
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // If session is still resolving or user is unauthenticated, show clinical loading screen
  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center max-w-sm text-center">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-primary-800 to-primary-600 flex items-center justify-center text-white shadow-lg shadow-primary-700/20 mb-4 animate-pulse">
            <FlaskConical className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">CITY PHARMA LIMS</h2>
          <p className="text-xs text-slate-500 mt-1 mb-6">
            Verifying authorized cGMP laboratory credentials...
          </p>
          <div className="flex items-center gap-2 text-xs text-primary-700 font-medium bg-primary-50 px-3.5 py-1.5 rounded-full border border-primary-200">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-600" />
            <span>Establishing Secure Session</span>
          </div>
          <div className="mt-8 flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Secure Access Gateway</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onOpenAccessionModal={() => setIsAccessionOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 lg:pl-64 flex flex-col min-w-0 overflow-y-auto">
          <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {children}
          </div>
        </main>
      </div>

      <NewSampleModal
        isOpen={isAccessionOpen}
        onClose={() => setIsAccessionOpen(false)}
      />
    </div>
  );
}

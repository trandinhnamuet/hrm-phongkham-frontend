'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { useAuth } from '@/contexts/auth-context';
import { SidebarProvider, useSidebar } from '@/contexts/sidebar-context';

function MobileTopBar() {
  const { toggle } = useSidebar();
  return (
    <div className="h-14 flex-shrink-0 flex items-center gap-3 px-4 border-b border-gray-100 bg-white lg:hidden">
      <button
        onClick={toggle}
        className="p-2 -ml-1 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        aria-label="Mở menu"
      >
        <Menu size={20} />
      </button>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-indigo-500 flex items-center justify-center">
          <span className="text-white text-[10px] font-bold">NK</span>
        </div>
        <span className="text-sm font-semibold text-gray-900">HRM Phòng Khám</span>
      </div>
    </div>
  );
}

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F9F9]">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 lg:ml-60 flex flex-col overflow-hidden">
        <MobileTopBar />
        {children}
      </main>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </SidebarProvider>
  );
}

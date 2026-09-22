'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sidebar } from '@/components/layout/sidebar';
import { useAuth } from '@/contexts/auth-context';
import { SidebarProvider, useSidebar } from '@/contexts/sidebar-context';
import { BottomNav } from '@/components/layout/bottom-nav';
import { InstallButton } from '@/components/pwa/install-button';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { AccountMenu } from '@/components/layout/account-menu';

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
      <Link href="/dashboard" className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity">
        <img src="/logo-mark.png" alt="" className="w-7 h-7 object-contain flex-shrink-0" />
        <span className="text-sm font-semibold text-gray-900 truncate">HRM Nha Khoa Gia Đình</span>
      </Link>
      <div className="ml-auto flex items-center gap-1 flex-shrink-0">
        <InstallButton />
        <NotificationBell />
        <AccountMenu />
      </div>
    </div>
  );
}

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const { isCollapsed } = useSidebar();
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
      <main className={cn(
        'flex-1 flex flex-col overflow-hidden transition-all duration-200',
        // Chừa chỗ cho thanh điều hướng dưới, nếu không nó che mất nội dung cuối trang.
        'pb-14 lg:pb-0',
        isCollapsed ? 'lg:ml-16' : 'lg:ml-60',
      )}>
        <MobileTopBar />
        {children}
      </main>
      <BottomNav />
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

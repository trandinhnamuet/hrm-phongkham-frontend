'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, CheckSquare, Clock, CalendarOff,
  Users, Settings, LogOut, ChevronRight, X, ClipboardList,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useSidebar } from '@/contexts/sidebar-context';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/tasks',     label: 'Công việc',   icon: CheckSquare },
  { href: '/attendance', label: 'Chấm công',  icon: Clock },
  { href: '/leave',     label: 'Nghỉ tuần',   icon: CalendarOff },
];

const managerItems = [
  { href: '/tasks/manage', label: 'Quản lý CV',  icon: ClipboardList, adminOnly: false },
  { href: '/users',        label: 'Nhân viên',   icon: Users,          adminOnly: false },
  { href: '/settings',     label: 'Cài đặt',     icon: Settings,       adminOnly: true  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { isOpen, close } = useSidebar();

  const isAdmin   = user?.role === 'GIAM_DOC';
  const isManager = user?.role === 'GIAM_DOC' || user?.role === 'QUAN_LY';

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={close}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 h-screen w-60 flex flex-col z-40 transition-transform duration-200',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        style={{ backgroundColor: '#1C1C1E', borderRight: '1px solid #2C2C2E' }}
      >
        {/* Logo row */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-[#2C2C2E]">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-indigo-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">NK</span>
            </div>
            <span className="text-white text-sm font-semibold truncate">HRM Phòng Khám</span>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={close}
            className="lg:hidden p-1 text-[#A1A1AA] hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          <div className="space-y-0.5">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== '/tasks' && pathname.startsWith(href));
              return (
                <Link key={href} href={href} onClick={close}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors duration-150',
                    active
                      ? 'bg-[#3B3B3D] text-white'
                      : 'text-[#A1A1AA] hover:bg-[#2C2C2E] hover:text-white',
                  )}>
                  <Icon size={16} />
                  <span>{label}</span>
                  {active && <ChevronRight size={14} className="ml-auto opacity-50" />}
                </Link>
              );
            })}
          </div>

          {isManager && (
            <>
              <p className="mt-6 mb-2 px-3 text-[10px] font-medium uppercase tracking-widest text-[#52525B]">
                Quản lý
              </p>
              <div className="space-y-0.5">
                {managerItems.map(({ href, label, icon: Icon, adminOnly }) => {
                  if (adminOnly && !isAdmin) return null;
                  const active = pathname === href || (href !== '/tasks' && pathname.startsWith(href));
                  return (
                    <Link key={href} href={href} onClick={close}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors duration-150',
                        active
                          ? 'bg-[#3B3B3D] text-white'
                          : 'text-[#A1A1AA] hover:bg-[#2C2C2E] hover:text-white',
                      )}>
                      <Icon size={16} />
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="border-t border-[#2C2C2E] p-3">
          <Link href="/profile" onClick={close}
            className="flex items-center gap-2.5 rounded-md px-1 py-1 hover:bg-[#2C2C2E] transition-colors group">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-8 h-8 object-cover rounded-full" />
              ) : (
                <span className="text-indigo-400 text-xs font-semibold">
                  {user?.fullName?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{user?.fullName}</p>
              <p className="text-[#A1A1AA] text-[11px] truncate">
                {user?.role === 'GIAM_DOC' ? 'Giám đốc' : user?.role === 'QUAN_LY' ? 'Quản lý' : user?.positionTitle || 'Nhân viên'}
              </p>
            </div>
            <button
              onClick={(e) => { e.preventDefault(); logout(); }}
              className="p-1.5 rounded-md text-[#52525B] hover:text-red-400 hover:bg-[#3B3B3D] transition-colors"
            >
              <LogOut size={14} />
            </button>
          </Link>
        </div>
      </aside>
    </>
  );
}

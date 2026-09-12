'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, CheckSquare, Clock, CalendarOff,
  Users, Settings, LogOut, ChevronRight, X, ClipboardList, Bell,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useSidebar } from '@/contexts/sidebar-context';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard, managerHidden: false },
  { href: '/tasks',      label: 'Công việc',  icon: CheckSquare,     managerHidden: false },
  { href: '/attendance', label: 'Chấm công',  icon: Clock,           managerHidden: true  },
  { href: '/leave',      label: 'Nghỉ tuần',  icon: CalendarOff,     managerHidden: false },
  { href: '/notifications', label: 'Thông báo', icon: Bell,          managerHidden: false },
];

const managerItems = [
  { href: '/attendance',   label: 'Chấm công',   icon: Clock,         adminOnly: false },
  { href: '/tasks/manage', label: 'Công việc',  icon: ClipboardList, adminOnly: false },
  { href: '/users',        label: 'Nhân viên',   icon: Users,         adminOnly: false },
  { href: '/settings',     label: 'Cài đặt',     icon: Settings,      adminOnly: true  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { isOpen, close, isCollapsed, toggleCollapsed } = useSidebar();

  const isAdmin   = user?.role === 'GIAM_DOC';
  const isManager = user?.role === 'GIAM_DOC' || user?.role === 'QUAN_LY';

  // Thu gọn chỉ áp dụng từ breakpoint lg trở lên. Trên mobile menu luôn là
  // ngăn kéo rộng 60, thu gọn ở đó sẽ thành dải icon vô nghĩa.
  const hideOnCollapse = isCollapsed ? 'lg:hidden' : '';
  const centerOnCollapse = isCollapsed ? 'lg:justify-center lg:px-0' : '';

  const renderLink = (
    { href, label, icon: Icon }: { href: string; label: string; icon: any },
    showActiveArrow = false,
  ) => {
    const active = pathname === href || (href !== '/tasks' && pathname.startsWith(href));
    return (
      <Link
        key={href}
        href={href}
        onClick={close}
        title={isCollapsed ? label : undefined}
        className={cn(
          'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors duration-150',
          centerOnCollapse,
          active
            ? 'bg-[#3B3B3D] text-white'
            : 'text-[#A1A1AA] hover:bg-[#2C2C2E] hover:text-white',
        )}
      >
        <Icon size={16} className="flex-shrink-0" />
        <span className={cn('truncate', hideOnCollapse)}>{label}</span>
        {showActiveArrow && active && (
          <ChevronRight size={14} className={cn('ml-auto opacity-50', hideOnCollapse)} />
        )}
      </Link>
    );
  };

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
          'fixed left-0 top-0 h-screen flex flex-col z-40 transition-all duration-200',
          isCollapsed ? 'w-60 lg:w-16' : 'w-60',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        style={{ backgroundColor: '#1C1C1E', borderRight: '1px solid #2C2C2E' }}
      >
        {/* Logo row — bấm vào để về trang chủ */}
        <div className={cn(
          'flex items-center justify-between h-14 border-b border-[#2C2C2E] px-4',
          isCollapsed ? 'lg:px-0 lg:justify-center' : '',
        )}>
          <Link
            href="/dashboard"
            onClick={close}
            title="Về trang chủ"
            className="flex items-center gap-3 min-w-0 rounded-md hover:opacity-80 transition-opacity"
          >
            <div className="w-7 h-7 rounded-md bg-indigo-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">NK</span>
            </div>
            <span className={cn('text-white text-sm font-semibold truncate', hideOnCollapse)}>
              HRM Phòng Khám
            </span>
          </Link>
          {/* Close button — mobile only */}
          <button
            onClick={close}
            className="lg:hidden p-1 text-[#A1A1AA] hover:text-white transition-colors"
            aria-label="Đóng menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2">
          <div className="space-y-0.5">
            {navItems.map(item => {
              if (item.managerHidden && isManager) return null;
              return renderLink(item, true);
            })}
          </div>

          {isManager && (
            <>
              <p className={cn(
                'mt-6 mb-2 px-3 text-[10px] font-medium uppercase tracking-widest text-[#52525B]',
                hideOnCollapse,
              )}>
                Quản lý
              </p>
              {/* Khi thu gọn, thay chữ "Quản lý" bằng một gạch ngăn cho đỡ dính khối */}
              {isCollapsed && <div className="hidden lg:block my-3 mx-3 border-t border-[#2C2C2E]" />}
              <div className="space-y-0.5">
                {managerItems.map(item => {
                  if (item.adminOnly && !isAdmin) return null;
                  return renderLink(item);
                })}
              </div>
            </>
          )}
        </nav>

        {/* Thu gọn / mở rộng — chỉ desktop */}
        <button
          onClick={toggleCollapsed}
          title={isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          className={cn(
            'hidden lg:flex items-center gap-2.5 mx-2 mb-2 px-3 py-2 rounded-md text-sm',
            'text-[#A1A1AA] hover:bg-[#2C2C2E] hover:text-white transition-colors',
            centerOnCollapse,
          )}
        >
          {isCollapsed
            ? <PanelLeftOpen size={16} className="flex-shrink-0" />
            : <PanelLeftClose size={16} className="flex-shrink-0" />}
          <span className={cn('truncate', hideOnCollapse)}>Thu gọn</span>
        </button>

        {/* User footer */}
        <div className="border-t border-[#2C2C2E] p-3">
          <div className={cn('flex items-center gap-2.5', isCollapsed ? 'lg:flex-col lg:gap-2' : '')}>
            <Link
              href="/profile"
              onClick={close}
              title={isCollapsed ? user?.fullName : undefined}
              className={cn(
                'flex items-center gap-2.5 min-w-0 flex-1 rounded-md px-1 py-1 hover:bg-[#2C2C2E] transition-colors',
                isCollapsed ? 'lg:flex-none lg:px-0' : '',
              )}
            >
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-8 h-8 object-cover rounded-full" />
                ) : (
                  <span className="text-indigo-400 text-xs font-semibold">
                    {user?.fullName?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className={cn('flex-1 min-w-0', hideOnCollapse)}>
                <p className="text-white text-xs font-medium truncate">{user?.fullName}</p>
                <p className="text-[#A1A1AA] text-[11px] truncate">
                  {user?.role === 'GIAM_DOC' ? 'Giám đốc' : user?.role === 'QUAN_LY' ? 'Quản lý' : user?.positionTitle || 'Nhân viên'}
                </p>
              </div>
            </Link>
            <button
              onClick={logout}
              title="Đăng xuất"
              className="flex-shrink-0 p-1.5 rounded-md text-[#52525B] hover:text-red-400 hover:bg-[#3B3B3D] transition-colors"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

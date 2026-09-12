'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, CheckSquare, Clock, CalendarOff, Menu,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useSidebar } from '@/contexts/sidebar-context';
import { cn } from '@/lib/utils';

/**
 * Thanh điều hướng dưới màn hình, chỉ hiện trên mobile.
 *
 * Ngón cái với tới cạnh dưới dễ hơn góc trên bên trái, nên 4 mục hay dùng nhất
 * nằm ở đây. Mục thứ 5 mở ngăn kéo cũ để vào các trang quản lý ít dùng hơn.
 */
export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { toggle } = useSidebar();

  const isManager = user?.role === 'GIAM_DOC' || user?.role === 'QUAN_LY';

  const items = [
    { href: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    {
      href: isManager ? '/tasks/manage' : '/tasks',
      label: 'Công việc',
      icon: CheckSquare,
      // Cả /tasks lẫn /tasks/manage đều tính là đang ở mục Công việc
      match: (p: string) => p.startsWith('/tasks'),
    },
    { href: '/attendance', label: 'Chấm công', icon: Clock },
    { href: '/leave', label: 'Nghỉ tuần', icon: CalendarOff },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200
                 pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_3px_rgba(0,0,0,0.04)]"
    >
      <div className="grid grid-cols-5">
        {items.map(({ href, label, icon: Icon, match }) => {
          const active = match ? match(pathname) : pathname.startsWith(href);
          return (
            <Link
              key={label}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 h-14 transition-colors',
                active ? 'text-indigo-600' : 'text-gray-400 active:bg-gray-50',
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 2} />
              <span className={cn('text-[10px] leading-none', active && 'font-semibold')}>{label}</span>
            </Link>
          );
        })}

        <button
          onClick={toggle}
          aria-label="Mở menu"
          className="flex flex-col items-center justify-center gap-0.5 h-14 text-gray-400 active:bg-gray-50 transition-colors"
        >
          <Menu size={20} />
          <span className="text-[10px] leading-none">Thêm</span>
        </button>
      </div>
    </nav>
  );
}

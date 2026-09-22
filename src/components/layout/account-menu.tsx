'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, User, Sliders, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';

/**
 * Nút bánh răng ở thanh header mobile.
 *
 * Trước đây chỉ Giám đốc mới có lối vào phần cài đặt (mục "Cài đặt" nằm trong
 * khối Quản lý của ngăn kéo, khối đó nhân viên không thấy). Nhân viên vẫn có
 * thứ để chỉnh — hồ sơ, ảnh đại diện, mật khẩu — nên nút này hiện cho mọi vai
 * trò; riêng mục cấu hình hệ thống mới giới hạn cho Giám đốc.
 */
export function AccountMenu() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'GIAM_DOC';

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const go = (href: string) => { setOpen(false); router.push(href); };

  const itemCls = 'w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors';

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title="Cài đặt"
        aria-label="Cài đặt"
        aria-expanded={open}
        className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
      >
        <Settings size={18} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className={cn(
            'absolute right-0 top-full mt-2 z-50 w-60 overflow-hidden',
            'bg-white rounded-xl shadow-2xl ring-1 ring-black/5',
          )}>
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.fullName}</p>
              <p className="text-xs text-gray-400 truncate">
                {isAdmin ? 'Giám đốc' : user?.role === 'QUAN_LY' ? 'Quản lý' : user?.positionTitle || 'Nhân viên'}
              </p>
            </div>

            <button onClick={() => go('/profile')} className={itemCls}>
              <User size={16} className="text-gray-400 flex-shrink-0" />
              Hồ sơ cá nhân
            </button>

            {isAdmin && (
              <button onClick={() => go('/settings')} className={itemCls}>
                <Sliders size={16} className="text-gray-400 flex-shrink-0" />
                Cài đặt hệ thống
              </button>
            )}

            <button
              onClick={() => { setOpen(false); logout(); }}
              className={cn(itemCls, 'border-t border-gray-100 text-red-600 hover:bg-red-50')}
            >
              <LogOut size={16} className="flex-shrink-0" />
              Đăng xuất
            </button>
          </div>
        </>
      )}
    </div>
  );
}

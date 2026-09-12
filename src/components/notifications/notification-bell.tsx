'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, X, ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import { AppNotification } from '@/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { NotificationItem } from '@/components/notifications/notification-item';

/**
 * Mở hộp chi tiết công việc từ một link dạng /tasks?task=ID.
 * Trang công việc nghe sự kiện này thay vì đọc URL, vì khi đang đứng sẵn ở
 * /tasks thì router.push cùng đường dẫn không làm trang mount lại.
 */
export function notifHref(link: string, role?: string) {
  const m = link.match(/[?&]task=(\d+)/);
  if (!m) return link;
  // Cấp trên nhận thông báo về việc của cấp dưới — việc đó không nằm trong
  // "Công việc của tôi". Đưa họ về đúng bảng quản lý thì đóng hộp chi tiết ra
  // là thấy ngay công việc, thay vì rơi vào một danh sách chẳng liên quan.
  const manage = role === 'GIAM_DOC' || role === 'QUAN_LY';
  return `${manage ? '/tasks/manage' : '/tasks'}?task=${m[1]}`;
}

export function openTaskFromLink(link: string) {
  const m = link.match(/[?&]task=(\d+)/);
  if (m) window.dispatchEvent(new CustomEvent('hrm:open-task', { detail: Number(m[1]) }));
}

/** Chuông thông báo ở góc phải thanh header: đếm chưa đọc mỗi 30s, bấm mở danh sách. */
export function NotificationBell() {
  const router = useRouter();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const { data: unread } = useQuery<{ count: number }>({
    queryKey: ['notif-unread'],
    queryFn: () => api.get('/notifications/unread-count').then(r => r.data),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const { data: items = [], isLoading } = useQuery<AppNotification[]>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications', { params: { limit: 50 } }).then(r => r.data),
    enabled: open,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['notif-unread'] });
    qc.invalidateQueries({ queryKey: ['notifications'] });
  };

  const markRead = useMutation({
    mutationFn: (id: number) => api.patch(`/notifications/${id}/read`),
    onSuccess: invalidate,
  });
  const markAll = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: invalidate,
  });

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const go = (n: AppNotification) => {
    if (!n.isRead) markRead.mutate(n.id);
    setOpen(false);
    if (n.link) {
      router.push(notifHref(n.link, user?.role));
      // Đợi điều hướng xong rồi bắn sự kiện mở hộp chi tiết
      setTimeout(() => openTaskFromLink(n.link!), 150);
    }
  };

  const count = unread?.count ?? 0;

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title="Thông báo"
        aria-label={`Thông báo${count ? `, ${count} chưa đọc` : ''}`}
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center ring-2 ring-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Mobile: phủ toàn màn, panel từ trên xuống. Desktop: dropdown. */}
          <div className="fixed inset-0 z-40 bg-slate-900/40 sm:hidden" onClick={() => setOpen(false)} />
          <div className={cn(
            'z-50 bg-white shadow-2xl ring-1 ring-black/5 flex flex-col overflow-hidden',
            'fixed inset-x-3 top-3 max-h-[80dvh] rounded-2xl',
            // Desktop: thả xuống từ chuông, canh mép phải. Giới hạn theo chiều cao
            // màn hình vì main có overflow-hidden, tràn ra là bị cắt.
            'sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[380px]',
            'sm:max-h-[min(520px,calc(100dvh-8rem))] sm:rounded-xl',
          )}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">
                Thông báo {count > 0 && <span className="text-xs font-normal text-gray-400">· {count} chưa đọc</span>}
              </p>
              <div className="flex items-center gap-1">
                {count > 0 && (
                  <button onClick={() => markAll.mutate()} title="Đánh dấu đã đọc hết"
                    className="btn btn-sm btn-ghost text-indigo-600"><CheckCheck size={14} /> Đọc hết</button>
                )}
                <button onClick={() => setOpen(false)} className="icon-btn sm:hidden"><X size={16} /></button>
              </div>
            </div>

            <div className="overflow-y-auto">
              {isLoading ? (
                <div className="py-10 flex justify-center">
                  <div className="w-5 h-5 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
                </div>
              ) : items.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell size={28} className="mx-auto text-gray-200 mb-2" />
                  <p className="text-sm text-gray-400">Chưa có thông báo nào</p>
                </div>
              ) : items.slice(0, 12).map(n => (
                <div key={n.id} className="border-b border-gray-50 last:border-0">
                  <NotificationItem n={n} onClick={() => go(n)} />
                </div>
              ))}
            </div>

            <button
              onClick={() => { setOpen(false); router.push('/notifications'); }}
              className="flex items-center justify-center gap-1.5 h-11 border-t border-gray-100 text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors flex-shrink-0"
            >
              Xem tất cả thông báo <ArrowRight size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

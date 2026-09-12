'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, ClipboardCheck, MessageSquare, CalendarOff, UserPlus, X } from 'lucide-react';
import api from '@/lib/api';
import { AppNotification } from '@/types';
import { cn } from '@/lib/utils';

const TYPE_META: Record<string, { icon: any; cls: string }> = {
  TASK_ASSIGNED:  { icon: UserPlus,       cls: 'bg-indigo-50 text-indigo-600' },
  TASK_COMMENT:   { icon: MessageSquare,  cls: 'bg-blue-50 text-blue-600' },
  TASK_REVIEWED:  { icon: ClipboardCheck, cls: 'bg-amber-50 text-amber-600' },
  LEAVE_REVIEWED: { icon: CalendarOff,    cls: 'bg-green-50 text-green-600' },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'vừa xong';
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d} ngày trước` : new Date(iso).toLocaleDateString('vi-VN');
}

/**
 * Mở hộp chi tiết công việc từ một link dạng /tasks?task=ID.
 * Trang công việc nghe sự kiện này thay vì đọc URL, vì khi đang đứng sẵn ở
 * /tasks thì router.push cùng đường dẫn không làm trang mount lại.
 */
export function openTaskFromLink(link: string) {
  const m = link.match(/[?&]task=(\d+)/);
  if (m) window.dispatchEvent(new CustomEvent('hrm:open-task', { detail: Number(m[1]) }));
}

/** Chuông thông báo: đếm số chưa đọc mỗi 30s, bấm mở danh sách. */
export function NotificationBell({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const router = useRouter();
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
      router.push(n.link);
      // Đợi điều hướng xong rồi bắn sự kiện mở hộp chi tiết
      setTimeout(() => openTaskFromLink(n.link!), 150);
    }
  };

  const count = unread?.count ?? 0;
  const dark = variant === 'dark';

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title="Thông báo"
        aria-label={`Thông báo${count ? `, ${count} chưa đọc` : ''}`}
        className={cn(
          'relative inline-flex items-center justify-center w-9 h-9 rounded-lg transition-colors',
          dark ? 'text-[#A1A1AA] hover:bg-[#2C2C2E] hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900',
        )}
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
            'sm:absolute sm:inset-auto sm:top-full sm:mt-2 sm:w-[380px] sm:max-h-[520px] sm:rounded-xl',
            dark ? 'sm:left-0' : 'sm:right-0',
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
              ) : items.map(n => {
                const meta = TYPE_META[n.type] || TYPE_META.TASK_COMMENT;
                const Icon = meta.icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => go(n)}
                    className={cn(
                      'w-full flex items-start gap-3 px-4 py-3 text-left border-b border-gray-50 transition-colors hover:bg-gray-50',
                      !n.isRead && 'bg-indigo-50/40',
                    )}
                  >
                    <span className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', meta.cls)}>
                      <Icon size={15} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className={cn('block text-sm leading-snug text-gray-900', !n.isRead && 'font-semibold')}>{n.title}</span>
                      {n.body && (
                        <span className="block text-xs text-gray-600 mt-1 whitespace-pre-wrap line-clamp-3">{n.body}</span>
                      )}
                      <span className="block text-[11px] text-gray-400 mt-1">
                        {n.actor?.fullName ? `${n.actor.fullName} · ` : ''}{timeAgo(n.createdAt)}
                      </span>
                    </span>
                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-2" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

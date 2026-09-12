'use client';

import {
  ClipboardCheck, MessageSquare, CalendarOff, UserPlus, CircleCheckBig,
} from 'lucide-react';
import { AppNotification } from '@/types';
import { cn } from '@/lib/utils';

export const NOTIF_TYPE_META: Record<string, { icon: any; cls: string; label: string }> = {
  TASK_ASSIGNED:  { icon: UserPlus,        cls: 'bg-indigo-50 text-indigo-600', label: 'Được giao việc' },
  TASK_COMMENT:   { icon: MessageSquare,   cls: 'bg-blue-50 text-blue-600',     label: 'Bình luận' },
  TASK_COMPLETED: { icon: CircleCheckBig,  cls: 'bg-green-50 text-green-600',   label: 'Báo hoàn thành' },
  TASK_REVIEWED:  { icon: ClipboardCheck,  cls: 'bg-amber-50 text-amber-600',   label: 'Đánh giá' },
  LEAVE_REVIEWED: { icon: CalendarOff,     cls: 'bg-violet-50 text-violet-600', label: 'Đơn nghỉ' },
};

export function notifTimeAgo(iso: string) {
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
 * Một dòng thông báo. Dùng chung cho panel của chuông và trang /notifications
 * để hai chỗ không trôi khác nhau mỗi lần sửa.
 */
export function NotificationItem({
  n, onClick, size = 'sm',
}: { n: AppNotification; onClick: () => void; size?: 'sm' | 'md' }) {
  const meta = NOTIF_TYPE_META[n.type] || NOTIF_TYPE_META.TASK_COMMENT;
  const Icon = meta.icon;
  const big = size === 'md';

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 text-left transition-colors hover:bg-gray-50',
        big ? 'px-4 py-4' : 'px-4 py-3',
        !n.isRead && 'bg-indigo-50/40',
      )}
    >
      <span className={cn(
        'rounded-full flex items-center justify-center flex-shrink-0',
        big ? 'w-10 h-10' : 'w-8 h-8',
        meta.cls,
      )}>
        <Icon size={big ? 18 : 15} />
      </span>

      <span className="flex-1 min-w-0">
        <span className={cn(
          'block leading-snug text-gray-900',
          big ? 'text-[15px]' : 'text-sm',
          !n.isRead && 'font-semibold',
        )}>
          {n.title}
        </span>
        {n.body && (
          <span className={cn(
            'block text-gray-600 mt-1 whitespace-pre-wrap',
            big ? 'text-sm' : 'text-xs line-clamp-3',
          )}>
            {n.body}
          </span>
        )}
        <span className="block text-[11px] text-gray-400 mt-1.5">
          <span className={cn('inline-block px-1.5 py-0.5 rounded mr-1.5', meta.cls)}>{meta.label}</span>
          {n.actor?.fullName ? `${n.actor.fullName} · ` : ''}{notifTimeAgo(n.createdAt)}
        </span>
      </span>

      {!n.isRead && <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-2" />}
    </button>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import api from '@/lib/api';
import { AppNotification } from '@/types';
import { Bell, CheckCheck } from 'lucide-react';
import {
  NotificationItem, NOTIF_TYPE_META,
} from '@/components/notifications/notification-item';
import { openTaskFromLink } from '@/components/notifications/notification-bell';

type Filter = 'all' | 'unread';

export default function NotificationsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');
  const [type, setType] = useState('');

  const { data: items = [], isLoading } = useQuery<AppNotification[]>({
    queryKey: ['notifications-all'],
    queryFn: () => api.get('/notifications', { params: { limit: 200 } }).then(r => r.data),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['notifications-all'] });
    qc.invalidateQueries({ queryKey: ['notifications'] });
    qc.invalidateQueries({ queryKey: ['notif-unread'] });
  };

  const markRead = useMutation({
    mutationFn: (id: number) => api.patch(`/notifications/${id}/read`),
    onSuccess: invalidate,
  });
  const markAll = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: invalidate,
  });

  const unreadCount = items.filter(n => !n.isRead).length;

  const shown = items.filter(n => {
    if (filter === 'unread' && n.isRead) return false;
    if (type && n.type !== type) return false;
    return true;
  });

  const go = (n: AppNotification) => {
    if (!n.isRead) markRead.mutate(n.id);
    if (n.link) {
      router.push(n.link);
      setTimeout(() => openTaskFromLink(n.link!), 150);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-auto">
      <PageHeader
        title="Thông báo"
        description={`${items.length} thông báo${unreadCount ? ` · ${unreadCount} chưa đọc` : ''}`}
        actions={unreadCount > 0 && (
          <button onClick={() => markAll.mutate()} disabled={markAll.isPending}
            className="btn btn-sm btn-secondary text-indigo-600 border-indigo-200 hover:bg-indigo-50">
            <CheckCheck size={14} /> <span className="hidden sm:inline">Đánh dấu</span> đã đọc hết
          </button>
        )}
      />

      <div className="flex-1 p-4 sm:p-6">
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="filter-row">
            {([['all', 'Tất cả'], ['unread', `Chưa đọc${unreadCount ? ` (${unreadCount})` : ''}`]] as [Filter, string][])
              .map(([k, label]) => (
                <button key={k} onClick={() => setFilter(k)}
                  className={`h-9 sm:h-8 px-3 rounded-lg text-xs font-medium border transition-colors ${
                    filter === k
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}>
                  {label}
                </button>
              ))}
            <span className="w-px h-5 bg-gray-200 mx-1" />
            <select value={type} onChange={e => setType(e.target.value)} className="field field-sm w-auto">
              <option value="">Mọi loại</option>
              {Object.entries(NOTIF_TYPE_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <span className="text-xs text-gray-400">{shown.length} mục</span>
          </div>

          <div className="surface overflow-hidden divide-y divide-gray-50">
            {isLoading ? (
              <div className="py-16 flex justify-center">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
              </div>
            ) : shown.length === 0 ? (
              <div className="py-16 text-center">
                <Bell size={32} className="mx-auto text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">
                  {filter === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
                </p>
              </div>
            ) : shown.map(n => (
              <NotificationItem key={n.id} n={n} size="md" onClick={() => go(n)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

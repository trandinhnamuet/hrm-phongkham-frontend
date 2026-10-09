'use client';

import { useSyncExternalStore } from 'react';
import { Columns3, List, RotateCcw } from 'lucide-react';
import { Task } from '@/types';
import { ReviewBadge } from '@/components/tasks/review-badge';
import { TASK_PRIORITY_META, TASK_STATUS_META } from '@/components/tasks/task-detail-dialog';
import { cn } from '@/lib/utils';

/* ─── Kiểu xem: kanban hay danh sách ─────────────────────────
   Nhớ lựa chọn trong localStorage (mỗi trình duyệt một kiểu). Đọc qua
   useSyncExternalStore để lần render phía server luôn là 'board', không lệch
   hydrate. localStorage có thể ném lỗi (chế độ riêng tư) nên giữ thêm bản
   trong bộ nhớ để nút chuyển vẫn chạy. */
export type TaskView = 'board' | 'list';
const VIEW_KEY = 'hrm:task-view';
let memView: TaskView = 'board';
const listeners = new Set<() => void>();

function readView(): TaskView {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    if (v === 'board' || v === 'list') return v;
  } catch { /* bỏ qua, dùng bản trong bộ nhớ */ }
  return memView;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener('storage', cb);
  return () => { listeners.delete(cb); window.removeEventListener('storage', cb); };
}

export function useTaskView(): [TaskView, (v: TaskView) => void] {
  const view = useSyncExternalStore(subscribe, readView, () => 'board' as TaskView);
  const setView = (v: TaskView) => {
    memView = v;
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* chỉ nhớ trong phiên */ }
    listeners.forEach(l => l());
  };
  return [view, setView];
}

export function TaskViewToggle({ value, onChange }: { value: TaskView; onChange: (v: TaskView) => void }) {
  const opts: { key: TaskView; label: string; icon: typeof List }[] = [
    { key: 'board', label: 'Kanban', icon: Columns3 },
    { key: 'list', label: 'Danh sách', icon: List },
  ];
  return (
    <div className="inline-flex rounded-md border border-gray-200 bg-white p-0.5" role="group" aria-label="Kiểu xem">
      {opts.map(({ key, label, icon: Icon }) => (
        <button key={key} type="button" onClick={() => onChange(key)} aria-pressed={value === key}
          className={cn(
            'inline-flex items-center gap-1.5 h-7 px-2.5 rounded text-xs font-medium transition-colors',
            value === key ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-800',
          )}>
          <Icon size={13} /> <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}

/** Ô "Hiện việc đã hủy" — việc đã hủy bị ẩn mặc định, bật lên để xem và khôi phục. */
export function ShowCancelledToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none whitespace-nowrap">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="accent-indigo-500" />
      Hiện việc đã hủy
    </label>
  );
}

/* ─── Danh sách dạng bảng ─────────────────────────────────── */

function fmtDate(v?: string | null) {
  return v ? new Date(v).toLocaleDateString('vi-VN') : '—';
}

function assigneeNames(t: Task) {
  const list = t.assignees ?? [];
  return list.length ? list.map(a => a.fullName).join(', ') : '—';
}

interface TableProps {
  tasks: Task[];
  loading?: boolean;
  onOpen: (task: Task) => void;
  /** Có thì hiện nút "Khôi phục" ở việc đã hủy mà người dùng được phép khôi phục. */
  onRestore?: (task: Task) => void;
  canRestore?: (task: Task) => boolean;
}

/**
 * Xem công việc theo bảng. Từ md là bảng đủ cột (cuộn ngang nếu hẹp), dưới md
 * là danh sách thẻ gọn — bảng 8 cột trên điện thoại không đọc nổi.
 */
export function TaskTable({ tasks, loading, onOpen, onRestore, canRestore }: TableProps) {
  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }
  if (tasks.length === 0) {
    return <p className="py-16 text-center text-sm text-gray-400">Không có công việc nào</p>;
  }

  const restoreBtn = (t: Task, compact = false) =>
    t.status === 'CANCELLED' && onRestore && (canRestore?.(t) ?? true) ? (
      <button type="button"
        onClick={e => { e.stopPropagation(); onRestore(t); }}
        title="Khôi phục về Cần làm"
        className={cn('btn btn-sm btn-secondary text-indigo-600 border-indigo-200 hover:bg-indigo-50', compact && 'h-7')}>
        <RotateCcw size={12} /> Khôi phục
      </button>
    ) : null;

  return (
    <>
      {/* Mobile */}
      <div className="md:hidden divide-y divide-gray-100 bg-white border-y border-gray-100">
        {tasks.map(t => (
          <div key={t.id} onClick={() => onOpen(t)} role="button" tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter') onOpen(t); }}
            className={cn('px-4 py-3 active:bg-gray-50', t.status === 'CANCELLED' && 'opacity-70')}>
            <div className="flex items-start justify-between gap-2">
              <p className={cn('text-sm font-medium text-gray-900 leading-snug', t.status === 'CANCELLED' && 'line-through')}>
                {t.title}
              </p>
              <span className={`flex-shrink-0 text-[11px] font-medium px-1.5 py-0.5 rounded ${TASK_STATUS_META[t.status]?.color}`}>
                {TASK_STATUS_META[t.status]?.label}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-x-2 gap-y-1 flex-wrap text-[11px] text-gray-500">
              <span className={`font-medium px-1.5 py-0.5 rounded ${TASK_PRIORITY_META[t.priority]?.color}`}>
                {TASK_PRIORITY_META[t.priority]?.label}
              </span>
              {(t.startDate || t.dueDate) && (
                <span className={t.status === 'QUA_HAN' ? 'text-orange-600 font-medium' : ''}>
                  {t.startDate ? `${fmtDate(t.startDate)} → ` : 'Hạn '}{fmtDate(t.dueDate)}
                </span>
              )}
              <span className="truncate max-w-full">{assigneeNames(t)}</span>
            </div>
            {restoreBtn(t, true) && <div className="mt-2">{restoreBtn(t, true)}</div>}
          </div>
        ))}
      </div>

      {/* Desktop */}
      <div className="hidden md:block surface overflow-x-auto">
        <table className="w-full min-w-[920px]">
          <thead>
            <tr className="bg-gray-50 text-left">
              {['#', 'Công việc', 'Trạng thái', 'Ưu tiên', 'Người được giao', 'Từ ngày', 'Hạn', 'Người giao', ''].map((h, i) => (
                <th key={i} className="text-xs font-medium text-gray-500 px-3 py-2.5 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {tasks.map(t => (
              <tr key={t.id} onClick={() => onOpen(t)}
                className={cn('cursor-pointer hover:bg-gray-50 transition-colors', t.status === 'CANCELLED' && 'text-gray-400')}>
                <td className="px-3 py-2.5 text-xs text-gray-400 font-mono">{t.id}</td>
                <td className="px-3 py-2.5 max-w-[320px]">
                  <p className={cn('text-sm font-medium text-gray-900 truncate', t.status === 'CANCELLED' && 'line-through text-gray-500')}
                    title={t.title}>{t.title}</p>
                  {t.reviewStatus && <div className="mt-1"><ReviewBadge status={t.reviewStatus} /></div>}
                </td>
                <td className="px-3 py-2.5">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded whitespace-nowrap ${TASK_STATUS_META[t.status]?.color}`}>
                    {TASK_STATUS_META[t.status]?.label}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap ${TASK_PRIORITY_META[t.priority]?.color}`}>
                    {TASK_PRIORITY_META[t.priority]?.label}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-sm text-gray-600 max-w-[220px] truncate" title={assigneeNames(t)}>{assigneeNames(t)}</td>
                <td className="px-3 py-2.5 text-sm text-gray-600 whitespace-nowrap">{fmtDate(t.startDate)}</td>
                <td className={cn('px-3 py-2.5 text-sm whitespace-nowrap',
                  t.status === 'QUA_HAN' ? 'text-orange-600 font-medium' : 'text-gray-600')}>{fmtDate(t.dueDate)}</td>
                <td className="px-3 py-2.5 text-sm text-gray-600 whitespace-nowrap">{t.createdBy?.fullName || '—'}</td>
                <td className="px-3 py-2.5 text-right">{restoreBtn(t)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

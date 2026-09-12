'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRightLeft, Calendar, X } from 'lucide-react';
import { Task, TaskStatus } from '@/types';
import { AssigneeStack } from '@/components/tasks/assignee-picker';
import { ReviewBadge } from '@/components/tasks/review-badge';
import { TASK_PRIORITY_META } from '@/components/tasks/task-detail-dialog';
import { cn } from '@/lib/utils';

export interface BoardColumn {
  key: TaskStatus;
  label: string;
  color: string;
}

interface Props {
  columns: BoardColumn[];
  tasks: Task[];
  loading?: boolean;
  onOpen: (task: Task) => void;
  onMove: (task: Task, to: TaskStatus) => void;
  /** Quy tắc chuyển trạng thái, trả về false thì không hiện mục đó trong sheet. */
  canMoveTo?: (from: TaskStatus, to: TaskStatus) => boolean;
}

/**
 * Bảng công việc cho điện thoại, theo mẫu Trello mobile.
 *
 * Mỗi cột chiếm trọn bề ngang, vuốt ngang để sang cột khác, hàng tab ở trên để
 * nhảy thẳng. Không có kéo-thả: HTML5 drag không chạy trên cảm ứng, nên mỗi thẻ
 * có nút "Chuyển" mở action sheet chọn trạng thái đích.
 */
export function MobileBoard({ columns, tasks, loading, onOpen, onMove, canMoveTo }: Props) {
  const [active, setActive] = useState(0);
  const [moving, setMoving] = useState<Task | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  const grouped = columns.map(c => ({ ...c, tasks: tasks.filter(t => t.status === c.key) }));

  // Vuốt tới cột nào thì tab đó sáng. Tính theo scrollLeft chia bề rộng khung.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const idx = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
        setActive(Math.min(columns.length - 1, Math.max(0, idx)));
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { el.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, [columns.length]);

  // Tab đang sáng luôn nằm trong vùng nhìn thấy của hàng tab
  useEffect(() => {
    const tab = tabsRef.current?.children[active] as HTMLElement | undefined;
    tab?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [active]);

  const goTo = (idx: number) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' });
    setActive(idx);
  };

  const targets = moving
    ? columns.filter(c => c.key !== moving.status && (canMoveTo ? canMoveTo(moving.status, c.key) : true))
    : [];

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Tab trạng thái */}
      <div ref={tabsRef} className="flex gap-1.5 px-4 py-2 overflow-x-auto no-scrollbar bg-white border-b border-gray-100 flex-shrink-0">
        {grouped.map((col, i) => (
          <button
            key={col.key}
            onClick={() => goTo(i)}
            className={cn(
              'flex-shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium border transition-colors',
              i === active
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-200 active:bg-gray-50',
            )}
          >
            {col.label}
            <span className={cn(
              'min-w-5 h-5 px-1 rounded-full text-[10px] font-semibold inline-flex items-center justify-center',
              i === active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500',
            )}>
              {col.tasks.length}
            </span>
          </button>
        ))}
      </div>

      {/* Các cột, mỗi cột trọn màn hình, snap khi vuốt */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div
          ref={trackRef}
          className="flex-1 min-h-0 flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory no-scrollbar"
        >
          {grouped.map(col => (
            <div key={col.key} className="w-full min-w-full flex-shrink-0 snap-start overflow-y-auto p-3 space-y-2">
              {col.tasks.length === 0 && (
                <div className="py-16 text-center">
                  <p className="text-sm text-gray-400">Không có việc nào ở “{col.label}”</p>
                  <p className="text-xs text-gray-300 mt-1">Vuốt sang để xem cột khác</p>
                </div>
              )}
              {col.tasks.map(task => {
                const pr = TASK_PRIORITY_META[task.priority];
                return (
                  <div
                    key={task.id}
                    className={cn(
                      'rounded-xl shadow-sm p-3.5 transition-colors',
                      pr?.card,
                      task.status === 'QUA_HAN' && 'ring-1 ring-orange-300/60',
                    )}
                  >
                    <button onClick={() => onOpen(task)} className="w-full text-left">
                      <p className="text-sm font-medium text-gray-900 leading-snug">{task.title}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {pr && (
                          <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${pr.color}`}>{pr.label}</span>
                        )}
                        {task.reviewStatus && <ReviewBadge status={task.reviewStatus} />}
                        {task.dueDate && (
                          <span className={cn(
                            'inline-flex items-center gap-1 text-[11px]',
                            task.status === 'QUA_HAN' ? 'text-orange-600 font-medium' : 'text-gray-400',
                          )}>
                            <Calendar size={11} />
                            {new Date(task.dueDate).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                      </div>
                      <AssigneeStack assignees={task.assignees} />
                    </button>

                    <div className="flex justify-end mt-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => setMoving(task)}
                        className="btn btn-sm btn-ghost text-indigo-600"
                      >
                        <ArrowRightLeft size={13} /> Chuyển
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Action sheet chuyển trạng thái */}
      {moving && (
        <div
          className="fixed inset-0 z-[60] bg-slate-900/55 backdrop-blur-sm flex items-end"
          onClick={() => setMoving(null)}
        >
          <div
            className="w-full bg-white rounded-t-2xl shadow-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p className="text-xs text-gray-400">Chuyển công việc</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{moving.title}</p>
              </div>
              <button onClick={() => setMoving(null)} className="icon-btn -mr-1"><X size={16} /></button>
            </div>

            {targets.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Không có trạng thái nào có thể chuyển tới.</p>
            ) : (
              <div className="space-y-1.5">
                {targets.map(c => (
                  <button
                    key={c.key}
                    onClick={() => { onMove(moving, c.key); setMoving(null); }}
                    className="w-full flex items-center justify-between h-12 px-3 rounded-xl border border-gray-200 active:bg-gray-50"
                  >
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${c.color}`}>{c.label}</span>
                    <ArrowRightLeft size={14} className="text-gray-300" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

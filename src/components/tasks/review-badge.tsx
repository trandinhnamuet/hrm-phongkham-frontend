'use client';

import { ClipboardCheck, CircleCheck, Undo2 } from 'lucide-react';

export type TaskReviewStatus = 'PENDING_REVIEW' | 'ACCEPTED' | 'RETURNED';

export const REVIEW_META: Record<TaskReviewStatus, {
  label: string; short: string; cls: string; icon: any;
}> = {
  PENDING_REVIEW: {
    label: 'Chờ đánh giá', short: 'Chờ đánh giá',
    cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: ClipboardCheck,
  },
  ACCEPTED: {
    label: 'Đạt', short: 'Đạt',
    cls: 'bg-green-50 text-green-700 border-green-200', icon: CircleCheck,
  },
  RETURNED: {
    label: 'Bị trả lại', short: 'Trả lại',
    cls: 'bg-rose-50 text-rose-700 border-rose-200', icon: Undo2,
  },
};

/** Nhãn nhỏ hiện kết quả đánh giá của người giao việc, dùng trên thẻ công việc. */
export function ReviewBadge({
  status, size = 'sm',
}: { status?: TaskReviewStatus | null; size?: 'sm' | 'md' }) {
  if (!status || !REVIEW_META[status]) return null;
  const m = REVIEW_META[status];
  const Icon = m.icon;
  return (
    <span
      title={'Đánh giá: ' + m.label}
      className={`inline-flex items-center gap-1 rounded border font-medium ${m.cls} ${
        size === 'md' ? 'text-xs px-2 py-1' : 'text-[10px] px-1.5 py-0.5'
      }`}
    >
      <Icon size={size === 'md' ? 13 : 11} />
      {size === 'md' ? m.label : m.short}
    </span>
  );
}

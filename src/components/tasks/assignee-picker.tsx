'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Loader2, Search, UserPlus, X } from 'lucide-react';
import { User } from '@/types';

/** Nhóm avatar của những người được giao, dùng trên thẻ công việc. */
export function AssigneeStack({ assignees, max = 3 }: { assignees?: User[]; max?: number }) {
  const list = assignees ?? [];
  if (list.length === 0) return null;

  const shown = list.slice(0, max);
  const rest = list.length - shown.length;

  return (
    <div className="flex items-center gap-1.5 mt-2 min-w-0">
      <div className="flex -space-x-1.5 flex-shrink-0">
        {shown.map(u => (
          <div key={u.id} title={u.fullName}
            className="w-5 h-5 rounded-full bg-indigo-100 ring-2 ring-white flex items-center justify-center">
            <span className="text-[10px] text-indigo-600 font-semibold">{u.fullName?.charAt(0)}</span>
          </div>
        ))}
        {rest > 0 && (
          <div title={list.slice(max).map(u => u.fullName).join(', ')}
            className="w-5 h-5 rounded-full bg-gray-200 ring-2 ring-white flex items-center justify-center">
            <span className="text-[9px] text-gray-600 font-semibold">+{rest}</span>
          </div>
        )}
      </div>
      <span className="text-[11px] text-gray-500 truncate">
        {list.length === 1 ? list[0].fullName : `${list.length} người`}
      </span>
    </div>
  );
}

/** Danh sách tên những người đã được giao, dạng chip có nút bỏ. */
function AssigneeChips({
  people, onRemove, emptyText,
}: { people: User[]; onRemove?: (id: string) => void; emptyText: string }) {
  if (people.length === 0) {
    return <p className="text-xs text-gray-400 italic">{emptyText}</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {people.map(u => (
        <span key={u.id}
          className="inline-flex items-center gap-1.5 pl-1 pr-1.5 py-0.5 bg-indigo-50 border border-indigo-100 rounded-full max-w-full">
          <span className="w-4 h-4 rounded-full bg-indigo-200 flex items-center justify-center flex-shrink-0">
            <span className="text-[9px] text-indigo-700 font-semibold">{u.fullName?.charAt(0)}</span>
          </span>
          <span className="text-xs text-indigo-800 truncate">{u.fullName}</span>
          {onRemove && (
            <button type="button" onClick={() => onRemove(u.id)} title={`Bỏ ${u.fullName}`}
              className="flex-shrink-0 text-indigo-400 hover:text-red-500 transition-colors">
              <X size={12} />
            </button>
          )}
        </span>
      ))}
    </div>
  );
}

interface PickerProps {
  users: User[];
  /** Danh sách id đang được giao. */
  value: string[];
  onChange: (ids: string[]) => void;
  /** true = đang tự lưu lên server, hiện chỉ báo cạnh nhãn. */
  saving?: boolean;
  /** Đánh dấu đã lưu xong (hiện dấu tích một lúc). */
  savedAt?: number | null;
  /** Chỉ xem, không sửa được. */
  readOnly?: boolean;
}

/**
 * Tìm và thêm người được giao.
 *
 * Chips ở trên hiện ai đã được thêm, ô tìm kiếm ở dưới mở danh sách gợi ý.
 * Danh sách gợi ý đặt absolute nên không đẩy layout, và chỉ chứa người CHƯA
 * được thêm để không phải đọc lại những người đã có trong chips.
 */
export function AssigneePicker({
  users, value, onChange, saving, savedAt, readOnly,
}: PickerProps) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => value.map(id => users.find(u => u.id === id)).filter(Boolean) as User[],
    [value, users],
  );

  const candidates = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return users
      .filter(u => !value.includes(u.id))
      .filter(u => !needle
        || (u.fullName || '').toLowerCase().includes(needle)
        || (u.email || '').toLowerCase().includes(needle)
        || (u.employeeCode || '').toLowerCase().includes(needle));
  }, [users, value, q]);

  useEffect(() => { setHi(0); }, [q, open]);

  // Đóng gợi ý khi bấm ra ngoài
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQ('');
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const add = (id: string) => {
    onChange([...value, id]);
    setQ('');
    inputRef.current?.focus();
  };
  const remove = (id: string) => onChange(value.filter(v => v !== id));

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHi(i => Math.min(i + 1, candidates.length - 1)); return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHi(i => Math.max(i - 1, 0)); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (candidates[hi]) add(candidates[hi].id);
      return;
    }
    if (e.key === 'Escape') { setOpen(false); setQ(''); return; }
    // Xoá nhanh người vừa thêm khi ô tìm đang trống
    if (e.key === 'Backspace' && q === '' && value.length > 0) {
      remove(value[value.length - 1]);
    }
  };

  if (readOnly) {
    return <AssigneeChips people={selected} emptyText="Chưa giao cho ai" />;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <AssigneeChips people={selected} onRemove={remove} emptyText="Chưa giao cho ai" />
        </div>
        {saving ? (
          <span className="flex-shrink-0 flex items-center gap-1 text-[11px] text-gray-400">
            <Loader2 size={11} className="animate-spin" /> Đang lưu
          </span>
        ) : savedAt ? (
          <span className="flex-shrink-0 flex items-center gap-1 text-[11px] text-green-600">
            <Check size={11} /> Đã lưu
          </span>
        ) : null}
      </div>

      <div ref={boxRef} className="relative">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Tìm và thêm người..."
            className="w-full h-8 pl-7 pr-2 text-sm border border-gray-200 rounded-md bg-white outline-none focus:border-indigo-400"
          />
        </div>

        {open && (
          <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-md shadow-lg max-h-52 overflow-y-auto">
            {candidates.length === 0 ? (
              <p className="px-2.5 py-2 text-xs text-gray-400">
                {users.length === value.length ? 'Đã thêm tất cả nhân viên' : 'Không tìm thấy nhân viên'}
              </p>
            ) : (
              candidates.map((u, i) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => add(u.id)}
                  onMouseEnter={() => setHi(i)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left transition-colors ${
                    i === hi ? 'bg-indigo-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] text-indigo-600 font-semibold">{u.fullName?.charAt(0)}</span>
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm text-gray-800 truncate">{u.fullName}</span>
                    {(u.positionTitle || u.employeeCode) && (
                      <span className="block text-[11px] text-gray-400 truncate">
                        {[u.employeeCode, u.positionTitle].filter(Boolean).join(' • ')}
                      </span>
                    )}
                  </span>
                  <UserPlus size={13} className="flex-shrink-0 text-gray-300" />
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

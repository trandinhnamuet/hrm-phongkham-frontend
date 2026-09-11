'use client';

import { useMemo, useState } from 'react';
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

interface PickerProps {
  users: User[];
  /** Danh sách id đang chọn. */
  value: string[];
  onChange: (ids: string[]) => void;
  /** Hiện ô tìm kiếm khi danh sách dài. */
  searchThreshold?: number;
}

/**
 * Chọn nhiều người được giao.
 *
 * Dùng danh sách checkbox inline thay vì popover: component này nằm trong Dialog
 * của Radix, popover lồng trong portal rất dễ bị che mất.
 */
export function AssigneePicker({ users, value, onChange, searchThreshold = 8 }: PickerProps) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return users;
    return users.filter(u =>
      (u.fullName || '').toLowerCase().includes(needle)
      || (u.email || '').toLowerCase().includes(needle),
    );
  }, [users, q]);

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id]);
  };

  const selectedNames = users.filter(u => value.includes(u.id)).map(u => u.fullName);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-gray-500 truncate">
          {value.length === 0
            ? 'Chưa chọn ai'
            : `${value.length} người: ${selectedNames.join(', ')}`}
        </span>
        {value.length > 0 && (
          <button type="button" onClick={() => onChange([])}
            className="flex-shrink-0 text-[11px] text-gray-400 hover:text-red-500">
            Bỏ chọn hết
          </button>
        )}
      </div>

      {users.length >= searchThreshold && (
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Tìm nhân viên..."
          className="w-full h-8 px-2 text-sm border border-gray-200 rounded-md outline-none focus:border-indigo-400"
        />
      )}

      <div className="border border-gray-200 rounded-md bg-white max-h-36 overflow-y-auto divide-y divide-gray-50">
        {filtered.length === 0 && (
          <p className="px-2 py-2 text-xs text-gray-400">Không tìm thấy nhân viên</p>
        )}
        {filtered.map(u => {
          const checked = value.includes(u.id);
          return (
            <label key={u.id}
              className={`flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer transition-colors ${
                checked ? 'bg-indigo-50/60' : 'hover:bg-gray-50'
              }`}>
              <input type="checkbox" checked={checked} onChange={() => toggle(u.id)}
                className="w-3.5 h-3.5 accent-indigo-500" />
              <span className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] text-indigo-600 font-semibold">{u.fullName?.charAt(0)}</span>
              </span>
              <span className="truncate text-gray-700">{u.fullName}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

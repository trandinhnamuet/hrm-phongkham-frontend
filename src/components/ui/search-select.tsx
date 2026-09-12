'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

export interface SearchOption {
  value: string;
  label: string;
  /** Dòng phụ hiện mờ bên dưới nhãn, ví dụ mã nhân viên hoặc bộ phận. */
  hint?: string;
}

interface Props {
  options: SearchOption[];
  value: string;
  onChange: (value: string) => void;
  /** Hiện khi chưa chọn gì, cũng là mục "bỏ chọn" đầu danh sách. */
  placeholder?: string;
  /** Nhãn của mục bỏ chọn. Để trống thì không cho bỏ chọn. */
  allLabel?: string;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Ô chọn một giá trị có kèm tìm kiếm.
 *
 * Dùng thay cho thẻ select khi danh sách dài: select gốc của trình duyệt không
 * gõ tìm được, phải cuộn tay. Đặt absolute nên không đẩy layout của thanh lọc.
 */
export function SearchSelect({
  options, value, onChange, placeholder = 'Chọn...', allLabel, className = '', size = 'sm',
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find(o => o.value === value);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return options;
    return options.filter(o =>
      o.label.toLowerCase().includes(needle) || (o.hint || '').toLowerCase().includes(needle));
  }, [options, q]);

  useEffect(() => { setHi(0); }, [q, open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false); setQ('');
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const pick = (v: string) => { onChange(v); setOpen(false); setQ(''); };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi(i => Math.min(i + 1, filtered.length - 1)); return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHi(i => Math.max(i - 1, 0)); return; }
    if (e.key === 'Enter')     { e.preventDefault(); if (filtered[hi]) pick(filtered[hi].value); return; }
    if (e.key === 'Escape')    { setOpen(false); setQ(''); }
  };

  const h = size === 'sm' ? 'h-9 sm:h-8 text-sm' : 'h-10 sm:h-9 text-base sm:text-sm';

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full ${h} pl-3 pr-8 flex items-center gap-1.5 bg-white border border-gray-300 rounded-lg
          text-left transition-colors hover:border-gray-400
          ${open ? 'border-indigo-500 ring-2 ring-indigo-500/15' : ''}`}
      >
        <span className={`truncate ${selected ? 'text-gray-900' : 'text-gray-400'}`}>
          {selected ? selected.label : placeholder}
        </span>
        {selected && allLabel && (
          <span
            role="button"
            tabIndex={-1}
            title="Bỏ chọn"
            onClick={e => { e.stopPropagation(); onChange(''); }}
            className="ml-auto flex-shrink-0 text-gray-300 hover:text-red-500 transition-colors"
          >
            <X size={13} />
          </span>
        )}
        <ChevronDown
          size={13}
          className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 min-w-56 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
          <div className="relative border-b border-gray-100">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              ref={inputRef}
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Tìm..."
              className="w-full h-9 pl-7 pr-2 text-sm outline-none"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {allLabel && !q.trim() && (
              <button
                type="button"
                onClick={() => pick('')}
                className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                  value === '' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {allLabel}
              </button>
            )}
            {filtered.length === 0 ? (
              <p className="px-3 py-2.5 text-xs text-gray-400">Không tìm thấy</p>
            ) : filtered.map((o, i) => (
              <button
                key={o.value}
                type="button"
                onClick={() => pick(o.value)}
                onMouseEnter={() => setHi(i)}
                className={`w-full px-3 py-2 text-left transition-colors ${
                  i === hi ? 'bg-indigo-50' : 'hover:bg-gray-50'
                } ${o.value === value ? 'font-medium text-indigo-700' : 'text-gray-700'}`}
              >
                <span className="block text-sm truncate">{o.label}</span>
                {o.hint && <span className="block text-[11px] text-gray-400 truncate">{o.hint}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

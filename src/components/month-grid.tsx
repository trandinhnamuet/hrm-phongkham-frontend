'use client';

import { cn } from '@/lib/utils';

export interface GridRow {
  id: string;
  name: string;
  sub?: string;
}

export interface GridCell {
  /** Chữ ngắn trong ô, 1–3 ký tự. */
  label: string;
  cls: string;
  /** Tooltip khi rê chuột. */
  title?: string;
}

interface Props {
  year: number;
  month: number; // 1-12
  rows: GridRow[];
  /** Trả về null nếu ô trống. */
  cell: (rowId: string, date: string) => GridCell | null;
  legend?: { label: string; cls: string }[];
  emptyText?: string;
}

const WEEKDAY = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function pad(n: number) { return String(n).padStart(2, '0'); }

/**
 * Lưới tháng: cột là từng ngày (kèm thứ), dòng là từng nhân viên.
 * Cột tên nhân viên dính bên trái để cuộn ngang vẫn biết đang xem ai.
 */
export function MonthGrid({ year, month, rows, cell, legend, emptyText = 'Chưa có dữ liệu' }: Props) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  })();

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const date = `${year}-${pad(month)}-${pad(d)}`;
    const dow = new Date(year, month - 1, d).getDay();
    return { d, date, dow, weekend: dow === 0 || dow === 6, today: date === todayStr };
  });

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-0 text-xs" style={{ minWidth: 220 + daysInMonth * 34 }}>
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-gray-50 border-b border-r border-gray-200 px-3 py-2 text-left font-semibold text-gray-600 min-w-[180px]">
                Nhân viên
              </th>
              {days.map(x => (
                <th
                  key={x.d}
                  className={cn(
                    'border-b border-gray-200 px-0 py-1.5 text-center font-medium min-w-[34px]',
                    x.weekend ? 'bg-gray-100 text-gray-400' : 'bg-gray-50 text-gray-600',
                    x.today && 'bg-indigo-50 text-indigo-700',
                  )}
                  title={x.date}
                >
                  <span className="block text-[10px] leading-none">{WEEKDAY[x.dow]}</span>
                  <span className={cn('block leading-tight mt-0.5', x.today && 'font-bold')}>{x.d}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={daysInMonth + 1} className="py-10 text-center text-sm text-gray-400">{emptyText}</td>
              </tr>
            )}
            {rows.map((r, ri) => (
              <tr key={r.id} className="group">
                <td className={cn(
                  'sticky left-0 z-10 border-b border-r border-gray-200 px-3 py-1.5 whitespace-nowrap group-hover:bg-gray-50',
                  ri % 2 ? 'bg-gray-50/40' : 'bg-white',
                )}>
                  <span className="block text-[13px] font-medium text-gray-900 truncate max-w-[200px]">{r.name}</span>
                  {r.sub && <span className="block text-[10px] text-gray-400 truncate">{r.sub}</span>}
                </td>
                {days.map(x => {
                  const c = cell(r.id, x.date);
                  return (
                    <td
                      key={x.d}
                      title={c?.title || x.date}
                      className={cn(
                        'border-b border-gray-100 p-0.5 text-center group-hover:bg-gray-50',
                        x.weekend && !c && 'bg-gray-50/70',
                        x.today && 'bg-indigo-50/40',
                      )}
                    >
                      {c && (
                        <span className={cn(
                          'inline-flex items-center justify-center w-7 h-7 rounded-md text-[10px] font-semibold',
                          c.cls,
                        )}>
                          {c.label}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {legend && legend.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 px-1">
          {legend.map(l => (
            <span key={l.label} className="inline-flex items-center gap-1.5 text-[11px] text-gray-500">
              <span className={cn('w-3.5 h-3.5 rounded', l.cls)} />
              {l.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

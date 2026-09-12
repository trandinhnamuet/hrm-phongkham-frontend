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

/* Bề rộng ô ngày: mobile hẹp để thấy được nhiều ngày hơn, desktop rộng hơn chút.
   minWidth của bảng tính theo cỡ mobile, còn table w-full nên trên desktop bảng
   tự giãn cho vừa khung — hết cuộn ngang. */
const NAME_W_MOBILE = 92;
const CELL_W_MOBILE = 21;

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
    // Theo lối lịch Việt: chủ nhật đỏ, thứ 7 xanh — nhìn là tách được ngay
    // cuối tuần khỏi ngày làm việc mà không cần đếm.
    return {
      d, date, dow,
      sun: dow === 0,
      sat: dow === 6,
      weekend: dow === 0 || dow === 6,
      today: date === todayStr,
    };
  });

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table
          className="w-full border-separate border-spacing-0 text-xs"
          style={{ minWidth: NAME_W_MOBILE + daysInMonth * CELL_W_MOBILE }}
        >
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-gray-50 border-b border-r border-gray-200 px-2 py-2 text-left font-semibold text-gray-600 w-[92px] sm:w-[130px] min-w-[92px] sm:min-w-[130px]">
                Nhân viên
              </th>
              {days.map(x => (
                <th
                  key={x.d}
                  className={cn(
                    'border-b border-gray-200 px-0 py-1 text-center font-medium min-w-[21px] sm:min-w-[26px]',
                    x.sun ? 'bg-rose-100 text-rose-700'
                      : x.sat ? 'bg-sky-100 text-sky-700'
                      : 'bg-gray-50 text-gray-600',
                    // Hôm nay quan trọng hơn cuối tuần nên đặt sau để thắng
                    x.today && 'bg-indigo-100 text-indigo-700',
                  )}
                  title={x.date}
                >
                  <span className={cn(
                    'block text-[9px] leading-none',
                    x.weekend ? 'opacity-80' : 'text-gray-400',
                  )}>
                    {WEEKDAY[x.dow]}
                  </span>
                  <span className={cn('block text-[11px] leading-tight mt-0.5', x.today && 'font-bold')}>{x.d}</span>
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
                <td
                  title={r.sub ? `${r.name} · ${r.sub}` : r.name}
                  className={cn(
                    'sticky left-0 z-10 border-b border-r border-gray-200 px-2 py-1 group-hover:bg-gray-50',
                    ri % 2 ? 'bg-gray-50/40' : 'bg-white',
                  )}
                >
                  {/* Cột hẹp nên tên dài bị cắt, rê chuột xem đầy đủ ở title */}
                  <span className="block text-[12px] font-medium text-gray-900 truncate">{r.name}</span>
                  {r.sub && <span className="hidden sm:block text-[10px] text-gray-400 truncate">{r.sub}</span>}
                </td>
                {days.map(x => {
                  const c = cell(r.id, x.date);
                  return (
                    <td
                      key={x.d}
                      title={c?.title || x.date}
                      className={cn(
                        'border-b border-gray-100 p-0.5 text-center',
                        // Tô cả cột kể cả ô có dữ liệu, nếu không cột cuối tuần
                        // bị đứt quãng ở đúng những ngày có chấm công.
                        x.sun ? 'bg-rose-50/70' : x.sat ? 'bg-sky-50/70' : '',
                        x.today && 'bg-indigo-50/60',
                        'group-hover:brightness-[0.97]',
                      )}
                    >
                      {c && (
                        <span className={cn(
                          'inline-flex items-center justify-center w-[19px] h-[19px] sm:w-6 sm:h-6 rounded text-[10px] font-semibold',
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

      <div className="flex flex-wrap gap-x-3 gap-y-1.5 px-1">
        {(legend ?? []).map(l => (
          <span key={l.label} className="inline-flex items-center gap-1.5 text-[11px] text-gray-500">
            <span className={cn('w-3.5 h-3.5 rounded', l.cls)} />
            {l.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-500">
          <span className="w-3.5 h-3.5 rounded bg-sky-100" /> Thứ 7
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-500">
          <span className="w-3.5 h-3.5 rounded bg-rose-100" /> Chủ nhật
        </span>
      </div>
    </div>
  );
}

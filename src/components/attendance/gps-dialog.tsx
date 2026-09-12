'use client';

import { MapPin, ShieldAlert, LocateFixed, RefreshCw, X } from 'lucide-react';
import { GpsFailReason, gpsHelpSteps } from '@/lib/geolocation';

interface Props {
  open: boolean;
  onClose: () => void;
  /** null = đang ở bước xin quyền, chưa hỏng gì. */
  reason: GpsFailReason | null;
  busy?: boolean;
  /** Bấm nút chính: xin quyền hoặc thử lại. */
  onAction: () => void;
}

/**
 * Hướng dẫn bật GPS / cấp quyền, thay cho việc chỉ hiện một dòng lỗi rồi thôi.
 *
 * Quan trọng: khi quyền đã bị chặn thì trình duyệt KHÔNG cho hỏi lại bằng mã —
 * gọi getCurrentPosition sẽ lỗi ngay mà không hiện hộp thoại nào. Lúc đó chỉ còn
 * cách chỉ người dùng vào cài đặt trang, nên phần hướng dẫn phải theo từng máy.
 */
export function GpsDialog({ open, onClose, reason, busy, onAction }: Props) {
  if (!open) return null;

  const asking = reason === null || reason === 'prompt';
  const help = asking
    ? {
        title: 'Cần quyền truy cập vị trí',
        steps: [
          'Bấm "Cho phép truy cập vị trí" bên dưới',
          'Trình duyệt sẽ hiện hộp xin quyền — chọn "Cho phép"',
          'Hệ thống dùng vị trí chỉ để xác nhận bạn có mặt ở phòng khám',
        ],
      }
    : gpsHelpSteps(reason);

  const Icon = asking ? LocateFixed : reason === 'denied' ? ShieldAlert : MapPin;
  const canRetry = asking || reason !== 'denied';

  return (
    <div
      className="fixed inset-0 z-[70] bg-slate-900/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              asking ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'
            }`}>
              <Icon size={19} />
            </span>
            <h3 className="text-[15px] font-semibold text-gray-900">{help.title}</h3>
          </div>
          <button onClick={onClose} className="icon-btn -mr-1 -mt-1"><X size={16} /></button>
        </div>

        <ol className="mt-4 space-y-2.5">
          {help.steps.map((s, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-[11px] font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span className="text-sm text-gray-700 leading-snug">{s}</span>
            </li>
          ))}
        </ol>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="btn btn-secondary flex-1">Để sau</button>
          {canRetry && (
            <button onClick={onAction} disabled={busy} className="btn btn-primary flex-1">
              {busy
                ? <><RefreshCw size={14} className="animate-spin" /> Đang lấy vị trí…</>
                : asking
                  ? <><LocateFixed size={14} /> Cho phép truy cập vị trí</>
                  : <><RefreshCw size={14} /> Thử lại</>}
            </button>
          )}
          {!canRetry && (
            <button onClick={() => window.location.reload()} className="btn btn-primary flex-1">
              <RefreshCw size={14} /> Tải lại trang
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Download, Share, Plus, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as any).standalone === true;
}

function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    // iPadOS 13+ báo user agent giống máy Mac
    || (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1);
}

/**
 * Nút cài app về màn hình chính.
 *
 * Chrome/Edge/Android: dùng sự kiện beforeinstallprompt, bấm là hiện hộp cài của
 * hệ thống. Safari trên iOS không có sự kiện đó nên chỉ hướng dẫn bằng tay.
 * Đang chạy dạng app rồi thì ẩn hẳn.
 */
export function InstallButton({ className = '' }: { className?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(true); // mặc định ẩn tới khi biết chắc
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;
  // Ngoài iOS mà trình duyệt chưa bắn sự kiện thì chưa đủ điều kiện cài, ẩn cho gọn.
  if (!deferred && !isIOS()) return null;

  const click = async () => {
    if (deferred) {
      await deferred.prompt();
      const res = await deferred.userChoice;
      if (res.outcome === 'accepted') setInstalled(true);
      setDeferred(null);
      return;
    }
    setShowIosHelp(true);
  };

  return (
    <>
      <button
        onClick={click}
        title="Cài app về màn hình chính"
        className={`btn btn-sm btn-secondary text-indigo-600 border-indigo-200 hover:bg-indigo-50 ${className}`}
      >
        <Download size={14} />
        <span className="hidden xs:inline sm:inline">Cài app</span>
      </button>

      {showIosHelp && (
        <div
          className="fixed inset-0 z-[60] bg-slate-900/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowIosHelp(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="text-[15px] font-semibold text-gray-900">Cài app trên iPhone / iPad</h3>
              <button onClick={() => setShowIosHelp(false)} className="icon-btn -mr-1 -mt-1">
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Safari không có nút cài tự động, làm theo 2 bước sau:
            </p>
            <ol className="space-y-3">
              <li className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold flex items-center justify-center flex-shrink-0">1</span>
                <span className="text-sm text-gray-700 flex items-center gap-1.5">
                  Bấm nút <Share size={15} className="text-indigo-600" /> <b>Chia sẻ</b> ở thanh dưới
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold flex items-center justify-center flex-shrink-0">2</span>
                <span className="text-sm text-gray-700 flex items-center gap-1.5">
                  Chọn <Plus size={15} className="text-indigo-600" /> <b>Thêm vào MH chính</b>
                </span>
              </li>
            </ol>
            <button onClick={() => setShowIosHelp(false)} className="btn btn-primary w-full mt-5">
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** Vì sao không lấy được vị trí — mỗi lý do cần một cách xử lý khác nhau. */
export type GpsFailReason =
  /** Trình duyệt không có API định vị. */
  | 'unsupported'
  /** Trang không chạy trên HTTPS nên trình duyệt chặn định vị. */
  | 'insecure'
  /** Người dùng đã từ chối quyền — phải tự bật lại trong cài đặt. */
  | 'denied'
  /** Chưa hỏi quyền lần nào — bấm là hiện hộp xin quyền của hệ thống. */
  | 'prompt'
  /** Có quyền nhưng máy không định vị được: thường do tắt Vị trí / GPS. */
  | 'unavailable'
  /** Quá lâu không có tín hiệu. */
  | 'timeout';

export interface GpsPosition { lat: number; lng: number; accuracy: number }

export type GpsResult =
  | { ok: true; pos: GpsPosition }
  | { ok: false; reason: GpsFailReason; message: string };

/**
 * Trạng thái quyền định vị, đọc trước khi gọi để biết nên hướng dẫn kiểu nào.
 * Safari cũ không có Permissions API cho geolocation nên trả 'unknown'.
 */
export async function getGpsPermission(): Promise<PermissionState | 'unknown'> {
  try {
    if (!navigator.permissions?.query) return 'unknown';
    const st = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return st.state;
  } catch {
    return 'unknown';
  }
}

/**
 * Lấy vị trí hiện tại.
 *
 * Gọi getCurrentPosition chính là thứ làm trình duyệt bật hộp xin quyền, nên
 * hàm này vừa là "xin quyền" vừa là "lấy toạ độ" — không tách được thành hai bước.
 */
export function getPosition(timeoutMs = 15000): Promise<GpsResult> {
  return new Promise(resolve => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ ok: false, reason: 'unsupported', message: 'Thiết bị hoặc trình duyệt không hỗ trợ định vị.' });
      return;
    }
    // Trình duyệt chỉ cho định vị trên HTTPS (localhost là ngoại lệ).
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      resolve({ ok: false, reason: 'insecure', message: 'Trang phải chạy trên HTTPS mới dùng được định vị.' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      p => resolve({
        ok: true,
        pos: { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy },
      }),
      err => {
        if (err.code === err.PERMISSION_DENIED) {
          resolve({ ok: false, reason: 'denied', message: 'Bạn đã chặn quyền vị trí cho trang này.' });
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          resolve({ ok: false, reason: 'unavailable', message: 'Không bắt được tín hiệu vị trí. Kiểm tra xem đã bật Vị trí (GPS) chưa.' });
        } else {
          resolve({ ok: false, reason: 'timeout', message: 'Quá lâu không lấy được vị trí. Thử lại ở nơi thoáng hơn.' });
        }
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    );
  });
}

/** Nhận diện nền tảng để hướng dẫn đúng đường dẫn cài đặt. */
export function detectPlatform(): 'ios' | 'android' | 'desktop' {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}

/** Các bước người dùng cần làm, tuỳ lý do hỏng và tuỳ máy. */
export function gpsHelpSteps(reason: GpsFailReason): { title: string; steps: string[] } {
  const platform = detectPlatform();

  if (reason === 'unavailable') {
    const steps = platform === 'ios'
      ? ['Mở Cài đặt → Quyền riêng tư & Bảo mật → Dịch vụ định vị', 'Bật "Dịch vụ định vị"', 'Kéo xuống tìm Safari, chọn "Khi dùng ứng dụng"', 'Quay lại trang và bấm Thử lại']
      : platform === 'android'
        ? ['Vuốt thanh thông báo xuống, bật biểu tượng "Vị trí"', 'Hoặc vào Cài đặt → Vị trí → Bật', 'Quay lại trang và bấm Thử lại']
        : ['Bật dịch vụ định vị của hệ điều hành', 'Windows: Cài đặt → Quyền riêng tư → Vị trí → Bật', 'Quay lại trang và bấm Thử lại'];
    return { title: 'Vị trí (GPS) đang tắt', steps };
  }

  if (reason === 'denied') {
    const steps = platform === 'ios'
      ? ['Bấm biểu tượng "aA" ở thanh địa chỉ Safari', 'Chọn "Cài đặt trang web" → Vị trí → Cho phép', 'Tải lại trang rồi bấm Chấm công lại']
      : platform === 'android'
        ? ['Bấm biểu tượng ổ khoá ở thanh địa chỉ', 'Chọn Quyền → Vị trí → Cho phép', 'Tải lại trang rồi bấm Chấm công lại']
        : ['Bấm biểu tượng ổ khoá bên trái thanh địa chỉ', 'Đổi mục "Vị trí" thành "Cho phép"', 'Tải lại trang rồi bấm Chấm công lại'];
    return { title: 'Quyền vị trí đang bị chặn', steps };
  }

  if (reason === 'insecure') {
    return { title: 'Trang không chạy trên HTTPS', steps: ['Mở trang bằng địa chỉ bắt đầu bằng https://', 'Nếu vẫn lỗi, báo quản trị hệ thống'] };
  }

  if (reason === 'unsupported') {
    return { title: 'Trình duyệt không hỗ trợ định vị', steps: ['Dùng Chrome hoặc Safari bản mới', 'Không dùng trình duyệt trong Facebook / Zalo'] };
  }

  return {
    title: 'Chưa lấy được vị trí',
    steps: ['Ra chỗ thoáng, gần cửa sổ để bắt tín hiệu tốt hơn', 'Kiểm tra đã bật Vị trí (GPS) chưa', 'Bấm Thử lại'],
  };
}

'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { useAuth } from '@/contexts/auth-context';
import api from '@/lib/api';
import { User, Camera, KeyRound, Save, CheckCircle, Sun, Moon } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '@/contexts/theme-context';

const ROLE_LABEL: Record<string, string> = {
  GIAM_DOC: 'Giám đốc',
  QUAN_LY: 'Quản lý',
  NHAN_VIEN: 'Nhân viên',
};

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();

  if (!user) return null;

  return (
    <div className="flex flex-col h-full overflow-auto">
      <PageHeader title="Hồ sơ cá nhân" description="Thông tin tài khoản của bạn" />
      <div className="flex-1 p-6 space-y-5 max-w-2xl">
        <AvatarSection user={user} onRefresh={refreshUser} />
        <InfoSection user={user} onRefresh={refreshUser} />
        <PasswordSection userId={user.id} />
        <ThemeSection />
      </div>
    </div>
  );
}

function AvatarSection({ user, onRefresh }: { user: any; onRefresh: () => Promise<void> }) {
  const [url, setUrl] = useState(user.avatarUrl || '');
  const [editing, setEditing] = useState(false);

  const save = useMutation({
    mutationFn: () => api.patch(`/users/${user.id}`, { avatarUrl: url }),
    onSuccess: async () => {
      await onRefresh();
      setEditing(false);
      toast.success('Đã cập nhật ảnh đại diện');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi cập nhật'),
  });

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center gap-5">
        {/* Avatar preview */}
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden border-2 border-indigo-200">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-20 h-20 object-cover" />
            ) : (
              <span className="text-indigo-600 text-2xl font-semibold">
                {user.fullName?.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <button
            onClick={() => setEditing(true)}
            className="absolute -bottom-1 -right-1 w-7 h-7 bg-indigo-500 text-white rounded-full flex items-center justify-center hover:bg-indigo-600 transition-colors shadow"
          >
            <Camera size={13} />
          </button>
        </div>

        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">{user.fullName}</p>
          <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
          <span className="inline-block mt-2 text-[11px] font-medium px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
            {ROLE_LABEL[user.role] || user.role}
          </span>
        </div>
      </div>

      {editing && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <label className="text-xs font-medium text-gray-700 block mb-1.5">
            URL ảnh đại diện
          </label>
          <div className="flex gap-2">
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              className="flex-1 h-9 px-3 text-sm border border-gray-200 rounded-md outline-none focus:border-indigo-400"
            />
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="flex items-center gap-1.5 h-9 px-3 bg-indigo-500 text-white text-sm rounded-md hover:bg-indigo-600 disabled:opacity-60"
            >
              <Save size={13} />
              {save.isPending ? '...' : 'Lưu'}
            </button>
            <button
              onClick={() => { setUrl(user.avatarUrl || ''); setEditing(false); }}
              className="h-9 px-3 text-sm border border-gray-200 rounded-md hover:bg-gray-50"
            >
              Hủy
            </button>
          </div>
          {url && (
            <div className="mt-3">
              <p className="text-[11px] text-gray-400 mb-1">Xem trước:</p>
              <img
                src={url}
                alt="preview"
                className="w-16 h-16 rounded-full object-cover border border-gray-200"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function InfoSection({ user, onRefresh }: { user: any; onRefresh: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    fullName: user.fullName || '',
    phone: user.phone || '',
  });

  const save = useMutation({
    mutationFn: () => api.patch(`/users/${user.id}`, form),
    onSuccess: async () => {
      await onRefresh();
      setEditing(false);
      toast.success('Đã cập nhật thông tin');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi cập nhật'),
  });

  return (
    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <User size={15} className="text-indigo-500" />
          <h2 className="text-sm font-semibold text-gray-900">Thông tin cá nhân</h2>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs px-3 h-7 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 text-gray-600"
          >
            Chỉnh sửa
          </button>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Read-only fields */}
        <div className="grid grid-cols-2 gap-4">
          <InfoField label="Mã nhân viên" value={user.employeeCode} />
          <InfoField label="Vai trò" value={ROLE_LABEL[user.role] || user.role} />
          <InfoField label="Chức vụ" value={user.positionTitle || '—'} />
          <InfoField label="Ngày vào làm" value={user.joinDate
            ? new Date(user.joinDate).toLocaleDateString('vi-VN')
            : '—'} />
          <InfoField label="Email" value={user.email} className="col-span-2" />
        </div>

        {editing ? (
          <div className="pt-3 border-t border-gray-100 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1.5">Họ và tên</label>
              <input
                value={form.fullName}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                className="w-full h-9 px-3 text-sm border border-gray-200 rounded-md outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1.5">Số điện thoại</label>
              <input
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="0901234567"
                className="w-full h-9 px-3 text-sm border border-gray-200 rounded-md outline-none focus:border-indigo-400"
              />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => { setForm({ fullName: user.fullName, phone: user.phone || '' }); setEditing(false); }}
                className="h-8 px-4 text-sm border border-gray-200 rounded-md hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={() => save.mutate()}
                disabled={save.isPending}
                className="flex items-center gap-1.5 h-8 px-4 text-sm bg-indigo-500 text-white rounded-md hover:bg-indigo-600 disabled:opacity-60"
              >
                <Save size={13} />
                {save.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function PasswordSection({ userId }: { userId: string }) {
  const [form, setForm] = useState({ newPassword: '', confirm: '' });
  const [done, setDone] = useState(false);

  const save = useMutation({
    mutationFn: () => api.patch(`/users/${userId}/password`, { newPassword: form.newPassword }),
    onSuccess: () => {
      setForm({ newPassword: '', confirm: '' });
      setDone(true);
      setTimeout(() => setDone(false), 3000);
      toast.success('Đã đổi mật khẩu');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi đổi mật khẩu'),
  });

  const mismatch = form.confirm && form.newPassword !== form.confirm;
  const canSubmit = form.newPassword.length >= 6 && form.newPassword === form.confirm;

  return (
    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
        <KeyRound size={15} className="text-indigo-500" />
        <h2 className="text-sm font-semibold text-gray-900">Đổi mật khẩu</h2>
      </div>
      <div className="p-5 space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1.5">Mật khẩu mới</label>
          <input
            type="password"
            value={form.newPassword}
            onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
            placeholder="Tối thiểu 6 ký tự"
            className="w-full h-9 px-3 text-sm border border-gray-200 rounded-md outline-none focus:border-indigo-400"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1.5">Xác nhận mật khẩu</label>
          <input
            type="password"
            value={form.confirm}
            onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
            placeholder="Nhập lại mật khẩu mới"
            className={`w-full h-9 px-3 text-sm border rounded-md outline-none focus:border-indigo-400 ${
              mismatch ? 'border-red-300 bg-red-50' : 'border-gray-200'
            }`}
          />
          {mismatch && <p className="text-xs text-red-500 mt-1">Mật khẩu không khớp</p>}
        </div>
        <div className="flex items-center justify-end gap-3 pt-1">
          {done && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle size={12} /> Đã đổi thành công
            </span>
          )}
          <button
            onClick={() => save.mutate()}
            disabled={!canSubmit || save.isPending}
            className="flex items-center gap-1.5 h-8 px-4 text-sm bg-indigo-500 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50"
          >
            <KeyRound size={13} />
            {save.isPending ? 'Đang lưu...' : 'Đổi mật khẩu'}
          </button>
        </div>
      </div>
    </section>
  );
}

function ThemeSection() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden dark:bg-gray-800 dark:border-gray-700">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        {isDark ? <Moon size={15} className="text-indigo-400" /> : <Sun size={15} className="text-indigo-500" />}
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Giao diện</h2>
      </div>
      <div className="p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Chế độ hiển thị</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {isDark ? 'Đang dùng chế độ tối' : 'Đang dùng chế độ sáng'}
          </p>
        </div>
        <button
          onClick={toggleTheme}
          className={`relative inline-flex h-7 w-13 items-center rounded-full transition-colors duration-200 focus-visible:outline-none ${isDark ? 'bg-indigo-500' : 'bg-gray-300'}`}
          role="switch"
          aria-checked={isDark}
        >
          <span className={`inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow transition-transform duration-200 ${isDark ? 'translate-x-7' : 'translate-x-1'}`}>
            {isDark ? <Moon size={10} className="text-indigo-500" /> : <Sun size={10} className="text-amber-500" />}
          </span>
        </button>
      </div>
    </section>
  );
}

function InfoField({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-gray-800">{value}</p>
    </div>
  );
}

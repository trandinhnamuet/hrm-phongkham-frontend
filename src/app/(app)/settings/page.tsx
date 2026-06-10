'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { useAuth } from '@/contexts/auth-context';
import api from '@/lib/api';
import { MapPin, Clock, Save, CheckCircle, Building2, Pencil, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Department } from '@/types';

interface ClinicSettings {
  id?: number;
  clinicName: string;
  gpsLat: number;
  gpsLng: number;
  gpsRadiusM: number;
}

interface Shift {
  id: number;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  graceMinutes: number;
  isActive: boolean;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  if (user?.role !== 'GIAM_DOC') {
    return (
      <div className="flex flex-col h-full overflow-auto">
        <PageHeader title="Cài đặt" />
        <div className="flex items-center justify-center flex-1 text-sm text-gray-400">
          Chỉ Quản lý chung mới có quyền truy cập trang này.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <PageHeader title="Cài đặt hệ thống" description="Cấu hình phòng khám và ca làm việc" />
      <div className="flex-1 p-6 space-y-6 max-w-3xl">
        <ClinicSettingsSection qc={qc} />
        <ShiftsSection qc={qc} />
        <DepartmentsSection qc={qc} />
      </div>
    </div>
  );
}

function ClinicSettingsSection({ qc }: { qc: any }) {
  const { data } = useQuery<ClinicSettings>({
    queryKey: ['clinic-settings'],
    queryFn: () => api.get('/attendance/settings').then(r => r.data),
  });

  const [form, setForm] = useState<ClinicSettings>({
    clinicName: '', gpsLat: 0, gpsLng: 0, gpsRadiusM: 100,
  });
  const [loaded, setLoaded] = useState(false);

  if (data && !loaded) {
    setForm({
      clinicName: data.clinicName || '',
      gpsLat: Number(data.gpsLat) || 0,
      gpsLng: Number(data.gpsLng) || 0,
      gpsRadiusM: data.gpsRadiusM || 100,
    });
    setLoaded(true);
  }

  const save = useMutation({
    mutationFn: () => api.patch('/attendance/settings', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clinic-settings'] });
      toast.success('Đã lưu cài đặt phòng khám');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi lưu cài đặt'),
  });

  const detectGps = () => {
    if (!navigator.geolocation) return toast.error('Trình duyệt không hỗ trợ GPS');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({ ...f, gpsLat: pos.coords.latitude, gpsLng: pos.coords.longitude }));
        toast.success('Đã lấy tọa độ vị trí hiện tại');
      },
      () => toast.error('Không lấy được vị trí GPS'),
      { enableHighAccuracy: true },
    );
  };

  return (
    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
        <MapPin size={16} className="text-indigo-500" />
        <h2 className="text-sm font-semibold text-gray-900">Thông tin phòng khám & GPS</h2>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1.5">Tên phòng khám</label>
          <input
            value={form.clinicName}
            onChange={e => setForm(f => ({ ...f, clinicName: e.target.value }))}
            className="w-full h-9 px-3 text-sm border border-gray-200 rounded-md outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10"
            placeholder="Phòng Khám Nha Khoa..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1.5">Vĩ độ (Latitude)</label>
            <input
              type="number"
              step="0.000001"
              value={form.gpsLat}
              onChange={e => setForm(f => ({ ...f, gpsLat: +e.target.value }))}
              className="w-full h-9 px-3 text-sm border border-gray-200 rounded-md outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1.5">Kinh độ (Longitude)</label>
            <input
              type="number"
              step="0.000001"
              value={form.gpsLng}
              onChange={e => setForm(f => ({ ...f, gpsLng: +e.target.value }))}
              className="w-full h-9 px-3 text-sm border border-gray-200 rounded-md outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10"
            />
          </div>
        </div>

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-700 block mb-1.5">
              Bán kính chấm công (mét)
            </label>
            <input
              type="number"
              min={10}
              max={1000}
              value={form.gpsRadiusM}
              onChange={e => setForm(f => ({ ...f, gpsRadiusM: +e.target.value }))}
              className="w-full h-9 px-3 text-sm border border-gray-200 rounded-md outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10"
            />
            <p className="text-xs text-gray-400 mt-1">
              Nhân viên phải trong phạm vi {form.gpsRadiusM}m mới được chấm công.
            </p>
          </div>
          <button
            onClick={detectGps}
            className="h-9 px-3 text-sm text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors whitespace-nowrap"
          >
            📍 Lấy tọa độ hiện tại
          </button>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="flex items-center gap-1.5 h-9 px-4 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-60"
          >
            <Save size={14} />
            {save.isPending ? 'Đang lưu...' : 'Lưu cài đặt'}
          </button>
        </div>
      </div>
    </section>
  );
}

function ShiftsSection({ qc }: { qc: any }) {
  const [showNew, setShowNew] = useState(false);
  const [newShift, setNewShift] = useState({
    code: '', name: '', startTime: '08:00', endTime: '17:00', breakMinutes: 0, graceMinutes: 5,
  });

  const { data: shifts = [] } = useQuery<Shift[]>({
    queryKey: ['shifts'],
    queryFn: () => api.get('/attendance/shifts').then(r => r.data),
  });

  const createShift = useMutation({
    mutationFn: (data: any) => api.post('/attendance/shifts', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts'] });
      setShowNew(false);
      setNewShift({ code: '', name: '', startTime: '08:00', endTime: '17:00', breakMinutes: 0, graceMinutes: 5 });
      toast.success('Đã tạo ca làm việc');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi tạo ca'),
  });

  return (
    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <Clock size={16} className="text-indigo-500" />
          <h2 className="text-sm font-semibold text-gray-900">Ca làm việc</h2>
        </div>
        <button
          onClick={() => setShowNew(s => !s)}
          className="text-xs px-3 h-7 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-md hover:bg-indigo-100 transition-colors"
        >
          + Thêm ca
        </button>
      </div>

      {/* Add shift form */}
      {showNew && (
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
          <p className="text-xs font-medium text-gray-700 mb-3">Ca mới</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-600 block mb-1">Mã ca</label>
              <input
                value={newShift.code}
                onChange={e => setNewShift(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="CA_SANG"
                className="w-full h-8 px-2 text-sm border border-gray-200 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">Tên ca</label>
              <input
                value={newShift.name}
                onChange={e => setNewShift(f => ({ ...f, name: e.target.value }))}
                placeholder="Ca sáng"
                className="w-full h-8 px-2 text-sm border border-gray-200 rounded-md"
              />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-600 block mb-1">Giờ bắt đầu</label>
              <input
                type="time"
                value={newShift.startTime}
                onChange={e => setNewShift(f => ({ ...f, startTime: e.target.value }))}
                className="w-full h-8 px-2 text-sm border border-gray-200 rounded-md"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">Giờ kết thúc</label>
              <input
                type="time"
                value={newShift.endTime}
                onChange={e => setNewShift(f => ({ ...f, endTime: e.target.value }))}
                className="w-full h-8 px-2 text-sm border border-gray-200 rounded-md"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">Nghỉ giữa ca (phút)</label>
              <input
                type="number"
                min={0}
                value={newShift.breakMinutes}
                onChange={e => setNewShift(f => ({ ...f, breakMinutes: +e.target.value }))}
                className="w-full h-8 px-2 text-sm border border-gray-200 rounded-md"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">Gia hạn trễ (phút)</label>
              <input
                type="number"
                min={0}
                value={newShift.graceMinutes}
                onChange={e => setNewShift(f => ({ ...f, graceMinutes: +e.target.value }))}
                className="w-full h-8 px-2 text-sm border border-gray-200 rounded-md"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowNew(false)}
              className="h-7 px-3 text-xs border border-gray-200 rounded-md hover:bg-gray-100"
            >
              Hủy
            </button>
            <button
              onClick={() => createShift.mutate(newShift)}
              disabled={!newShift.code || !newShift.name || createShift.isPending}
              className="h-7 px-3 text-xs bg-indigo-500 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50"
            >
              Tạo ca
            </button>
          </div>
        </div>
      )}

      {/* Shift list */}
      <div className="divide-y divide-gray-50">
        {shifts.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-sm text-gray-400">
            Chưa có ca làm việc nào
          </div>
        ) : shifts.map((shift) => (
          <div key={shift.id} className="flex items-center px-5 py-3.5 hover:bg-gray-50 transition-colors">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{shift.name}</span>
                <span className="text-[11px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                  {shift.code}
                </span>
                {shift.isActive ? (
                  <span className="flex items-center gap-0.5 text-[11px] text-green-600">
                    <CheckCircle size={11} /> Đang dùng
                  </span>
                ) : (
                  <span className="text-[11px] text-gray-400">Không dùng</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {shift.startTime} — {shift.endTime}
                {shift.breakMinutes > 0 && ` · Nghỉ ${shift.breakMinutes} phút`}
                {shift.graceMinutes > 0 && ` · Gia hạn ${shift.graceMinutes} phút`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DepartmentsSection({ qc }: { qc: any }) {
  const [showNew, setShowNew] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments').then(r => r.data),
  });

  const createDept = useMutation({
    mutationFn: (data: any) => api.post('/departments', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] });
      setShowNew(false);
      setForm({ name: '', description: '' });
      toast.success('Đã thêm bộ phận');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi tạo bộ phận'),
  });

  const updateDept = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.patch(`/departments/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] });
      setEditDept(null);
      toast.success('Đã cập nhật bộ phận');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi cập nhật'),
  });

  const deleteDept = useMutation({
    mutationFn: (id: number) => api.delete(`/departments/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Đã xóa bộ phận');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi xóa bộ phận'),
  });

  return (
    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <Building2 size={16} className="text-indigo-500" />
          <h2 className="text-sm font-semibold text-gray-900">Bộ phận</h2>
        </div>
        <button
          onClick={() => { setShowNew(s => !s); setEditDept(null); setForm({ name: '', description: '' }); }}
          className="text-xs px-3 h-7 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-md hover:bg-indigo-100 transition-colors flex items-center gap-1"
        >
          <Plus size={12} /> Thêm bộ phận
        </button>
      </div>

      {showNew && (
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 space-y-3">
          <p className="text-xs font-medium text-gray-700">Bộ phận mới</p>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Tên bộ phận *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Bộ phận Kế toán" className="w-full h-8 px-2 text-sm border border-gray-200 rounded-md" />
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Mô tả</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Mô tả ngắn..." className="w-full h-8 px-2 text-sm border border-gray-200 rounded-md" />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowNew(false)} className="h-7 px-3 text-xs border border-gray-200 rounded-md hover:bg-gray-100">Hủy</button>
            <button
              onClick={() => createDept.mutate(form)}
              disabled={!form.name || createDept.isPending}
              className="h-7 px-3 text-xs bg-indigo-500 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50"
            >
              Thêm
            </button>
          </div>
        </div>
      )}

      <div className="divide-y divide-gray-50">
        {departments.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400">Chưa có bộ phận nào</div>
        ) : departments.map(dept => (
          <div key={dept.id} className="px-5 py-3.5">
            {editDept?.id === dept.id ? (
              <div className="space-y-2">
                <input value={editDept.name}
                  onChange={e => setEditDept(d => d ? ({ ...d, name: e.target.value }) : d)}
                  placeholder="Tên bộ phận" className="w-full h-8 px-2 text-sm border border-gray-200 rounded-md" />
                <input value={editDept.description || ''}
                  onChange={e => setEditDept(d => d ? ({ ...d, description: e.target.value }) : d)}
                  placeholder="Mô tả..." className="w-full h-8 px-2 text-sm border border-gray-200 rounded-md" />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditDept(null)} className="h-7 px-3 text-xs border border-gray-200 rounded-md hover:bg-gray-100">Hủy</button>
                  <button
                    onClick={() => updateDept.mutate({ id: dept.id, data: { name: editDept.name, description: editDept.description } })}
                    disabled={updateDept.isPending}
                    className="h-7 px-3 text-xs bg-indigo-500 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50"
                  >
                    Lưu
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{dept.name}</span>
                    <span className="text-[11px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{dept.code}</span>
                    {!dept.isActive && <span className="text-[11px] text-red-400">Đã vô hiệu</span>}
                  </div>
                  {dept.description && <p className="text-xs text-gray-400 mt-0.5">{dept.description}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditDept(dept)}
                    className="p-1.5 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => deleteDept.mutate(dept.id)} disabled={deleteDept.isPending}
                    className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

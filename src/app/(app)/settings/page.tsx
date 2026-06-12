'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { useAuth } from '@/contexts/auth-context';
import api from '@/lib/api';
import { MapPin, Clock, Building2, Pencil, Trash2, Plus, CalendarOff, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Department } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/* ─── Types ──────────────────────────────────────────────── */
interface ClinicSettings { id?: number; clinicName: string; gpsLat: number; gpsLng: number; gpsRadiusM: number }
interface Shift { id: number; code: string; name: string; startTime: string; endTime: string; breakMinutes: number; graceMinutes: number; isActive: boolean }
interface LeaveType { id: number; code: string; name: string; deductsBalance: boolean; maxDays?: number; requiresDoc: boolean; isPaid: boolean; isActive: boolean }

type Panel = 'clinic' | 'departments' | 'leave-types' | 'shifts' | null;

/* ─── Page ────────────────────────────────────────────────── */
export default function SettingsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState<Panel>(null);

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

  const cards = [
    { id: 'clinic' as Panel,        icon: MapPin,       label: 'Thông tin phòng khám & GPS',  desc: 'Tên, tọa độ GPS, bán kính chấm công' },
    { id: 'departments' as Panel,   icon: Building2,    label: 'Bộ phận',                      desc: 'Thêm, sửa, xóa các bộ phận' },
    { id: 'leave-types' as Panel,   icon: CalendarOff,  label: 'Loại ngày nghỉ',               desc: 'Cấu hình các loại phép nghỉ' },
    { id: 'shifts' as Panel,        icon: Clock,        label: 'Ca làm việc',                  desc: 'Quản lý ca sáng, chiều, cả ngày' },
  ];

  return (
    <div className="flex flex-col h-full overflow-auto">
      <PageHeader title="Cài đặt hệ thống" description="Cấu hình phòng khám" />

      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
          {cards.map(({ id, icon: Icon, label, desc }) => (
            <button
              key={id}
              onClick={() => setOpen(id)}
              className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-5 py-4 text-left hover:border-indigo-300 hover:shadow-sm transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100 transition-colors">
                <Icon size={18} className="text-indigo-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
              <ChevronRight size={16} className="text-gray-300 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={open === 'clinic'} onOpenChange={o => !o && setOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Thông tin phòng khám & GPS</DialogTitle></DialogHeader>
          <ClinicForm qc={qc} onClose={() => setOpen(null)} />
        </DialogContent>
      </Dialog>

      <Dialog open={open === 'departments'} onOpenChange={o => !o && setOpen(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader><DialogTitle>Bộ phận</DialogTitle></DialogHeader>
          <div className="overflow-y-auto flex-1"><DepartmentsPanel qc={qc} /></div>
        </DialogContent>
      </Dialog>

      <Dialog open={open === 'leave-types'} onOpenChange={o => !o && setOpen(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader><DialogTitle>Loại ngày nghỉ</DialogTitle></DialogHeader>
          <div className="overflow-y-auto flex-1"><LeaveTypesPanel qc={qc} /></div>
        </DialogContent>
      </Dialog>

      <Dialog open={open === 'shifts'} onOpenChange={o => !o && setOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader><DialogTitle>Ca làm việc</DialogTitle></DialogHeader>
          <div className="overflow-y-auto flex-1"><ShiftsPanel qc={qc} /></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Clinic form ─────────────────────────────────────────── */
function ClinicForm({ qc, onClose }: { qc: any; onClose: () => void }) {
  const { data } = useQuery<ClinicSettings>({
    queryKey: ['clinic-settings'],
    queryFn: () => api.get('/attendance/settings').then(r => r.data),
  });

  const [form, setForm] = useState<ClinicSettings>({ clinicName: '', gpsLat: 0, gpsLng: 0, gpsRadiusM: 100 });
  const [loaded, setLoaded] = useState(false);
  if (data && !loaded) { setForm({ clinicName: data.clinicName || '', gpsLat: +data.gpsLat || 0, gpsLng: +data.gpsLng || 0, gpsRadiusM: data.gpsRadiusM || 100 }); setLoaded(true); }

  const save = useMutation({
    mutationFn: () => api.patch('/attendance/settings', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clinic-settings'] }); toast.success('Đã lưu'); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi lưu'),
  });

  const detectGps = () => {
    if (!navigator.geolocation) return toast.error('Trình duyệt không hỗ trợ GPS');
    navigator.geolocation.getCurrentPosition(
      p => { setForm(f => ({ ...f, gpsLat: p.coords.latitude, gpsLng: p.coords.longitude })); toast.success('Đã lấy tọa độ'); },
      () => toast.error('Không lấy được GPS'),
      { enableHighAccuracy: true },
    );
  };

  return (
    <div className="space-y-4 mt-2">
      <div>
        <label className="text-xs font-medium text-gray-700 block mb-1.5">Tên phòng khám</label>
        <input value={form.clinicName} onChange={e => setForm(f => ({ ...f, clinicName: e.target.value }))}
          className="w-full h-9 px-3 text-sm border border-gray-200 rounded-md outline-none focus:border-indigo-400" placeholder="Phòng Khám Nha Khoa..." />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1.5">Vĩ độ</label>
          <input type="number" step="0.000001" value={form.gpsLat} onChange={e => setForm(f => ({ ...f, gpsLat: +e.target.value }))}
            className="w-full h-9 px-3 text-sm border border-gray-200 rounded-md outline-none focus:border-indigo-400" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1.5">Kinh độ</label>
          <input type="number" step="0.000001" value={form.gpsLng} onChange={e => setForm(f => ({ ...f, gpsLng: +e.target.value }))}
            className="w-full h-9 px-3 text-sm border border-gray-200 rounded-md outline-none focus:border-indigo-400" />
        </div>
      </div>
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="text-xs font-medium text-gray-700 block mb-1.5">Bán kính chấm công (mét)</label>
          <input type="number" min={10} max={1000} value={form.gpsRadiusM} onChange={e => setForm(f => ({ ...f, gpsRadiusM: +e.target.value }))}
            className="w-full h-9 px-3 text-sm border border-gray-200 rounded-md outline-none focus:border-indigo-400" />
        </div>
        <button onClick={detectGps} className="h-9 px-3 text-sm text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 rounded-md whitespace-nowrap">
          📍 Lấy GPS
        </button>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onClose} className="h-8 px-4 text-sm border border-gray-200 rounded-md hover:bg-gray-50">Hủy</button>
        <button onClick={() => save.mutate()} disabled={save.isPending} className="h-8 px-4 text-sm bg-indigo-500 text-white rounded-md hover:bg-indigo-600 disabled:opacity-60">
          {save.isPending ? 'Đang lưu...' : 'Lưu'}
        </button>
      </div>
    </div>
  );
}

/* ─── Departments panel ───────────────────────────────────── */
function DepartmentsPanel({ qc }: { qc: any }) {
  const [showNew, setShowNew] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments').then(r => r.data),
  });

  const createDept = useMutation({
    mutationFn: (d: any) => api.post('/departments', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); setShowNew(false); setForm({ name: '', description: '' }); toast.success('Đã thêm bộ phận'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi'),
  });
  const updateDept = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.patch(`/departments/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); setEditDept(null); toast.success('Đã cập nhật'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi'),
  });
  const deleteDept = useMutation({
    mutationFn: (id: number) => api.delete(`/departments/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); toast.success('Đã xóa'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi'),
  });

  return (
    <div className="mt-2 space-y-3">
      <button onClick={() => { setShowNew(s => !s); setEditDept(null); setForm({ name: '', description: '' }); }}
        className="text-xs px-3 h-7 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-md hover:bg-indigo-100 flex items-center gap-1">
        <Plus size={12} /> Thêm bộ phận
      </button>

      {showNew && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-2 border border-gray-100">
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Tên bộ phận *"
            className="w-full h-8 px-2 text-sm border border-gray-200 rounded-md" />
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Mô tả"
            className="w-full h-8 px-2 text-sm border border-gray-200 rounded-md" />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowNew(false)} className="h-7 px-3 text-xs border border-gray-200 rounded-md hover:bg-gray-100">Hủy</button>
            <button onClick={() => createDept.mutate(form)} disabled={!form.name || createDept.isPending}
              className="h-7 px-3 text-xs bg-indigo-500 text-white rounded-md disabled:opacity-50">Thêm</button>
          </div>
        </div>
      )}

      <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
        {departments.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400">Chưa có bộ phận nào</div>
        ) : departments.map(dept => (
          <div key={dept.id} className="px-3 py-3">
            {editDept?.id === dept.id ? (
              <div className="space-y-2">
                <input value={editDept.name} onChange={e => setEditDept(d => d ? { ...d, name: e.target.value } : d)}
                  className="w-full h-8 px-2 text-sm border border-gray-200 rounded-md" />
                <input value={editDept.description || ''} onChange={e => setEditDept(d => d ? { ...d, description: e.target.value } : d)}
                  placeholder="Mô tả" className="w-full h-8 px-2 text-sm border border-gray-200 rounded-md" />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditDept(null)} className="h-7 px-3 text-xs border border-gray-200 rounded-md hover:bg-gray-100">Hủy</button>
                  <button onClick={() => updateDept.mutate({ id: dept.id, data: { name: editDept.name, description: editDept.description } })}
                    disabled={updateDept.isPending} className="h-7 px-3 text-xs bg-indigo-500 text-white rounded-md disabled:opacity-50">Lưu</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{dept.name}</span>
                    <span className="text-[11px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{dept.code}</span>
                    {!dept.isActive && <span className="text-[11px] text-red-400">Vô hiệu</span>}
                  </div>
                  {dept.description && <p className="text-xs text-gray-400 mt-0.5">{dept.description}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditDept(dept)} className="p-1.5 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"><Pencil size={13} /></button>
                  <button onClick={() => deleteDept.mutate(dept.id)} disabled={deleteDept.isPending} className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={13} /></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Leave types panel ───────────────────────────────────── */
function LeaveTypesPanel({ qc }: { qc: any }) {
  const [showNew, setShowNew] = useState(false);
  const [editLt, setEditLt] = useState<LeaveType | null>(null);
  const emptyForm = { name: '', maxDays: '', deductsBalance: true, requiresDoc: false, isPaid: true };
  const [form, setForm] = useState(emptyForm);

  const { data: leaveTypes = [] } = useQuery<LeaveType[]>({
    queryKey: ['leave-types-all'],
    queryFn: () => api.get('/leave/types').then(r => r.data),
  });

  const createLt = useMutation({
    mutationFn: (d: any) => api.post('/leave/types', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leave-types-all'] }); setShowNew(false); setForm(emptyForm); toast.success('Đã thêm loại nghỉ'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi'),
  });
  const updateLt = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.patch(`/leave/types/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leave-types-all'] }); setEditLt(null); toast.success('Đã cập nhật'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi'),
  });
  const deleteLt = useMutation({
    mutationFn: (id: number) => api.delete(`/leave/types/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leave-types-all'] }); toast.success('Đã xóa'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi'),
  });

  const submitCreate = () => {
    createLt.mutate({ ...form, maxDays: form.maxDays ? Number(form.maxDays) : undefined });
  };

  return (
    <div className="mt-2 space-y-3">
      <button onClick={() => { setShowNew(s => !s); setEditLt(null); setForm(emptyForm); }}
        className="text-xs px-3 h-7 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-md hover:bg-indigo-100 flex items-center gap-1">
        <Plus size={12} /> Thêm loại nghỉ
      </button>

      {showNew && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-2 border border-gray-100">
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Tên loại nghỉ *"
            className="w-full h-8 px-2 text-sm border border-gray-200 rounded-md" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-600 block mb-1">Số ngày tối đa</label>
              <input type="number" min={1} value={form.maxDays} onChange={e => setForm(f => ({ ...f, maxDays: e.target.value }))}
                placeholder="Không giới hạn" className="w-full h-8 px-2 text-sm border border-gray-200 rounded-md" />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {([['deductsBalance', 'Trừ phép'], ['requiresDoc', 'Cần giấy tờ'], ['isPaid', 'Hưởng lương']] as [keyof typeof form, string][]).map(([key, label]) => (
              <label key={key} className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                <input type="checkbox" checked={!!form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                  className="rounded" />
                {label}
              </label>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowNew(false)} className="h-7 px-3 text-xs border border-gray-200 rounded-md hover:bg-gray-100">Hủy</button>
            <button onClick={submitCreate} disabled={!form.name || createLt.isPending}
              className="h-7 px-3 text-xs bg-indigo-500 text-white rounded-md disabled:opacity-50">Thêm</button>
          </div>
        </div>
      )}

      <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
        {leaveTypes.filter(lt => lt.isActive !== false).length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400">Chưa có loại nghỉ nào</div>
        ) : leaveTypes.filter(lt => lt.isActive !== false).map(lt => (
          <div key={lt.id} className="px-3 py-3">
            {editLt?.id === lt.id ? (
              <div className="space-y-2">
                <input value={editLt.name} onChange={e => setEditLt(d => d ? { ...d, name: e.target.value } : d)}
                  className="w-full h-8 px-2 text-sm border border-gray-200 rounded-md" />
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Số ngày tối đa</label>
                  <input type="number" min={1} value={editLt.maxDays ?? ''} onChange={e => setEditLt(d => d ? { ...d, maxDays: e.target.value ? +e.target.value : undefined } : d)}
                    placeholder="Không giới hạn" className="w-full h-8 px-2 text-sm border border-gray-200 rounded-md" />
                </div>
                <div className="flex flex-wrap gap-3">
                  {([['deductsBalance', 'Trừ phép'], ['requiresDoc', 'Cần giấy tờ'], ['isPaid', 'Hưởng lương']] as [keyof LeaveType, string][]).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={!!editLt[key]} onChange={e => setEditLt(d => d ? { ...d, [key]: e.target.checked } : d)}
                        className="rounded" />
                      {label}
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditLt(null)} className="h-7 px-3 text-xs border border-gray-200 rounded-md hover:bg-gray-100">Hủy</button>
                  <button onClick={() => updateLt.mutate({ id: lt.id, data: { name: editLt.name, maxDays: editLt.maxDays ?? null, deductsBalance: editLt.deductsBalance, requiresDoc: editLt.requiresDoc, isPaid: editLt.isPaid } })}
                    disabled={updateLt.isPending} className="h-7 px-3 text-xs bg-indigo-500 text-white rounded-md disabled:opacity-50">Lưu</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900">{lt.name}</span>
                    {lt.isPaid && <span className="text-[11px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded">Hưởng lương</span>}
                    {lt.deductsBalance && <span className="text-[11px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">Trừ phép</span>}
                    {lt.requiresDoc && <span className="text-[11px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">Cần giấy tờ</span>}
                    {lt.maxDays && <span className="text-[11px] text-gray-400">Tối đa {lt.maxDays} ngày</span>}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => setEditLt(lt)} className="p-1.5 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"><Pencil size={13} /></button>
                  <button onClick={() => deleteLt.mutate(lt.id)} disabled={deleteLt.isPending} className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={13} /></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Shifts panel ────────────────────────────────────────── */
function ShiftsPanel({ qc }: { qc: any }) {
  const [showNew, setShowNew] = useState(false);
  const [newShift, setNewShift] = useState({ code: '', name: '', startTime: '08:00', endTime: '17:00', breakMinutes: 0, graceMinutes: 5 });

  const { data: shifts = [] } = useQuery<Shift[]>({
    queryKey: ['shifts'],
    queryFn: () => api.get('/attendance/shifts').then(r => r.data),
  });

  const createShift = useMutation({
    mutationFn: (d: any) => api.post('/attendance/shifts', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shifts'] }); setShowNew(false); setNewShift({ code: '', name: '', startTime: '08:00', endTime: '17:00', breakMinutes: 0, graceMinutes: 5 }); toast.success('Đã tạo ca'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi tạo ca'),
  });

  return (
    <div className="mt-2 space-y-3">
      <button onClick={() => setShowNew(s => !s)}
        className="text-xs px-3 h-7 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-md hover:bg-indigo-100 flex items-center gap-1">
        <Plus size={12} /> Thêm ca
      </button>

      {showNew && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-3 border border-gray-100">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 block mb-1">Mã ca</label>
              <input value={newShift.code} onChange={e => setNewShift(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="CA_SANG"
                className="w-full h-8 px-2 text-sm border border-gray-200 rounded-md font-mono" />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">Tên ca</label>
              <input value={newShift.name} onChange={e => setNewShift(f => ({ ...f, name: e.target.value }))} placeholder="Ca sáng"
                className="w-full h-8 px-2 text-sm border border-gray-200 rounded-md" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {([['startTime', 'Bắt đầu', 'time'], ['endTime', 'Kết thúc', 'time'], ['breakMinutes', 'Nghỉ (ph)', 'number'], ['graceMinutes', 'Gia hạn (ph)', 'number']] as [keyof typeof newShift, string, string][]).map(([key, label, type]) => (
              <div key={key}>
                <label className="text-xs text-gray-600 block mb-1">{label}</label>
                <input type={type} min={0} value={newShift[key] as any} onChange={e => setNewShift(f => ({ ...f, [key]: type === 'number' ? +e.target.value : e.target.value }))}
                  className="w-full h-8 px-2 text-sm border border-gray-200 rounded-md" />
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowNew(false)} className="h-7 px-3 text-xs border border-gray-200 rounded-md hover:bg-gray-100">Hủy</button>
            <button onClick={() => createShift.mutate(newShift)} disabled={!newShift.code || !newShift.name || createShift.isPending}
              className="h-7 px-3 text-xs bg-indigo-500 text-white rounded-md disabled:opacity-50">Tạo ca</button>
          </div>
        </div>
      )}

      <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
        {shifts.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400">Chưa có ca làm việc</div>
        ) : shifts.map(shift => (
          <div key={shift.id} className="flex items-center px-3 py-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-900">{shift.name}</span>
                <span className="text-[11px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{shift.code}</span>
                {shift.isActive
                  ? <span className="text-[11px] text-green-600">Đang dùng</span>
                  : <span className="text-[11px] text-gray-400">Không dùng</span>}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {shift.startTime} — {shift.endTime}
                {shift.breakMinutes > 0 && ` · Nghỉ ${shift.breakMinutes}ph`}
                {shift.graceMinutes > 0 && ` · Gia hạn ${shift.graceMinutes}ph`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

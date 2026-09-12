'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { useAuth } from '@/contexts/auth-context';
import api from '@/lib/api';
import { AttendanceLog, User } from '@/types';
import {
  LogIn, LogOut, Clock, MapPin, AlertCircle, Users,
  Download, PencilLine, Check, X as XIcon, List, LayoutGrid, Trash2, Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { SearchSelect } from '@/components/ui/search-select';
import { MonthGrid } from '@/components/month-grid';
import { GpsDialog } from '@/components/attendance/gps-dialog';
import { getPosition, getGpsPermission, GpsFailReason } from '@/lib/geolocation';
import { exportToExcel, stampedFileName } from '@/lib/export-excel';

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  PRESENT:     { label: 'Có mặt',   cls: 'bg-green-50 text-green-700' },
  LATE:        { label: 'Đi muộn', cls: 'bg-amber-50 text-amber-700' },
  ABSENT:      { label: 'Vắng',     cls: 'bg-red-50 text-red-700' },
  ON_LEAVE:    { label: 'Nghỉ phép', cls: 'bg-indigo-50 text-indigo-700' },
  HOLIDAY:     { label: 'Ngày lễ',  cls: 'bg-violet-50 text-violet-700' },
  SHORT_HOURS: { label: 'Thiếu giờ', cls: 'bg-orange-50 text-orange-700' },
};

function fmtTime(dt?: string) {
  if (!dt) return '--:--';
  return new Date(dt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}
function fmtMins(m: number) {
  if (!m) return '0h 0m';
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export default function AttendancePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [gpsLoading, setGpsLoading] = useState<'in' | 'out' | null>(null);
  // Giám đốc sửa thẳng bản ghi, không còn đi qua vòng "gửi yêu cầu rồi tự duyệt".
  const [editLog, setEditLog] = useState<AttendanceLog | null>(null);
  const [editForm, setEditForm] = useState({ checkInAt: '', checkOutAt: '', status: '', note: '' });
  const [delLog, setDelLog] = useState<AttendanceLog | null>(null);
  const [filterUserId, setFilterUserId] = useState('');
  const [view, setView] = useState<'list' | 'grid'>('list');
  // Hộp hướng dẫn GPS: null = đóng; reason = null nghĩa là đang ở bước xin quyền.
  const [gpsDialog, setGpsDialog] = useState<{ reason: GpsFailReason | null; action: 'in' | 'out' } | null>(null);

  const isDirector = user?.role === 'GIAM_DOC';
  const isManager  = user?.role === 'GIAM_DOC' || user?.role === 'QUAN_LY';

  // Personal today — only needed for non-director
  const { data: today } = useQuery<AttendanceLog>({
    queryKey: ['attendance-today'],
    queryFn: () => api.get('/attendance/today').then(r => r.data),
    enabled: !isDirector,
    refetchInterval: 30000,
  });

  const { data: myLogs = [] } = useQuery<AttendanceLog[]>({
    queryKey: ['my-logs', viewYear, viewMonth],
    queryFn: () => api.get('/attendance/my', { params: { year: viewYear, month: viewMonth } }).then(r => r.data),
    enabled: !isDirector,
  });

  const { data: allLogs = [] } = useQuery<AttendanceLog[]>({
    queryKey: ['all-logs', viewYear, viewMonth],
    queryFn: () => api.get('/attendance', { params: { year: viewYear, month: viewMonth } }).then(r => r.data),
    enabled: isManager,
  });

  // Lấy danh sách nhân viên cho ô lọc, thay vì gõ tay đúng tên.
  const { data: staff = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
    enabled: isManager,
  });

  const { data: pendingAdj = [] } = useQuery({
    queryKey: ['pending-adj'],
    queryFn: () => api.get('/attendance/adjustments/pending').then(r => r.data),
    enabled: isManager,
  });

  /**
   * Chấm công. Trước khi gọi API phải có toạ độ, nên xử lý GPS theo trạng thái
   * quyền: chưa hỏi thì giải thích rồi mới xin, bị chặn hoặc GPS tắt thì mở hộp
   * hướng dẫn từng bước — không chỉ hiện một dòng lỗi rồi để người dùng tự đoán.
   */
  const runAttendance = async (action: 'in' | 'out', opts?: { skipPrompt?: boolean }) => {
    setGpsLoading(action);
    try {
      if (!opts?.skipPrompt) {
        const perm = await getGpsPermission();
        if (perm === 'denied') { setGpsDialog({ reason: 'denied', action }); return; }
        // Chưa hỏi lần nào: nói trước mục đích rồi mới bật hộp xin quyền của hệ thống,
        // người dùng hiểu vì sao mới bấm Cho phép.
        if (perm === 'prompt') { setGpsDialog({ reason: null, action }); return; }
      }

      const res = await getPosition();
      if (!res.ok) { setGpsDialog({ reason: res.reason, action }); return; }

      setGpsDialog(null);
      const path = action === 'in' ? '/attendance/check-in' : '/attendance/check-out';
      await api.post(path, { lat: res.pos.lat, lng: res.pos.lng });
      qc.invalidateQueries({ queryKey: ['attendance-today'] });
      qc.invalidateQueries({ queryKey: ['my-logs'] });
      qc.invalidateQueries({ queryKey: ['all-logs'] });
      toast.success(action === 'in' ? 'Chấm công vào thành công!' : 'Chấm công ra thành công!');
    } catch (e: any) {
      // Lỗi từ API (ngoài phạm vi, đã chấm rồi...) thì báo bình thường.
      toast.error(e.response?.data?.message || e.message || 'Lỗi chấm công');
    } finally { setGpsLoading(null); }
  };

  const doCheckIn = () => runAttendance('in');
  const doCheckOut = () => runAttendance('out');

  const refreshLogs = () => {
    qc.invalidateQueries({ queryKey: ['all-logs'] });
    qc.invalidateQueries({ queryKey: ['my-logs'] });
    qc.invalidateQueries({ queryKey: ['attendance-today'] });
  };

  const saveLog = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.patch(`/attendance/${id}`, data),
    onSuccess: () => {
      toast.success('Đã lưu bản ghi chấm công');
      setEditLog(null);
      refreshLogs();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Không lưu được'),
  });

  const removeLog = useMutation({
    mutationFn: (id: number) => api.delete(`/attendance/${id}`),
    onSuccess: () => {
      toast.success('Đã xóa bản ghi chấm công');
      setDelLog(null);
      refreshLogs();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Không xóa được'),
  });

  const openEdit = (log: AttendanceLog) => {
    setEditForm({
      checkInAt: toDatetimeLocal(log.checkInAt),
      checkOutAt: toDatetimeLocal(log.checkOutAt),
      status: log.status,
      note: log.note || '',
    });
    setEditLog(log);
  };

  const reviewAdj = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/attendance/adjustments/${id}/review`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending-adj'] });
      qc.invalidateQueries({ queryKey: ['all-logs'] });
      toast.success('Đã xử lý yêu cầu');
    },
  });

  // For director: filter all logs; for others: show own logs
  const displayLogs = isDirector ? allLogs : isManager ? allLogs : myLogs;

  const filteredLogs = isManager && filterUserId
    ? displayLogs.filter((l: any) => l.user?.id === filterUserId)
    : displayLogs;

  const staffOptions = staff.map(u => ({
    value: u.id,
    label: u.fullName,
    hint: [u.employeeCode, u.department?.name].filter(Boolean).join(' · '),
  }));

  // Lưới tháng: dòng = nhân viên, ô = trạng thái ngày đó
  const GRID_CELL: Record<string, { label: string; cls: string }> = {
    PRESENT:     { label: '✓', cls: 'bg-green-100 text-green-700' },
    LATE:        { label: 'M', cls: 'bg-amber-100 text-amber-700' },
    ABSENT:      { label: 'V', cls: 'bg-red-100 text-red-700' },
    ON_LEAVE:    { label: 'P', cls: 'bg-indigo-100 text-indigo-700' },
    HOLIDAY:     { label: 'L', cls: 'bg-violet-100 text-violet-700' },
    SHORT_HOURS: { label: 'T', cls: 'bg-orange-100 text-orange-700' },
  };
  const gridRows = (isManager
    ? staff.filter(u => u.status === 'ACTIVE' && (!filterUserId || u.id === filterUserId))
    : (user ? [user] : [])
  ).map(u => ({ id: u.id, name: u.fullName, sub: (u as any).department?.name || u.employeeCode }));
  const logIndex = new Map<string, any>();
  (displayLogs as any[]).forEach(l => logIndex.set(`${l.userId || l.user?.id}|${l.workDate}`, l));
  const gridCell = (uid: string, date: string) => {
    const l = logIndex.get(`${uid}|${date}`);
    if (!l) return null;
    const m = GRID_CELL[l.status] || { label: '•', cls: 'bg-gray-100 text-gray-600' };
    return { ...m, title: `${date} · ${STATUS_MAP[l.status]?.label || l.status} · vào ${fmtTime(l.checkInAt)} ra ${fmtTime(l.checkOutAt)}` };
  };
  const gridLegend = Object.entries(GRID_CELL).map(([k, v]) => ({ label: `${v.label} ${STATUS_MAP[k]?.label || k}`, cls: v.cls }));

  const exportLogs = () => exportToExcel(
    filteredLogs as any[],
    [
      { header: 'Ngày', value: (l: any) => l.workDate, width: 12 },
      ...(isManager ? [
        { header: 'Mã NV', value: (l: any) => l.user?.employeeCode ?? '', width: 10 },
        { header: 'Nhân viên', value: (l: any) => l.user?.fullName ?? '', width: 22 },
        { header: 'Bộ phận', value: (l: any) => l.user?.department?.name ?? '', width: 18 },
      ] : []),
      { header: 'Giờ vào', value: (l: any) => fmtTime(l.checkInAt), width: 10 },
      { header: 'Giờ ra', value: (l: any) => fmtTime(l.checkOutAt), width: 10 },
      { header: 'Số phút làm', value: (l: any) => l.workedMinutes ?? 0, width: 12 },
      { header: 'Thời gian làm', value: (l: any) => fmtMins(l.workedMinutes), width: 13 },
      { header: 'Đi muộn (phút)', value: (l: any) => l.lateMinutes ?? 0, width: 14 },
      { header: 'Trạng thái', value: (l: any) => STATUS_MAP[l.status]?.label || l.status, width: 14 },
    ],
    stampedFileName(`ChamCong_T${viewMonth}-${viewYear}`),
    `Chấm công T${viewMonth}-${viewYear}`,
  );

  // Today summary stats for director
  const todayStr = now.toISOString().split('T')[0];
  const todayLogs = allLogs.filter((l: any) => l.workDate === todayStr);
  const presentCount = todayLogs.filter((l: any) => l.status === 'PRESENT' || l.status === 'LATE').length;
  const lateCount    = todayLogs.filter((l: any) => l.status === 'LATE').length;
  const absentCount  = todayLogs.filter((l: any) => l.status === 'ABSENT').length;

  return (
    <div className="flex flex-col h-full overflow-auto">
      <PageHeader
        title={isDirector ? 'Quản lý chấm công' : 'Chấm công'}
        description={isDirector ? 'Theo dõi chấm công toàn công ty' : 'Quản lý giờ làm việc'}
      />

      <div className="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-5">

        {/* ── Director: today's summary ── */}
        {isDirector && (
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="surface p-4">
              <p className="text-xs text-gray-500 mb-1">Có mặt hôm nay</p>
              <p className="text-2xl font-semibold text-green-600">{presentCount}</p>
              <p className="text-xs text-gray-400 mt-0.5">nhân viên</p>
            </div>
            <div className="surface p-4">
              <p className="text-xs text-gray-500 mb-1">Đi muộn hôm nay</p>
              <p className="text-2xl font-semibold text-amber-600">{lateCount}</p>
              <p className="text-xs text-gray-400 mt-0.5">nhân viên</p>
            </div>
            <div className="surface p-4">
              <p className="text-xs text-gray-500 mb-1">Vắng hôm nay</p>
              <p className="text-2xl font-semibold text-red-500">{absentCount}</p>
              <p className="text-xs text-gray-400 mt-0.5">nhân viên</p>
            </div>
          </div>
        )}

        {/* ── Employee / Manager: personal check-in card ── */}
        {!isDirector && (
          <div className="surface p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Hôm nay — {now.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {today ? (
                    <>
                      Vào: <span className="font-medium">{fmtTime(today.checkInAt)}</span>
                      {' · '}
                      Ra: <span className="font-medium">{fmtTime(today.checkOutAt)}</span>
                      {' · '}
                      Làm: <span className="font-medium">{fmtMins(today.workedMinutes)}</span>
                    </>
                  ) : 'Chưa có dữ liệu chấm công'}
                </p>
              </div>
              {today && (
                <span className={`text-xs font-medium px-2 py-1 rounded-md ${STATUS_MAP[today.status]?.cls}`}>
                  {STATUS_MAP[today.status]?.label}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                onClick={doCheckIn}
                disabled={!!today?.checkInAt || gpsLoading === 'in'}
                className="btn flex-1 sm:flex-none bg-green-600 text-white shadow-sm hover:bg-green-700 active:bg-green-800">
                <LogIn size={15} />
                {gpsLoading === 'in' ? 'Đang định vị...' : 'Chấm vào'}
              </button>
              <button
                onClick={doCheckOut}
                disabled={!today?.checkInAt || !!today?.checkOutAt || gpsLoading === 'out'}
                className="btn flex-1 sm:flex-none bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800">
                <LogOut size={15} />
                {gpsLoading === 'out' ? 'Đang định vị...' : 'Chấm ra'}
              </button>
              <div className="flex items-center gap-1 text-xs text-gray-400 w-full sm:w-auto sm:ml-1">
                <MapPin size={12} />
                GPS bắt buộc
              </div>
            </div>
          </div>
        )}

        {/* ── Pending adjustments (manager / director) ── */}
        {isManager && pendingAdj.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={15} className="text-amber-600" />
              <p className="text-sm font-medium text-amber-800">{pendingAdj.length} yêu cầu điều chỉnh đang chờ</p>
            </div>
            <div className="space-y-2">
              {pendingAdj.map((adj: any) => (
                <div key={adj.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-100">
                  <div>
                    <p className="text-xs font-medium text-gray-800">{adj.requestedBy?.fullName} · {adj.log?.workDate}</p>
                    <p className="text-xs text-gray-500">
                      {adj.field === 'CHECK_IN' ? 'Giờ vào' : adj.field === 'CHECK_OUT' ? 'Giờ ra' : 'Trạng thái'}: {adj.requestedValue} · {adj.reason}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => reviewAdj.mutate({ id: adj.id, status: 'APPROVED' })}
                      title="Duyệt" aria-label="Duyệt yêu cầu điều chỉnh"
                      className="icon-btn text-green-600 hover:bg-green-50 hover:text-green-700"><Check size={16} /></button>
                    <button onClick={() => reviewAdj.mutate({ id: adj.id, status: 'REJECTED' })}
                      title="Từ chối" aria-label="Từ chối yêu cầu điều chỉnh"
                      className="icon-btn text-red-500 hover:bg-red-50 hover:text-red-600"><XIcon size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Log table ── */}
        <div className="surface overflow-hidden">
          <div className="flex flex-wrap items-center justify-between px-4 sm:px-5 py-3 border-b border-gray-100 gap-2">
            <div className="flex items-center gap-2">
              {isDirector && <Users size={14} className="text-gray-400" />}
              <p className="text-sm font-medium text-gray-900">
                {isDirector ? 'Bảng chấm công toàn công ty' : 'Bảng chấm công'}
              </p>
              <span className="text-xs text-gray-400">({filteredLogs.length})</span>
            </div>
            <div className="filter-row w-full sm:w-auto">
              {isManager && (
                <SearchSelect
                  options={staffOptions}
                  value={filterUserId}
                  onChange={setFilterUserId}
                  placeholder="Tất cả nhân viên"
                  allLabel="Tất cả nhân viên"
                  className="w-44"
                />
              )}
              <select value={viewMonth} onChange={e => setViewMonth(+e.target.value)}
                className="field field-sm w-auto">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m =>
                  <option key={m} value={m}>Tháng {m}</option>)}
              </select>
              <select value={viewYear} onChange={e => setViewYear(+e.target.value)}
                className="field field-sm w-auto">
                {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
                <button onClick={() => setView('list')} title="Dạng danh sách"
                  className={`h-9 sm:h-8 px-2.5 flex items-center gap-1 text-xs ${view === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  <List size={13} /> <span className="hidden sm:inline">Danh sách</span>
                </button>
                <button onClick={() => setView('grid')} title="Dạng lưới theo ngày"
                  className={`h-9 sm:h-8 px-2.5 flex items-center gap-1 text-xs border-l border-gray-300 ${view === 'grid' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  <LayoutGrid size={13} /> <span className="hidden sm:inline">Lưới tháng</span>
                </button>
              </div>
              <button onClick={exportLogs} className="btn btn-sm btn-secondary" title="Xuất file Excel">
                <Download size={13} /> Excel
              </button>
            </div>
          </div>
          {view === 'grid' ? (
            <div className="p-3">
              <MonthGrid year={viewYear} month={viewMonth} rows={gridRows} cell={gridCell} legend={gridLegend}
                emptyText="Không có nhân viên nào" />
            </div>
          ) : (<>
          {/* Mobile: thẻ thay bảng */}
          <div className="md:hidden divide-y divide-gray-100">
            {filteredLogs.length === 0 && (
              <p className="py-10 text-center text-sm text-gray-400">Chưa có dữ liệu</p>
            )}
            {filteredLogs.map((log: AttendanceLog) => (
              <div key={log.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{log.workDate}</p>
                    {isManager && <p className="text-xs text-gray-500 truncate">{(log as any).user?.fullName}</p>}
                  </div>
                  <span className={`flex-shrink-0 text-[11px] font-medium px-2 py-0.5 rounded ${STATUS_MAP[log.status]?.cls || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_MAP[log.status]?.label || log.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                  <div className="bg-gray-50 rounded-lg py-1.5">
                    <p className="text-[10px] text-gray-400">Vào</p>
                    <p className="text-sm font-medium text-gray-800">{fmtTime(log.checkInAt)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg py-1.5">
                    <p className="text-[10px] text-gray-400">Ra</p>
                    <p className="text-sm font-medium text-gray-800">{fmtTime(log.checkOutAt)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg py-1.5">
                    <p className="text-[10px] text-gray-400">Làm việc</p>
                    <p className="text-sm font-medium text-gray-800">{fmtMins(log.workedMinutes)}</p>
                  </div>
                </div>
                {isDirector && (
                  <div className="flex justify-end gap-1 mt-2">
                    <button onClick={() => openEdit(log)} className="btn btn-sm btn-ghost text-indigo-600">
                      <PencilLine size={14} /> Sửa
                    </button>
                    <button onClick={() => setDelLog(log)} className="btn btn-sm btn-ghost text-red-600">
                      <Trash2 size={14} /> Xóa
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[480px]">
            <thead>
              <tr className="bg-gray-50 text-left">
                {isManager && <th className="text-xs font-medium text-gray-500 px-4 py-2.5">Nhân viên</th>}
                <th className="text-xs font-medium text-gray-500 px-4 py-2.5">Ngày</th>
                <th className="text-xs font-medium text-gray-500 px-4 py-2.5">Vào</th>
                <th className="text-xs font-medium text-gray-500 px-4 py-2.5">Ra</th>
                <th className="text-xs font-medium text-gray-500 px-4 py-2.5">Làm việc</th>
                <th className="text-xs font-medium text-gray-500 px-4 py-2.5">Trạng thái</th>
                {isDirector && <th className="text-xs font-medium text-gray-500 px-4 py-2.5 text-right">Thao tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredLogs.map((log: AttendanceLog) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  {isManager && <td className="px-4 py-3 text-sm text-gray-700">{(log as any).user?.fullName}</td>}
                  <td className="px-4 py-3 text-sm text-gray-700 font-medium">{log.workDate}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{fmtTime(log.checkInAt)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{fmtTime(log.checkOutAt)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{fmtMins(log.workedMinutes)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_MAP[log.status]?.cls || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_MAP[log.status]?.label || log.status}
                    </span>
                  </td>
                  {isDirector && (
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => openEdit(log)}
                          title="Sửa bản ghi chấm công"
                          aria-label={`Sửa chấm công ngày ${log.workDate}`}
                          className="icon-btn hover:text-indigo-600 hover:bg-indigo-50"
                        >
                          <PencilLine size={15} />
                        </button>
                        <button
                          onClick={() => setDelLog(log)}
                          title="Xóa bản ghi chấm công"
                          aria-label={`Xóa chấm công ngày ${log.workDate}`}
                          className="icon-btn hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-sm text-gray-400">Chưa có dữ liệu</td></tr>
              )}
            </tbody>
          </table>
          </div>
          </>)}
        </div>
      </div>

      <GpsDialog
        open={!!gpsDialog}
        reason={gpsDialog?.reason ?? null}
        busy={!!gpsLoading}
        onClose={() => setGpsDialog(null)}
        onAction={() => {
          const a = gpsDialog?.action ?? 'in';
          // skipPrompt: đã qua bước giải thích, giờ gọi thẳng để trình duyệt
          // bật hộp xin quyền (chỉ getCurrentPosition mới làm được việc đó).
          runAttendance(a, { skipPrompt: true });
        }}
      />

      {/* Sửa thẳng bản ghi — chỉ giám đốc */}
      {editLog && isDirector && (
        <div className="fixed inset-0 bg-slate-900/55 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-3 sm:p-4"
          onClick={() => setEditLog(null)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-md shadow-2xl pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-5"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <p className="text-base font-semibold text-gray-900">Sửa bản ghi chấm công</p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {editLog.user?.fullName && <><span className="font-medium">{editLog.user.fullName}</span> · </>}
                  {editLog.workDate}
                </p>
              </div>
              <button onClick={() => setEditLog(null)} className="icon-btn -mr-1 -mt-1"><XIcon size={16} /></button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="lbl">Giờ vào</label>
                  <input type="datetime-local" value={editForm.checkInAt}
                    onChange={e => setEditForm(f => ({ ...f, checkInAt: e.target.value }))}
                    className="field" />
                </div>
                <div>
                  <label className="lbl">Giờ ra</label>
                  <input type="datetime-local" value={editForm.checkOutAt}
                    onChange={e => setEditForm(f => ({ ...f, checkOutAt: e.target.value }))}
                    className="field" />
                </div>
              </div>
              <div>
                <label className="lbl">Trạng thái</label>
                <select value={editForm.status}
                  onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                  className="field">
                  {Object.entries(STATUS_MAP).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
                {/* Đi muộn và số phút làm được máy tính lại từ giờ mới, nói rõ để
                    người sửa không tưởng mình phải tự tính rồi nhập tay. */}
                <p className="text-[11px] text-gray-400 mt-1">
                  Số phút đi muộn và thời gian làm sẽ được tính lại theo giờ mới.
                </p>
              </div>
              <div>
                <label className="lbl">Ghi chú</label>
                <textarea value={editForm.note}
                  onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))}
                  rows={2} placeholder="Lý do sửa, ví dụ: quên chấm công"
                  className="field field-area" />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditLog(null)} className="btn btn-secondary flex-1">Hủy</button>
              <button
                disabled={saveLog.isPending}
                onClick={() => saveLog.mutate({
                  id: editLog.id,
                  data: {
                    checkInAt: fromDatetimeLocal(editForm.checkInAt),
                    checkOutAt: fromDatetimeLocal(editForm.checkOutAt),
                    status: editForm.status,
                    note: editForm.note,
                  },
                })}
                className="btn btn-primary flex-1">
                <Save size={14} /> {saveLog.isPending ? 'Đang lưu…' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Xác nhận xóa */}
      {delLog && isDirector && (
        <div className="fixed inset-0 bg-slate-900/55 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-3 sm:p-4"
          onClick={() => setDelLog(null)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-5"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} />
              </span>
              <p className="text-base font-semibold text-gray-900">Xóa bản ghi chấm công?</p>
            </div>
            <p className="text-sm text-gray-600 mt-3">
              {delLog.user?.fullName && <><span className="font-medium">{delLog.user.fullName}</span> · </>}
              ngày {delLog.workDate}, vào {fmtTime(delLog.checkInAt)} – ra {fmtTime(delLog.checkOutAt)}.
            </p>
            <p className="text-xs text-gray-400 mt-1.5">Xóa rồi thì không khôi phục lại được.</p>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setDelLog(null)} className="btn btn-secondary flex-1">Hủy</button>
              <button disabled={removeLog.isPending} onClick={() => removeLog.mutate(delLog.id)}
                className="btn btn-danger flex-1">
                <Trash2 size={14} /> {removeLog.isPending ? 'Đang xóa…' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

/**
 * Ngược của toDatetimeLocal: ô datetime-local trả về giờ Việt Nam dạng
 * 'YYYY-MM-DDTHH:mm', gắn thẳng +07:00 rồi cho Date tự quy về UTC — không tự
 * cộng trừ giờ bằng tay, tránh sai khi máy người dùng đặt múi giờ khác.
 */
function fromDatetimeLocal(v: string): string | null {
  if (!v) return null;
  const d = new Date(`${v}:00+07:00`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function toDatetimeLocal(utcStr?: string) {
  if (!utcStr) return '';
  const vn = new Date(new Date(utcStr).getTime() + 7 * 60 * 60 * 1000);
  return vn.toISOString().slice(0, 16);
}


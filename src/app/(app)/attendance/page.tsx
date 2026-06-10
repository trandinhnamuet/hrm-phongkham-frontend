'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { useAuth } from '@/contexts/auth-context';
import api from '@/lib/api';
import { AttendanceLog } from '@/types';
import { LogIn, LogOut, Clock, MapPin, AlertCircle, Users } from 'lucide-react';
import { toast } from 'sonner';

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
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustLog, setAdjustLog] = useState<AttendanceLog | null>(null);
  const [adjustForm, setAdjustForm] = useState({ logId: 0, field: 'CHECK_IN', requestedValue: '', reason: '' });
  const [searchName, setSearchName] = useState('');

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

  const { data: pendingAdj = [] } = useQuery({
    queryKey: ['pending-adj'],
    queryFn: () => api.get('/attendance/adjustments/pending').then(r => r.data),
    enabled: isManager,
  });

  const doCheckIn = async () => {
    setGpsLoading('in');
    try {
      const pos = await getGPS();
      await api.post('/attendance/check-in', { lat: pos.lat, lng: pos.lng });
      qc.invalidateQueries({ queryKey: ['attendance-today'] });
      qc.invalidateQueries({ queryKey: ['my-logs'] });
      toast.success('Chấm công vào thành công!');
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || 'Lỗi chấm công');
    } finally { setGpsLoading(null); }
  };

  const doCheckOut = async () => {
    setGpsLoading('out');
    try {
      const pos = await getGPS();
      await api.post('/attendance/check-out', { lat: pos.lat, lng: pos.lng });
      qc.invalidateQueries({ queryKey: ['attendance-today'] });
      qc.invalidateQueries({ queryKey: ['my-logs'] });
      toast.success('Chấm công ra thành công!');
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || 'Lỗi chấm công');
    } finally { setGpsLoading(null); }
  };

  const submitAdj = useMutation({
    mutationFn: (data: any) => api.post('/attendance/adjustments', data),
    onSuccess: () => { toast.success('Đã gửi yêu cầu điều chỉnh'); setShowAdjust(false); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi gửi yêu cầu'),
  });

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

  // Director can filter by name
  const filteredLogs = isDirector && searchName.trim()
    ? displayLogs.filter((l: any) => l.user?.fullName?.toLowerCase().includes(searchName.toLowerCase()))
    : displayLogs;

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

      <div className="flex-1 p-6 space-y-5">

        {/* ── Director: today's summary ── */}
        {isDirector && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Có mặt hôm nay</p>
              <p className="text-2xl font-semibold text-green-600">{presentCount}</p>
              <p className="text-xs text-gray-400 mt-0.5">nhân viên</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Đi muộn hôm nay</p>
              <p className="text-2xl font-semibold text-amber-600">{lateCount}</p>
              <p className="text-xs text-gray-400 mt-0.5">nhân viên</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Vắng hôm nay</p>
              <p className="text-2xl font-semibold text-red-500">{absentCount}</p>
              <p className="text-xs text-gray-400 mt-0.5">nhân viên</p>
            </div>
          </div>
        )}

        {/* ── Employee / Manager: personal check-in card ── */}
        {!isDirector && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
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
            <div className="flex items-center gap-3">
              <button
                onClick={doCheckIn}
                disabled={!!today?.checkInAt || gpsLoading === 'in'}
                className="flex items-center gap-2 h-9 px-4 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                <LogIn size={15} />
                {gpsLoading === 'in' ? 'Đang định vị...' : 'Chấm vào'}
              </button>
              <button
                onClick={doCheckOut}
                disabled={!today?.checkInAt || !!today?.checkOutAt || gpsLoading === 'out'}
                className="flex items-center gap-2 h-9 px-4 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                <LogOut size={15} />
                {gpsLoading === 'out' ? 'Đang định vị...' : 'Chấm ra'}
              </button>
              <div className="flex items-center gap-1 text-xs text-gray-400 ml-1">
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
                  <div className="flex gap-1.5">
                    <button onClick={() => reviewAdj.mutate({ id: adj.id, status: 'APPROVED' })}
                      className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">Duyệt</button>
                    <button onClick={() => reviewAdj.mutate({ id: adj.id, status: 'REJECTED' })}
                      className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">Từ chối</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Log table ── */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 gap-3">
            <div className="flex items-center gap-2">
              {isDirector && <Users size={14} className="text-gray-400" />}
              <p className="text-sm font-medium text-gray-900">
                {isDirector ? 'Bảng chấm công toàn công ty' : 'Bảng chấm công'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isDirector && (
                <input
                  value={searchName}
                  onChange={e => setSearchName(e.target.value)}
                  placeholder="Tìm nhân viên..."
                  className="h-7 px-2 text-xs border border-gray-200 rounded-md w-36 outline-none focus:border-indigo-400"
                />
              )}
              <select value={viewMonth} onChange={e => setViewMonth(+e.target.value)}
                className="h-7 px-2 text-xs border border-gray-200 rounded-md">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m =>
                  <option key={m} value={m}>Tháng {m}</option>)}
              </select>
              <select value={viewYear} onChange={e => setViewYear(+e.target.value)}
                className="h-7 px-2 text-xs border border-gray-200 rounded-md">
                {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[480px]">
            <thead>
              <tr className="bg-gray-50 text-left">
                {isManager && <th className="text-xs font-medium text-gray-500 px-4 py-2.5">Nhân viên</th>}
                <th className="text-xs font-medium text-gray-500 px-4 py-2.5">Ngày</th>
                <th className="text-xs font-medium text-gray-500 px-4 py-2.5">Vào</th>
                <th className="text-xs font-medium text-gray-500 px-4 py-2.5">Ra</th>
                <th className="text-xs font-medium text-gray-500 px-4 py-2.5">Làm việc</th>
                <th className="text-xs font-medium text-gray-500 px-4 py-2.5">Trạng thái</th>
                {isDirector && <th className="text-xs font-medium text-gray-500 px-4 py-2.5"></th>}
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
                    {log.lateMinutes > 0 && (
                      <span className="ml-1 text-xs text-amber-600">+{log.lateMinutes}m trễ</span>
                    )}
                  </td>
                  {isDirector && (
                    <td className="px-4 py-3">
                      <button onClick={() => {
                          setAdjustLog(log);
                          setAdjustForm({ logId: log.id, field: 'CHECK_IN', requestedValue: toDatetimeLocal(log.checkInAt), reason: '' });
                          setShowAdjust(true);
                        }}
                        className="text-xs text-indigo-600 hover:underline">Điều chỉnh</button>
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
        </div>
      </div>

      {/* Adjustment modal — GIAM_DOC only */}
      {showAdjust && isDirector && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-5 w-full max-w-sm shadow-xl">
            <p className="text-base font-semibold mb-1">Yêu cầu điều chỉnh công</p>
            {adjustLog && (
              <p className="text-xs text-gray-500 mb-4">
                {(adjustLog as any).user?.fullName && <><span className="font-medium">{(adjustLog as any).user.fullName}</span> · </>}
                {adjustLog.workDate}
              </p>
            )}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Trường cần sửa</label>
                <select value={adjustForm.field} onChange={e => {
                    const f = e.target.value;
                    const val = f === 'CHECK_IN' ? toDatetimeLocal(adjustLog?.checkInAt)
                              : f === 'CHECK_OUT' ? toDatetimeLocal(adjustLog?.checkOutAt)
                              : adjustLog?.status ?? '';
                    setAdjustForm(prev => ({ ...prev, field: f, requestedValue: val }));
                  }}
                  className="w-full h-9 px-2 text-sm border border-gray-200 rounded-md">
                  <option value="CHECK_IN">Giờ vào</option>
                  <option value="CHECK_OUT">Giờ ra</option>
                  <option value="STATUS">Trạng thái</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Giá trị mới</label>
                <input type={adjustForm.field === 'STATUS' ? 'text' : 'datetime-local'}
                  value={adjustForm.requestedValue}
                  onChange={e => setAdjustForm(f => ({ ...f, requestedValue: e.target.value }))}
                  className="w-full h-9 px-3 text-sm border border-gray-200 rounded-md" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Lý do</label>
                <textarea value={adjustForm.reason} onChange={e => setAdjustForm(f => ({ ...f, reason: e.target.value }))}
                  rows={2} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md resize-none" />
              </div>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => { setShowAdjust(false); setAdjustLog(null); }}
                className="h-8 px-4 text-sm border border-gray-200 rounded-md hover:bg-gray-50">Hủy</button>
              <button onClick={() => submitAdj.mutate(adjustForm)}
                className="h-8 px-4 text-sm bg-indigo-500 text-white rounded-md hover:bg-indigo-600">Gửi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function toDatetimeLocal(utcStr?: string) {
  if (!utcStr) return '';
  const vn = new Date(new Date(utcStr).getTime() + 7 * 60 * 60 * 1000);
  return vn.toISOString().slice(0, 16);
}

function getGPS(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Thiết bị không hỗ trợ GPS'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error('Không lấy được vị trí GPS: ' + err.message)),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

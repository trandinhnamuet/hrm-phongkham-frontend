'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { useAuth } from '@/contexts/auth-context';
import api from '@/lib/api';
import {
  CheckSquare, Clock, CalendarOff, TrendingUp,
  LogIn, LogOut, MapPin, Users, UserCheck, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

// ─── Shared helpers ──────────────────────────────────────────────────────────

function StatCard({ title, value, sub, icon: Icon, color }: {
  title: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-500">{title}</p>
        <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
          <Icon size={16} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

async function getGPS(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Trình duyệt không hỗ trợ GPS')); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new Error('Không lấy được vị trí GPS. Vui lòng cấp quyền truy cập vị trí.')),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    TODO: 'bg-gray-400', IN_PROGRESS: 'bg-blue-500', DONE: 'bg-green-500', CANCELLED: 'bg-red-400',
  };
  return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors[status] || 'bg-gray-400'}`} />;
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    LOW: { label: 'Thấp', cls: 'bg-gray-100 text-gray-600' },
    NORMAL: { label: 'Bình thường', cls: 'bg-blue-50 text-blue-600' },
    HIGH: { label: 'Cao', cls: 'bg-amber-50 text-amber-700' },
    URGENT: { label: 'Khẩn', cls: 'bg-red-50 text-red-700' },
  };
  const { label, cls } = map[priority] || map.NORMAL;
  return <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${cls}`}>{label}</span>;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const now = new Date();
  const isDirector = user?.role === 'GIAM_DOC';

  const greeting = () => {
    const h = now.getHours();
    if (h < 12) return 'Chào buổi sáng';
    if (h < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  return (
    <div className="flex flex-col h-full overflow-auto">
      <PageHeader
        title="Dashboard"
        description={now.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      />
      <div className="flex-1 p-6 space-y-6">
        {isDirector
          ? <DirectorDashboard user={user} greeting={greeting()} now={now} />
          : <StaffDashboard user={user} greeting={greeting()} now={now} />
        }
      </div>
    </div>
  );
}

// ─── Director view ────────────────────────────────────────────────────────────

function DirectorDashboard({ user, greeting, now }: { user: any; greeting: string; now: Date }) {
  const todayStr = now.toISOString().split('T')[0];

  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
  });

  const { data: allLogs = [] } = useQuery<any[]>({
    queryKey: ['all-logs', now.getFullYear(), now.getMonth() + 1],
    queryFn: () => api.get('/attendance', {
      params: { year: now.getFullYear(), month: now.getMonth() + 1 },
    }).then(r => r.data),
  });

  const { data: pendingLeave = [] } = useQuery<any[]>({
    queryKey: ['all-leave-pending'],
    queryFn: () => api.get('/leave/requests', { params: { status: 'PENDING' } }).then(r => r.data),
  });

  const { data: allTasks = [] } = useQuery<any[]>({
    queryKey: ['all-tasks-dir'],
    queryFn: () => api.get('/tasks').then(r => r.data),
  });

  // Today's stats
  const todayLogs = allLogs.filter((l: any) => l.workDate === todayStr);
  const presentToday = todayLogs.filter((l: any) => l.status === 'PRESENT' || l.status === 'LATE').length;
  const lateToday    = todayLogs.filter((l: any) => l.status === 'LATE').length;

  const totalStaff    = allUsers.filter((u: any) => u.status === 'ACTIVE').length;
  const activeTasks   = allTasks.filter((t: any) => t.status !== 'DONE' && t.status !== 'CANCELLED').length;
  const urgentTasks   = allTasks.filter((t: any) => t.priority === 'URGENT' && t.status !== 'DONE' && t.status !== 'CANCELLED').length;

  return (
    <>
      {/* Greeting */}
      <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-5 text-white">
        <p className="text-indigo-100 text-sm">{greeting},</p>
        <p className="text-xl font-semibold mt-0.5">{user?.fullName} 👋</p>
        <p className="text-indigo-100 text-sm mt-2">
          Hôm nay có <strong className="text-white">{presentToday}/{totalStaff}</strong> nhân viên có mặt
          {lateToday > 0 && <> · <strong className="text-amber-200">{lateToday} đi muộn</strong></>}
          {pendingLeave.length > 0 && <> · <strong className="text-yellow-200">{pendingLeave.length} đơn chờ duyệt</strong></>}
        </p>
      </div>

      {/* Company stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tổng nhân viên"
          value={totalStaff}
          sub="đang làm việc"
          icon={Users}
          color="bg-indigo-500"
        />
        <StatCard
          title="Có mặt hôm nay"
          value={`${presentToday}/${totalStaff}`}
          sub={lateToday > 0 ? `${lateToday} đi muộn` : 'đúng giờ'}
          icon={UserCheck}
          color={presentToday < totalStaff ? 'bg-amber-500' : 'bg-green-500'}
        />
        <StatCard
          title="Đơn nghỉ chờ duyệt"
          value={pendingLeave.length}
          sub="cần xử lý"
          icon={CalendarOff}
          color={pendingLeave.length > 0 ? 'bg-red-500' : 'bg-gray-400'}
        />
        <StatCard
          title="Công việc đang làm"
          value={activeTasks}
          sub={urgentTasks > 0 ? `${urgentTasks} khẩn cấp` : 'toàn công ty'}
          icon={CheckSquare}
          color={urgentTasks > 0 ? 'bg-red-500' : 'bg-violet-500'}
        />
      </div>

      {/* Pending leave quick-review */}
      {pendingLeave.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-500" />
              <h2 className="text-sm font-medium text-gray-900">Đơn nghỉ tuần chờ duyệt</h2>
            </div>
            <Link href="/leave" className="text-xs text-indigo-600 hover:underline">Xem tất cả →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {pendingLeave.slice(0, 5).map((req: any) => (
              <div key={req.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-indigo-600 text-xs font-semibold">{req.user?.fullName?.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 font-medium truncate">{req.user?.fullName}</p>
                  <p className="text-xs text-gray-500">
                    {req.startDate} → {req.endDate} · {req.totalDays} ngày · {req.leaveType?.name}
                  </p>
                </div>
                <span className="text-[11px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-medium flex-shrink-0">
                  Chờ duyệt
                </span>
              </div>
            ))}
          </div>
          {pendingLeave.length > 5 && (
            <div className="px-5 py-3 border-t border-gray-50">
              <Link href="/leave" className="text-xs text-indigo-600 hover:underline">
                + {pendingLeave.length - 5} đơn khác
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Recent tasks (all company) */}
      <RecentTasksList tasks={allTasks} />
    </>
  );
}

// ─── Staff / Manager view ─────────────────────────────────────────────────────

function StaffDashboard({ user, greeting, now }: { user: any; greeting: string; now: Date }) {
  const qc = useQueryClient();
  const [gpsLoading, setGpsLoading] = useState<'in' | 'out' | null>(null);

  const { data: todayAttendance } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: () => api.get('/attendance/today').then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: myTasks } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: () => api.get('/tasks').then(r => r.data),
  });

  const { data: myLeave } = useQuery({
    queryKey: ['my-leave'],
    queryFn: () => api.get('/leave/requests/my').then(r => r.data),
  });

  const { data: myBalance } = useQuery({
    queryKey: ['my-balance'],
    queryFn: () => api.get('/leave/balance/my').then(r => r.data),
  });

  const tasks = myTasks || [];
  const pendingTasks = tasks.filter((t: any) => t.status !== 'DONE' && t.status !== 'CANCELLED').length;
  const doneTasks    = tasks.filter((t: any) => t.status === 'DONE').length;
  const pendingLeave = (myLeave || []).filter((l: any) => l.status === 'PENDING').length;

  const balance = myBalance?.[0];
  const remainingDays = balance
    ? +(balance.entitledDays) - +(balance.usedDays) - +(balance.pendingDays)
    : 4;

  const canCheckIn  = !todayAttendance?.checkInAt;
  const canCheckOut = todayAttendance?.checkInAt && !todayAttendance?.checkOutAt;

  const doCheckIn = async () => {
    setGpsLoading('in');
    try {
      const pos = await getGPS();
      await api.post('/attendance/check-in', { lat: pos.lat, lng: pos.lng });
      qc.invalidateQueries({ queryKey: ['attendance-today'] });
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
      toast.success('Chấm công ra thành công!');
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || 'Lỗi chấm công');
    } finally { setGpsLoading(null); }
  };

  return (
    <>
      {/* Greeting */}
      <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-5 text-white">
        <p className="text-indigo-100 text-sm">{greeting},</p>
        <p className="text-xl font-semibold mt-0.5">{user?.fullName} 👋</p>
        {todayAttendance ? (
          <p className="text-indigo-100 text-sm mt-2">
            ✓ Vào lúc {todayAttendance.checkInAt
              ? new Date(todayAttendance.checkInAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
              : ''}
            {todayAttendance.checkOutAt
              ? ` · Ra lúc ${new Date(todayAttendance.checkOutAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
              : ' · Chưa chấm ra'}
            {todayAttendance?.lateMinutes > 0 && ` · Trễ ${todayAttendance.lateMinutes} phút`}
          </p>
        ) : (
          <p className="text-indigo-100 text-sm mt-2">⚠ Bạn chưa chấm công hôm nay</p>
        )}
      </div>

      {/* Check-in / Check-out card */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-gray-900">
              {now.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
              <MapPin size={11} /> GPS bắt buộc khi chấm công
            </p>
          </div>
          {todayAttendance && (
            <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${
              todayAttendance.status === 'LATE' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
            }`}>
              {todayAttendance.status === 'LATE' ? 'Đi muộn' : 'Có mặt'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={doCheckIn}
            disabled={!canCheckIn || gpsLoading !== null}
            className="flex items-center gap-2 h-10 px-5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {gpsLoading === 'in'
              ? <div className="w-4 h-4 border-2 border-green-300 border-t-white rounded-full animate-spin" />
              : <LogIn size={16} />}
            {gpsLoading === 'in' ? 'Đang định vị...' : 'Chấm vào'}
          </button>
          <button
            onClick={doCheckOut}
            disabled={!canCheckOut || gpsLoading !== null}
            className="flex items-center gap-2 h-10 px-5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {gpsLoading === 'out'
              ? <div className="w-4 h-4 border-2 border-red-300 border-t-white rounded-full animate-spin" />
              : <LogOut size={16} />}
            {gpsLoading === 'out' ? 'Đang định vị...' : 'Chấm ra'}
          </button>
          {todayAttendance?.workedMinutes > 0 && (
            <span className="text-sm text-gray-500 ml-1">
              Làm: <span className="font-medium text-gray-700">
                {Math.floor(todayAttendance.workedMinutes / 60)}h {todayAttendance.workedMinutes % 60}m
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Việc đang làm"
          value={pendingTasks}
          sub={`${doneTasks} việc đã hoàn thành`}
          icon={CheckSquare}
          color="bg-indigo-500"
        />
        <StatCard
          title="Trạng thái hôm nay"
          value={todayAttendance
            ? (todayAttendance.status === 'LATE' ? 'Đi muộn' : 'Có mặt')
            : 'Chưa chấm'}
          sub={todayAttendance?.workedMinutes
            ? `${Math.floor(todayAttendance.workedMinutes / 60)}h${todayAttendance.workedMinutes % 60}m`
            : undefined}
          icon={Clock}
          color={todayAttendance ? 'bg-green-500' : 'bg-gray-400'}
        />
        <StatCard
          title="Ngày nghỉ còn lại"
          value={remainingDays.toFixed(1)}
          sub={`Tháng ${now.getMonth() + 1}/${now.getFullYear()}`}
          icon={CalendarOff}
          color="bg-violet-500"
        />
        <StatCard
          title="Đơn nghỉ đang chờ"
          value={pendingLeave}
          sub="cần duyệt"
          icon={TrendingUp}
          color="bg-amber-500"
        />
      </div>

      <RecentTasksList tasks={tasks} />
    </>
  );
}

// ─── Shared: recent tasks list ────────────────────────────────────────────────

function RecentTasksList({ tasks }: { tasks: any[] }) {
  const activeTasks = tasks.filter(t => t.status !== 'DONE' && t.status !== 'CANCELLED');
  const display = activeTasks.length > 0 ? activeTasks : tasks;

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-medium text-gray-900">Công việc đang thực hiện</h2>
        <Link href="/tasks" className="text-xs text-indigo-600 hover:underline">Xem tất cả →</Link>
      </div>
      {display.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <CheckSquare size={32} className="text-gray-200 mb-3" />
          <p className="text-sm text-gray-500">Chưa có công việc nào</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {display.slice(0, 6).map((task: any) => (
            <div key={task.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
              <StatusDot status={task.status} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 truncate">{task.title}</p>
                {task.assignee && (
                  <p className="text-xs text-gray-400 truncate">{task.assignee.fullName}</p>
                )}
              </div>
              <PriorityBadge priority={task.priority} />
              {task.dueDate && (
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {new Date(task.dueDate).toLocaleDateString('vi-VN')}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

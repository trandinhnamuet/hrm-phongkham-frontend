'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { useAuth } from '@/contexts/auth-context';
import api from '@/lib/api';
import { LeaveRequest, LeaveType, LeaveBalance, User } from '@/types';
import { Plus, CalendarOff, Check, X as XIcon, Download, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SearchSelect } from '@/components/ui/search-select';
import { exportToExcel, stampedFileName } from '@/lib/export-excel';

const STATUS_MAP = {
  PENDING:   { label: 'Chờ duyệt', cls: 'bg-amber-50 text-amber-700' },
  APPROVED:  { label: 'Đã duyệt', cls: 'bg-green-50 text-green-700' },
  REJECTED:  { label: 'Từ chối', cls: 'bg-red-50 text-red-700' },
  CANCELLED: { label: 'Đã hủy', cls: 'bg-gray-100 text-gray-500' },
};

export default function LeavePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState<'my' | 'all'>('my');
  const [filterUserId, setFilterUserId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const isManager = user?.role === 'GIAM_DOC' || user?.role === 'QUAN_LY';
  const canReview = user?.role === 'GIAM_DOC';

  const { data: types = [] } = useQuery<LeaveType[]>({
    queryKey: ['leave-types'],
    queryFn: () => api.get('/leave/types').then(r => r.data),
  });

  const { data: balance = [] } = useQuery<LeaveBalance[]>({
    queryKey: ['my-balance'],
    queryFn: () => api.get('/leave/balance/my').then(r => r.data),
  });

  const { data: myRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: ['my-leave'],
    queryFn: () => api.get('/leave/requests/my').then(r => r.data),
  });

  const { data: allRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: ['all-leave'],
    queryFn: () => api.get('/leave/requests').then(r => r.data),
    // Chay ca khi dang o tab "Don cua toi" de badge so don cho duyet luon dung
    // va khi chuyen tab khong bi trong mot nhip.
    enabled: isManager,
  });

  // Ba mutation duoi deu lam moi ca 3 nguon: don cua toi, tat ca don, va so phep.
  // Truoc day moi cai chi lam moi mot phan nen vi du giam doc tao don khi dang o
  // tab "Tat ca don" thi don moi khong hien ra, phai F5.
  const refreshLeave = () => {
    qc.invalidateQueries({ queryKey: ['my-leave'] });
    qc.invalidateQueries({ queryKey: ['all-leave'] });
    qc.invalidateQueries({ queryKey: ['my-balance'] });
  };

  // Danh sách nhân viên cho ô lọc ở tab "Tất cả đơn".
  const { data: staff = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
    enabled: isManager,
  });

  const createReq = useMutation({
    mutationFn: (data: any) => api.post('/leave/requests', data),
    onSuccess: () => {
      refreshLeave();
      setShowCreate(false);
      toast.success('Đã gửi đơn nghỉ tuần');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi gửi đơn'),
  });

  const reviewReq = useMutation({
    mutationFn: ({ id, status, reviewNote }: { id: number; status: string; reviewNote?: string }) =>
      api.patch(`/leave/requests/${id}/review`, { status, reviewNote }),
    onSuccess: () => {
      refreshLeave();
      toast.success('Đã xử lý đơn nghỉ tuần');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi xử lý'),
  });

  const cancelReq = useMutation({
    mutationFn: (id: number) => api.patch(`/leave/requests/${id}/cancel`),
    onSuccess: () => {
      refreshLeave();
      toast.success('Đã hủy đơn');
    },
  });

  const monthlyBalance = balance[0];
  const remaining = monthlyBalance
    ? +(monthlyBalance.entitledDays) - +(monthlyBalance.usedDays) - +(monthlyBalance.pendingDays)
    : 4;

  const baseReqs = isManager && activeTab === 'all' ? allRequests : myRequests;
  const displayReqs = baseReqs.filter((r: LeaveRequest) => {
    if (activeTab === 'all' && filterUserId && (r as any).user?.id !== filterUserId) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    return true;
  });
  const pendingCount = allRequests.filter((r: LeaveRequest) => r.status === 'PENDING').length;

  const staffOptions = staff.map(u => ({
    value: u.id,
    label: u.fullName,
    hint: [u.employeeCode, u.department?.name].filter(Boolean).join(' · '),
  }));

  const exportReqs = () => exportToExcel(
    displayReqs as any[],
    [
      ...(activeTab === 'all' ? [
        { header: 'Mã NV', value: (r: any) => r.user?.employeeCode ?? '', width: 10 },
        { header: 'Nhân viên', value: (r: any) => r.user?.fullName ?? '', width: 22 },
        { header: 'Bộ phận', value: (r: any) => r.user?.department?.name ?? '', width: 18 },
      ] : []),
      { header: 'Loại phép', value: (r: any) => r.leaveType?.name ?? '', width: 18 },
      { header: 'Từ ngày', value: (r: any) => r.startDate, width: 12 },
      { header: 'Đến ngày', value: (r: any) => r.endDate, width: 12 },
      { header: 'Số ngày', value: (r: any) => Number(r.totalDays) || 0, width: 9 },
      { header: 'Lý do', value: (r: any) => r.reason ?? '', width: 34 },
      { header: 'Trạng thái', value: (r: any) => STATUS_MAP[r.status as keyof typeof STATUS_MAP]?.label || r.status, width: 12 },
      { header: 'Ghi chú duyệt', value: (r: any) => r.reviewNote ?? '', width: 28 },
    ],
    stampedFileName(activeTab === 'all' ? 'DonNghi_TatCa' : 'DonNghi_CuaToi'),
    'Đơn nghỉ',
  );

  return (
    <div className="flex flex-col h-full overflow-auto">
      <PageHeader
        title="Nghỉ tuần"
        description="Quản lý đơn nghỉ tuần"
        actions={
          <button onClick={() => setShowCreate(true)} className="btn btn-sm btn-primary">
            <Plus size={14} /> <span className="hidden sm:inline">Đăng ký nghỉ</span><span className="sm:hidden">Đăng ký</span>
          </button>
        }
      />

      <div className="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-5">
        {/* Balance cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="surface p-4">
            <p className="text-xs text-gray-500 mb-1">Phép tháng này</p>
            <p className="text-2xl font-semibold text-gray-900">{remaining.toFixed(1)}</p>
            <p className="text-xs text-gray-400 mt-0.5">ngày còn lại / {monthlyBalance?.entitledDays || 4} ngày</p>
          </div>
          <div className="surface p-4">
            <p className="text-xs text-gray-500 mb-1">Đã sử dụng</p>
            <p className="text-2xl font-semibold text-green-600">{+(monthlyBalance?.usedDays || 0)}</p>
            <p className="text-xs text-gray-400 mt-0.5">ngày trong tháng này</p>
          </div>
          <div className="surface p-4">
            <p className="text-xs text-gray-500 mb-1">Đang chờ duyệt</p>
            <p className="text-2xl font-semibold text-amber-600">{+(monthlyBalance?.pendingDays || 0)}</p>
            <p className="text-xs text-gray-400 mt-0.5">ngày đang chờ</p>
          </div>
        </div>

        {/* Tabs */}
        {isManager && (
          <div className="flex gap-1 border-b border-gray-200">
            <button onClick={() => setActiveTab('my')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'my' ? 'border-indigo-500 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              Đơn của tôi
            </button>
            <button onClick={() => setActiveTab('all')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'all' ? 'border-indigo-500 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              Tất cả đơn
              {pendingCount > 0 && (
                <span className="bg-amber-100 text-amber-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">{pendingCount}</span>
              )}
            </button>
          </div>
        )}

        {/* Thanh lọc + xuất file */}
        <div className="filter-row">
          {isManager && activeTab === 'all' && (
            <SearchSelect
              options={staffOptions}
              value={filterUserId}
              onChange={setFilterUserId}
              placeholder="Tất cả nhân viên"
              allLabel="Tất cả nhân viên"
              className="w-44"
            />
          )}
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="field field-sm w-auto">
            <option value="">Mọi trạng thái</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <span className="text-xs text-gray-400">{displayReqs.length} đơn</span>
          <button onClick={exportReqs} className="btn btn-sm btn-secondary ml-auto" title="Xuất file Excel">
            <Download size={13} /> Excel
          </button>
        </div>

        {/* Mobile: thẻ thay bảng */}
        <div className="md:hidden space-y-2">
          {displayReqs.length === 0 && (
            <div className="py-10 text-center">
              <CalendarOff size={32} className="text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Chưa có đơn nghỉ tuần nào</p>
            </div>
          )}
          {displayReqs.map((req: LeaveRequest) => {
            const canAct = req.status === 'PENDING' && ((canReview && activeTab === 'all') || activeTab === 'my');
            return (
              <div key={req.id} className="surface p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {isManager && activeTab === 'all' && (
                      <p className="text-xs text-gray-500 truncate">{req.user?.fullName}</p>
                    )}
                    <p className="text-sm font-semibold text-gray-900">{req.leaveType?.name}</p>
                  </div>
                  <span className={`flex-shrink-0 text-[11px] font-medium px-2 py-0.5 rounded ${STATUS_MAP[req.status]?.cls}`}>
                    {STATUS_MAP[req.status]?.label}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1.5">
                  {req.startDate} → {req.endDate} · <b>{req.totalDays} ngày</b>
                </p>
                {(req as any).reason && (
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{(req as any).reason}</p>
                )}
                {canAct && (
                  <div className="flex justify-end gap-1.5 mt-2 pt-2 border-t border-gray-100">
                    {canReview && activeTab === 'all' && (
                      <>
                        <button onClick={() => reviewReq.mutate({ id: req.id, status: 'APPROVED' })}
                          className="btn btn-sm btn-secondary text-green-700 border-green-200 hover:bg-green-50">
                          <Check size={14} /> Duyệt
                        </button>
                        <button onClick={() => reviewReq.mutate({ id: req.id, status: 'REJECTED' })}
                          className="btn btn-sm btn-secondary text-red-600 border-red-200 hover:bg-red-50">
                          <XIcon size={14} /> Từ chối
                        </button>
                      </>
                    )}
                    {activeTab === 'my' && (
                      <button onClick={() => cancelReq.mutate(req.id)} className="btn btn-sm btn-secondary">
                        <Ban size={14} /> Hủy đơn
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Request list — từ md trở lên */}
        <div className="hidden md:block surface overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="bg-gray-50">
                {isManager && activeTab === 'all' && (
                  <th className="text-xs font-medium text-gray-500 px-4 py-2.5 text-left">Nhân viên</th>
                )}
                <th className="text-xs font-medium text-gray-500 px-4 py-2.5 text-left">Loại phép</th>
                <th className="text-xs font-medium text-gray-500 px-4 py-2.5 text-left">Từ ngày</th>
                <th className="text-xs font-medium text-gray-500 px-4 py-2.5 text-left">Đến ngày</th>
                <th className="text-xs font-medium text-gray-500 px-4 py-2.5 text-left">Số ngày</th>
                <th className="text-xs font-medium text-gray-500 px-4 py-2.5 text-left">Trạng thái</th>
                <th className="text-xs font-medium text-gray-500 px-4 py-2.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayReqs.map((req: LeaveRequest) => (
                <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                  {isManager && activeTab === 'all' && (
                    <td className="px-4 py-3 text-sm text-gray-700">{req.user?.fullName}</td>
                  )}
                  <td className="px-4 py-3 text-sm text-gray-800 font-medium">{req.leaveType?.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{req.startDate}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{req.endDate}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 font-medium">{req.totalDays} ngày</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_MAP[req.status]?.cls}`}>
                      {STATUS_MAP[req.status]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {canReview && activeTab === 'all' && req.status === 'PENDING' && (
                        <>
                          <button onClick={() => reviewReq.mutate({ id: req.id, status: 'APPROVED' })}
                            title="Duyệt đơn" aria-label={`Duyệt đơn nghỉ của ${(req as any).user?.fullName || 'nhân viên'}`}
                            className="icon-btn text-green-600 hover:bg-green-50 hover:text-green-700">
                            <Check size={16} />
                          </button>
                          <button onClick={() => reviewReq.mutate({ id: req.id, status: 'REJECTED' })}
                            title="Từ chối đơn" aria-label={`Từ chối đơn nghỉ của ${(req as any).user?.fullName || 'nhân viên'}`}
                            className="icon-btn text-red-500 hover:bg-red-50 hover:text-red-600">
                            <XIcon size={16} />
                          </button>
                        </>
                      )}
                      {activeTab === 'my' && req.status === 'PENDING' && (
                        <button onClick={() => cancelReq.mutate(req.id)}
                          title="Hủy đơn" aria-label="Hủy đơn nghỉ của tôi"
                          className="icon-btn hover:bg-gray-100 hover:text-gray-700">
                          <Ban size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {displayReqs.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10">
                    <CalendarOff size={32} className="text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Chưa có đơn nghỉ tuần nào</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={(o) => !o && setShowCreate(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Đăng ký nghỉ tuần</DialogTitle></DialogHeader>
          <CreateLeaveForm
            types={types}
            onSubmit={(data) => createReq.mutate(data)}
            onCancel={() => setShowCreate(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateLeaveForm({ types, onSubmit, onCancel }: { types: LeaveType[]; onSubmit: (d: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ leaveTypeId: '', startDate: '', endDate: '', reason: '', attachmentUrl: '' });

  const totalDays = (() => {
    if (!form.startDate || !form.endDate) return 0;
    const s = new Date(form.startDate), e = new Date(form.endDate);
    if (e < s) return 0;
    return Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
  })();

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...form, leaveTypeId: +form.leaveTypeId }); }}
      className="space-y-4 mt-2">
      <div>
        <label className="lbl">Loại nghỉ tuần *</label>
        <select required value={form.leaveTypeId} onChange={e => setForm(f => ({ ...f, leaveTypeId: e.target.value }))}
          className="field">
          <option value="">-- Chọn loại --</option>
          {types.filter(t => t.isActive !== false).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="lbl">Từ ngày *</label>
          <input required type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
            className="field" />
        </div>
        <div>
          <label className="lbl">Đến ngày *</label>
          <input required type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
            min={form.startDate}
            className="field" />
        </div>
      </div>
      {totalDays > 0 && (() => {
        const day = form.startDate ? new Date(form.startDate).getDay() : -1;
        const autoApprove = totalDays === 1 && day >= 1 && day <= 5;
        return (
          <p className={`text-xs px-3 py-2 rounded-md ${autoApprove ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
            Tổng: <strong>{totalDays} ngày</strong>
            {autoApprove
              ? ' · Sẽ tự động duyệt (ngày thường)'
              : ' · Cần Giám đốc duyệt (cuối tuần hoặc ≥2 ngày)'}
          </p>
        );
      })()}
      <div>
        <label className="lbl">Lý do *</label>
        <textarea required value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
          rows={3} className="field field-area" />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel}
          className="btn btn-secondary">Hủy</button>
        <button type="submit"
          className="btn btn-primary">Gửi đơn</button>
      </div>
    </form>
  );
}

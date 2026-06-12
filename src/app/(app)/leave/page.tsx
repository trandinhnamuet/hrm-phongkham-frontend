'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { useAuth } from '@/contexts/auth-context';
import api from '@/lib/api';
import { LeaveRequest, LeaveType, LeaveBalance } from '@/types';
import { Plus, CalendarOff, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
    enabled: isManager && activeTab === 'all',
  });

  const createReq = useMutation({
    mutationFn: (data: any) => api.post('/leave/requests', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-leave'] });
      qc.invalidateQueries({ queryKey: ['my-balance'] });
      setShowCreate(false);
      toast.success('Đã gửi đơn nghỉ tuần');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi gửi đơn'),
  });

  const reviewReq = useMutation({
    mutationFn: ({ id, status, reviewNote }: { id: number; status: string; reviewNote?: string }) =>
      api.patch(`/leave/requests/${id}/review`, { status, reviewNote }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-leave'] });
      toast.success('Đã xử lý đơn nghỉ tuần');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi xử lý'),
  });

  const cancelReq = useMutation({
    mutationFn: (id: number) => api.patch(`/leave/requests/${id}/cancel`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-leave'] });
      qc.invalidateQueries({ queryKey: ['my-balance'] });
      toast.success('Đã hủy đơn');
    },
  });

  const monthlyBalance = balance[0];
  const remaining = monthlyBalance
    ? +(monthlyBalance.entitledDays) - +(monthlyBalance.usedDays) - +(monthlyBalance.pendingDays)
    : 4;

  const displayReqs = isManager && activeTab === 'all' ? allRequests : myRequests;
  const pendingCount = allRequests.filter((r: LeaveRequest) => r.status === 'PENDING').length;

  return (
    <div className="flex flex-col h-full overflow-auto">
      <PageHeader
        title="Nghỉ tuần"
        description="Quản lý đơn nghỉ tuần"
        actions={
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 h-8 px-3 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-md transition-colors">
            <Plus size={14} /> Đăng ký nghỉ
          </button>
        }
      />

      <div className="flex-1 p-6 space-y-5">
        {/* Balance cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Phép tháng này</p>
            <p className="text-2xl font-semibold text-gray-900">{remaining.toFixed(1)}</p>
            <p className="text-xs text-gray-400 mt-0.5">ngày còn lại / {monthlyBalance?.entitledDays || 4} ngày</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Đã sử dụng</p>
            <p className="text-2xl font-semibold text-green-600">{+(monthlyBalance?.usedDays || 0)}</p>
            <p className="text-xs text-gray-400 mt-0.5">ngày trong tháng này</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
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

        {/* Request list */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
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
                <th className="text-xs font-medium text-gray-500 px-4 py-2.5 text-left">Thao tác</th>
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
                    <div className="flex items-center gap-2">
                      {canReview && activeTab === 'all' && req.status === 'PENDING' && (
                        <>
                          <button onClick={() => reviewReq.mutate({ id: req.id, status: 'APPROVED' })}
                            className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded hover:bg-green-200">
                            Duyệt
                          </button>
                          <button onClick={() => reviewReq.mutate({ id: req.id, status: 'REJECTED' })}
                            className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded hover:bg-red-200">
                            Từ chối
                          </button>
                        </>
                      )}
                      {activeTab === 'my' && req.status === 'PENDING' && (
                        <button onClick={() => cancelReq.mutate(req.id)}
                          className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">
                          Hủy
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
        <label className="text-xs font-medium text-gray-700 block mb-1">Loại nghỉ tuần *</label>
        <select required value={form.leaveTypeId} onChange={e => setForm(f => ({ ...f, leaveTypeId: e.target.value }))}
          className="w-full h-9 px-2 text-sm border border-gray-200 rounded-md">
          <option value="">-- Chọn loại --</option>
          {types.filter(t => t.isActive !== false).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Từ ngày *</label>
          <input required type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
            className="w-full h-9 px-2 text-sm border border-gray-200 rounded-md" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Đến ngày *</label>
          <input required type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
            min={form.startDate}
            className="w-full h-9 px-2 text-sm border border-gray-200 rounded-md" />
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
        <label className="text-xs font-medium text-gray-700 block mb-1">Lý do *</label>
        <textarea required value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
          rows={3} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md resize-none" />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel}
          className="h-8 px-4 text-sm border border-gray-200 rounded-md hover:bg-gray-50">Hủy</button>
        <button type="submit"
          className="h-8 px-4 text-sm bg-indigo-500 text-white rounded-md hover:bg-indigo-600">Gửi đơn</button>
      </div>
    </form>
  );
}

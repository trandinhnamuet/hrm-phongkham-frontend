'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { useAuth } from '@/contexts/auth-context';
import api from '@/lib/api';
import { User, Department, UserRole } from '@/types';
import { Plus, Search, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const ROLE_MAP: Record<string, { label: string; cls: string }> = {
  GIAM_DOC: { label: 'Giám đốc', cls: 'bg-violet-50 text-violet-700' },
  QUAN_LY: { label: 'Quản lý', cls: 'bg-blue-50 text-blue-700' },
  NHAN_VIEN: { label: 'Nhân viên', cls: 'bg-gray-100 text-gray-600' },
};

export default function UsersPage() {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'RESIGNED' | ''>('ACTIVE');
  const [roleFilter, setRoleFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments').then(r => r.data),
  });

  const filtered = users.filter(u => {
    if (statusFilter && u.status !== statusFilter) return false;
    if (roleFilter && u.role !== roleFilter) return false;
    if (deptFilter && String(u.departmentId) !== deptFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!u.fullName.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q) && !u.employeeCode.includes(q)) return false;
    }
    return true;
  });

  const createUser = useMutation({
    mutationFn: (data: any) => api.post('/users', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setShowCreate(false); toast.success('Đã tạo nhân viên'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi tạo nhân viên'),
  });

  const updateUser = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/users/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setEditUser(null); toast.success('Đã cập nhật'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi cập nhật'),
  });

  if (me?.role === 'NHAN_VIEN') {
    return <div className="flex items-center justify-center h-full text-sm text-gray-400">Không có quyền truy cập</div>;
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <PageHeader
        title="Nhân viên"
        description={`${filtered.length}${filtered.length < users.length ? `/${users.length}` : ''} nhân viên`}
        actions={
          me?.role === 'GIAM_DOC' && (
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 h-8 px-3 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-md transition-colors">
              <Plus size={14} /> Thêm NV
            </button>
          )
        }
      />

      <div className="flex-1 p-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm nhân viên..."
              className="h-9 pl-8 pr-3 text-sm border border-gray-200 rounded-md outline-none focus:border-indigo-400 w-52"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="h-9 px-2 text-sm border border-gray-200 rounded-md outline-none focus:border-indigo-400 text-gray-700">
            <option value="ACTIVE">Đang làm</option>
            <option value="RESIGNED">Đã nghỉ</option>
            <option value="">Tất cả trạng thái</option>
          </select>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="h-9 px-2 text-sm border border-gray-200 rounded-md outline-none focus:border-indigo-400 text-gray-700">
            <option value="">Tất cả vai trò</option>
            <option value="GIAM_DOC">Giám đốc</option>
            <option value="QUAN_LY">Quản lý</option>
            <option value="NHAN_VIEN">Nhân viên</option>
          </select>
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="h-9 px-2 text-sm border border-gray-200 rounded-md outline-none focus:border-indigo-400 text-gray-700">
            <option value="">Tất cả bộ phận</option>
            {departments.filter(d => d.isActive).map(d => (
              <option key={d.id} value={String(d.id)}>{d.name}</option>
            ))}
          </select>
          {(statusFilter !== 'ACTIVE' || roleFilter || deptFilter || search) && (
            <button
              onClick={() => { setStatusFilter('ACTIVE'); setRoleFilter(''); setDeptFilter(''); setSearch(''); }}
              className="h-9 px-3 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50">
              Đặt lại
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-xs font-medium text-gray-500 px-4 py-3 text-left">Mã NV</th>
                <th className="text-xs font-medium text-gray-500 px-4 py-3 text-left">Họ tên</th>
                <th className="text-xs font-medium text-gray-500 px-4 py-3 text-left">Email</th>
                <th className="text-xs font-medium text-gray-500 px-4 py-3 text-left">Bộ phận</th>
                <th className="text-xs font-medium text-gray-500 px-4 py-3 text-left">Vị trí</th>
                <th className="text-xs font-medium text-gray-500 px-4 py-3 text-left">Vai trò</th>
                <th className="text-xs font-medium text-gray-500 px-4 py-3 text-left">Trạng thái</th>
                <th className="text-xs font-medium text-gray-500 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-10">
                  <div className="w-5 h-5 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-gray-600">{u.employeeCode}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-indigo-600 text-xs font-semibold">{u.fullName?.charAt(0)}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{u.fullName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{u.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{u.department?.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{u.positionTitle || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${ROLE_MAP[u.role]?.cls}`}>
                      {ROLE_MAP[u.role]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                      u.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {u.status === 'ACTIVE' ? 'Đang làm' : 'Đã nghỉ'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {me?.role === 'GIAM_DOC' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger className="p-1 rounded hover:bg-gray-100 text-gray-400 focus:outline-none">
                          <MoreHorizontal size={16} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditUser(u)}>Chỉnh sửa</DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => updateUser.mutate({ id: u.id, data: { status: u.status === 'ACTIVE' ? 'RESIGNED' : 'ACTIVE' } })}>
                            {u.status === 'ACTIVE' ? 'Vô hiệu hóa' : 'Kích hoạt lại'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={(o) => !o && setShowCreate(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Thêm nhân viên</DialogTitle></DialogHeader>
          <UserForm departments={departments} onSubmit={(d: any) => createUser.mutate(d)} onCancel={() => setShowCreate(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Chỉnh sửa nhân viên</DialogTitle></DialogHeader>
          {editUser && (
            <EditUserForm
              user={editUser}
              departments={departments}
              onSubmit={(d: any) => updateUser.mutate({ id: editUser.id, data: d })}
              onCancel={() => setEditUser(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserForm({ onSubmit, onCancel, departments }: { onSubmit: any; onCancel: any; departments: Department[] }) {
  const [f, setF] = useState({ fullName: '', email: '', password: '', phone: '', role: 'NHAN_VIEN', positionTitle: '', departmentId: '' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...f, departmentId: f.departmentId ? Number(f.departmentId) : undefined }); }} className="space-y-3 mt-2">
      <div>
        <label className="text-xs font-medium text-gray-700 block mb-1">Họ tên *</label>
        <input required value={f.fullName} onChange={e => setF(p => ({ ...p, fullName: e.target.value }))}
          className="w-full h-9 px-3 text-sm border border-gray-200 rounded-md" />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-700 block mb-1">Email *</label>
        <input required type="email" value={f.email} onChange={e => setF(p => ({ ...p, email: e.target.value }))}
          className="w-full h-9 px-3 text-sm border border-gray-200 rounded-md" />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-700 block mb-1">Mật khẩu *</label>
        <input required type="password" value={f.password} onChange={e => setF(p => ({ ...p, password: e.target.value }))}
          className="w-full h-9 px-3 text-sm border border-gray-200 rounded-md" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Điện thoại</label>
          <input value={f.phone} onChange={e => setF(p => ({ ...p, phone: e.target.value }))}
            className="w-full h-9 px-3 text-sm border border-gray-200 rounded-md" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Vai trò</label>
          <select value={f.role} onChange={e => setF(p => ({ ...p, role: e.target.value as UserRole }))}
            className="w-full h-9 px-2 text-sm border border-gray-200 rounded-md">
            <option value="NHAN_VIEN">Nhân viên</option>
            <option value="QUAN_LY">Quản lý</option>
            <option value="GIAM_DOC">Giám đốc</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Vị trí</label>
          <input value={f.positionTitle} onChange={e => setF(p => ({ ...p, positionTitle: e.target.value }))}
            placeholder="Bác sĩ chính, Lễ tân..."
            className="w-full h-9 px-3 text-sm border border-gray-200 rounded-md" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Bộ phận</label>
          <select value={f.departmentId} onChange={e => setF(p => ({ ...p, departmentId: e.target.value }))}
            className="w-full h-9 px-2 text-sm border border-gray-200 rounded-md">
            <option value="">— Chưa chọn —</option>
            {departments.filter(d => d.isActive).map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="h-8 px-4 text-sm border border-gray-200 rounded-md hover:bg-gray-50">Hủy</button>
        <button type="submit" className="h-8 px-4 text-sm bg-indigo-500 text-white rounded-md hover:bg-indigo-600">Thêm</button>
      </div>
    </form>
  );
}

function EditUserForm({ user, onSubmit, onCancel, departments }: { user: User; onSubmit: any; onCancel: any; departments: Department[] }) {
  const initManagedIds = (user.managedDepartments ?? []).map(d => d.id);
  const [f, setF] = useState({
    fullName: user.fullName,
    phone: user.phone || '',
    role: user.role,
    positionTitle: user.positionTitle || '',
    departmentId: user.departmentId ? String(user.departmentId) : '',
  });
  const [managedIds, setManagedIds] = useState<number[]>(initManagedIds);

  const isQl = f.role === 'QUAN_LY';

  const toggleDept = (id: number) =>
    setManagedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...f,
      departmentId: f.departmentId ? Number(f.departmentId) : null,
      managedDepartmentIds: isQl ? managedIds : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mt-2">
      <div>
        <label className="text-xs font-medium text-gray-700 block mb-1">Họ tên</label>
        <input value={f.fullName} onChange={e => setF(p => ({ ...p, fullName: e.target.value }))}
          className="w-full h-9 px-3 text-sm border border-gray-200 rounded-md" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Điện thoại</label>
          <input value={f.phone} onChange={e => setF(p => ({ ...p, phone: e.target.value }))}
            className="w-full h-9 px-3 text-sm border border-gray-200 rounded-md" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Vai trò</label>
          <select value={f.role} onChange={e => setF(p => ({ ...p, role: e.target.value as UserRole }))}
            className="w-full h-9 px-2 text-sm border border-gray-200 rounded-md">
            <option value="NHAN_VIEN">Nhân viên</option>
            <option value="QUAN_LY">Quản lý</option>
            <option value="GIAM_DOC">Giám đốc</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Vị trí</label>
          <input value={f.positionTitle} onChange={e => setF(p => ({ ...p, positionTitle: e.target.value }))}
            className="w-full h-9 px-3 text-sm border border-gray-200 rounded-md" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Bộ phận (của nhân viên)</label>
          <select value={f.departmentId} onChange={e => setF(p => ({ ...p, departmentId: e.target.value }))}
            className="w-full h-9 px-2 text-sm border border-gray-200 rounded-md">
            <option value="">— Chưa chọn —</option>
            {departments.filter(d => d.isActive).map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {isQl && (
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1.5">
            Bộ phận quản lý <span className="text-gray-400 font-normal">(có thể chọn nhiều)</span>
          </label>
          <div className="border border-gray-200 rounded-md p-2 space-y-1 max-h-32 overflow-y-auto">
            {departments.filter(d => d.isActive).map(d => (
              <label key={d.id} className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={managedIds.includes(d.id)}
                  onChange={() => toggleDept(d.id)}
                  className="accent-indigo-500"
                />
                <span className="text-sm text-gray-700">{d.name}</span>
              </label>
            ))}
          </div>
          {managedIds.length > 0 && (
            <p className="text-[11px] text-indigo-600 mt-1">
              Đang quản lý: {managedIds.map(id => departments.find(d => d.id === id)?.name).filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="h-8 px-4 text-sm border border-gray-200 rounded-md hover:bg-gray-50">Hủy</button>
        <button type="submit" className="h-8 px-4 text-sm bg-indigo-500 text-white rounded-md hover:bg-indigo-600">Lưu</button>
      </div>
    </form>
  );
}

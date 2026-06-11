'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { useAuth } from '@/contexts/auth-context';
import api from '@/lib/api';
import { Task, TaskStatus, TaskPriority, User, Department, TaskHistory } from '@/types';
import { Plus, ChevronDown, History, Calendar, User as UserIcon, Flag, Tag, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/* ─── Constants ──────────────────────────────────────────── */
const TODAY = new Date().toISOString().split('T')[0];

const STATUS_COLS: { key: TaskStatus; label: string; color: string; canDropInto: boolean }[] = [
  { key: 'TODO',        label: 'Cần làm',    color: 'bg-gray-100 text-gray-700',    canDropInto: true  },
  { key: 'IN_PROGRESS', label: 'Đang làm',   color: 'bg-blue-50 text-blue-700',     canDropInto: true  },
  { key: 'DONE',        label: 'Hoàn thành', color: 'bg-green-50 text-green-700',   canDropInto: true  },
  { key: 'CANCELLED',   label: 'Đã hủy',     color: 'bg-red-50 text-red-700',       canDropInto: true  },
  { key: 'QUA_HAN',     label: 'Quá hạn',    color: 'bg-orange-50 text-orange-700', canDropInto: false },
];

const STATUS_LABELS: Record<string, string> = {
  TODO: 'Cần làm', IN_PROGRESS: 'Đang làm', DONE: 'Hoàn thành',
  CANCELLED: 'Đã hủy', QUA_HAN: 'Quá hạn',
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW:    'bg-gray-100 text-gray-600',
  NORMAL: 'bg-blue-50 text-blue-700',
  HIGH:   'bg-amber-50 text-amber-700',
  URGENT: 'bg-red-50 text-red-700',
};
const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Thấp', NORMAL: 'Bình thường', HIGH: 'Cao', URGENT: 'Khẩn',
};
const FIELD_LABELS: Record<string, string> = {
  status: 'Trạng thái', title: 'Tiêu đề', description: 'Mô tả',
  assigneeId: 'Người được giao', priority: 'Độ ưu tiên', dueDate: 'Hạn',
};

/* ─── Helpers ────────────────────────────────────────────── */
function toDateInput(v?: string) { return v ? v.split('T')[0] : ''; }

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d} ngày trước` : new Date(dateStr).toLocaleDateString('vi-VN');
}

function fmtHistVal(field: string, val: string, users: User[]) {
  if (!val) return '(trống)';
  if (field === 'status') return STATUS_LABELS[val] || val;
  if (field === 'priority') return PRIORITY_LABELS[val as TaskPriority] || val;
  if (field === 'assigneeId') return users.find(u => u.id === val)?.fullName || val.slice(0, 8) + '…';
  if (field === 'dueDate') { try { return new Date(val).toLocaleDateString('vi-VN'); } catch { return val; } }
  return val.length > 60 ? val.slice(0, 60) + '…' : val;
}

/* ─── Page ───────────────────────────────────────────────── */
export default function ManageTasksPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterAssignee, setFilterAssignee] = useState<string>('');
  const [filterDepartment, setFilterDepartment] = useState<string>('');
  const [newComment, setNewComment] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [editForm, setEditForm] = useState<{ status: string; priority: string; assigneeId: string; dueDate: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const dragRef = useRef<{ id: number; fromStatus: TaskStatus } | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);

  const isManager = user?.role === 'GIAM_DOC' || user?.role === 'QUAN_LY';

  useEffect(() => {
    if (taskDetail) {
      setEditForm({
        status: taskDetail.status,
        priority: taskDetail.priority,
        assigneeId: taskDetail.assignee?.id || '',
        dueDate: toDateInput(taskDetail.dueDate),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskDetail?.id]);

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['all-tasks', filterStatus, filterAssignee],
    queryFn: () => api.get('/tasks', {
      params: {
        ...(filterStatus   ? { status: filterStatus }       : {}),
        ...(filterAssignee ? { assigneeId: filterAssignee } : {}),
      },
    }).then(r => r.data),
    enabled: isManager,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
    enabled: isManager,
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments').then(r => r.data),
    enabled: isManager,
  });

  const { data: taskDetail } = useQuery<Task>({
    queryKey: ['task', selectedTask?.id],
    queryFn: () => api.get(`/tasks/${selectedTask!.id}`).then(r => r.data),
    enabled: !!selectedTask,
  });

  const { data: taskHistory = [] } = useQuery<TaskHistory[]>({
    queryKey: ['task-history', selectedTask?.id],
    queryFn: () => api.get(`/tasks/${selectedTask!.id}/history`).then(r => r.data),
    enabled: !!selectedTask && showHistory,
  });

  const updateTask = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.patch(`/tasks/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-tasks'] });
      qc.invalidateQueries({ queryKey: ['task'] });
      qc.invalidateQueries({ queryKey: ['task-history'] });
      toast.success('Đã lưu thay đổi');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Không thể thay đổi'),
  });

  const deleteTask = useMutation({
    mutationFn: (id: number) => api.delete(`/tasks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-tasks'] });
      setSelectedTask(null);
      setShowDeleteConfirm(false);
      toast.success('Đã xóa công việc');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi xóa công việc'),
  });

  const addComment = useMutation({
    mutationFn: ({ taskId, body }: { taskId: number; body: string }) =>
      api.post(`/tasks/${taskId}/comments`, { body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task', selectedTask?.id] });
      setNewComment('');
    },
  });

  const createTask = useMutation({
    mutationFn: (data: any) => api.post('/tasks', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-tasks'] });
      setShowCreate(false);
      toast.success('Đã tạo công việc');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi tạo công việc'),
  });

  if (!isManager) {
    return <div className="flex items-center justify-center h-full text-sm text-gray-400">Không có quyền truy cập</div>;
  }

  const usersInDept = filterDepartment ? users.filter(u => String(u.departmentId) === filterDepartment) : users;
  const filteredTasks = filterDepartment
    ? tasks.filter(t => !t.assignee || usersInDept.some(u => u.id === t.assignee!.id))
    : tasks;
  const grouped = STATUS_COLS.map(col => ({ ...col, tasks: filteredTasks.filter(t => t.status === col.key) }));

  const handleDrop = (targetStatus: TaskStatus) => {
    const drag = dragRef.current;
    if (!drag) { setDragOverCol(null); return; }
    if (targetStatus === 'QUA_HAN') { setDragOverCol(null); dragRef.current = null; return; }
    if (drag.fromStatus === 'QUA_HAN' && targetStatus !== 'DONE') {
      toast.error('Công việc quá hạn chỉ có thể chuyển sang "Hoàn thành"');
      setDragOverCol(null); dragRef.current = null; return;
    }
    if (drag.fromStatus !== targetStatus) {
      updateTask.mutate({ id: drag.id, data: { status: targetStatus } });
      toast.success(`Đã chuyển sang "${STATUS_COLS.find(c => c.key === targetStatus)?.label}"`);
    }
    setDragOverCol(null); dragRef.current = null;
  };

  const allowedStatuses = (cur: TaskStatus) =>
    cur === 'QUA_HAN'
      ? STATUS_COLS.filter(s => s.key === 'QUA_HAN' || s.key === 'DONE')
      : STATUS_COLS.filter(s => s.key !== 'QUA_HAN');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Quản lý công việc"
        description={`${filteredTasks.length} công việc${filterDepartment ? ` • ${departments.find(d => String(d.id) === filterDepartment)?.name}` : ' toàn công ty'}`}
        actions={
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 h-8 px-3 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-md transition-colors">
            <Plus size={14} /> Tạo mới
          </button>
        }
      />

      {/* Filter bar */}
      <div className="px-6 py-3 bg-white border-b border-gray-100 flex flex-wrap gap-2 items-center">
        {['', ...STATUS_COLS.map(c => c.key)].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`flex-shrink-0 px-3 py-1 text-xs font-medium rounded-md transition-colors ${filterStatus === s ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}>
            {s === '' ? 'Tất cả' : STATUS_COLS.find(c => c.key === s)?.label}
          </button>
        ))}
        <span className="w-px h-4 bg-gray-200 mx-1" />
        <div className="relative">
          <select value={filterDepartment} onChange={e => { setFilterDepartment(e.target.value); setFilterAssignee(''); }}
            className="h-7 pl-2 pr-7 text-xs border border-gray-200 rounded-md appearance-none bg-white text-gray-600 outline-none focus:border-indigo-400">
            <option value="">Tất cả bộ phận</option>
            {departments.filter(d => d.isActive).map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
            className="h-7 pl-2 pr-7 text-xs border border-gray-200 rounded-md appearance-none bg-white text-gray-600 outline-none focus:border-indigo-400">
            <option value="">Tất cả nhân viên</option>
            {usersInDept.map((u: User) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto p-4 sm:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex gap-3 h-full" style={{ minWidth: '900px' }}>
            {grouped.map(col => (
              <div key={col.key}
                className={`flex-1 flex flex-col min-w-[175px] rounded-xl p-2 transition-colors duration-150 ${
                  dragOverCol === col.key && col.canDropInto
                    ? 'bg-indigo-50 ring-2 ring-inset ring-indigo-300'
                    : col.key === 'QUA_HAN' ? 'bg-orange-50/40' : 'bg-gray-50/60'
                }`}
                onDragOver={e => e.preventDefault()}
                onDragEnter={() => col.canDropInto && setDragOverCol(col.key)}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null); }}
                onDrop={e => { e.preventDefault(); handleDrop(col.key); }}
              >
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${col.color}`}>{col.label}</span>
                  <span className="text-xs text-gray-400">{col.tasks.length}</span>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto">
                  {col.tasks.map(task => (
                    <div key={task.id} draggable
                      onDragStart={e => { dragRef.current = { id: task.id, fromStatus: col.key }; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(task.id)); }}
                      onDragEnd={() => setDragOverCol(null)}
                      onClick={() => { setSelectedTask(task); setShowHistory(false); setShowDeleteConfirm(false); setEditForm(null); }}
                      className={`bg-white border rounded-lg p-3.5 cursor-grab active:cursor-grabbing hover:shadow-sm transition-all select-none ${
                        task.status === 'QUA_HAN' ? 'border-orange-200 hover:border-orange-300' : 'border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-900 mb-2 leading-snug">{task.title}</p>
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${PRIORITY_COLORS[task.priority]}`}>
                          {PRIORITY_LABELS[task.priority]}
                        </span>
                        {task.dueDate && (
                          <span className={`text-[11px] ${task.status === 'QUA_HAN' ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>
                            {new Date(task.dueDate).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                      </div>
                      {task.assignee && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] text-indigo-600 font-semibold">{task.assignee.fullName?.charAt(0)}</span>
                          </div>
                          <span className="text-[11px] text-gray-500 truncate">{task.assignee.fullName}</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {col.tasks.length === 0 && dragOverCol === col.key && col.canDropInto && (
                    <div className="h-16 border-2 border-dashed border-indigo-300 rounded-lg flex items-center justify-center">
                      <span className="text-xs text-indigo-400">Thả vào đây</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Task Detail Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={o => { if (!o) { setSelectedTask(null); setShowDeleteConfirm(false); } }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          {taskDetail && (
            <>
              {/* Header */}
              <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                <div className="flex items-start gap-3 pr-6">
                  <span className={`mt-0.5 flex-shrink-0 text-[11px] font-medium px-2 py-0.5 rounded ${STATUS_COLS.find(s => s.key === taskDetail.status)?.color}`}>
                    {STATUS_LABELS[taskDetail.status]}
                  </span>
                  <h2 className="text-base font-semibold text-gray-900 leading-snug">{taskDetail.title}</h2>
                </div>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                {/* Metadata grid */}
                {editForm && (
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 bg-gray-50 rounded-xl p-4">
                  {/* Trạng thái */}
                  <div>
                    <p className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
                      <Tag size={10} /> Trạng thái
                    </p>
                    <select value={editForm.status}
                      onChange={e => setEditForm(f => f ? { ...f, status: e.target.value } : f)}
                      className="w-full h-8 px-2 text-sm border border-gray-200 rounded-md bg-white outline-none focus:border-indigo-400">
                      {allowedStatuses(taskDetail.status).map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>

                  {/* Độ ưu tiên */}
                  <div>
                    <p className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
                      <Flag size={10} /> Độ ưu tiên
                    </p>
                    <select value={editForm.priority}
                      onChange={e => setEditForm(f => f ? { ...f, priority: e.target.value } : f)}
                      className="w-full h-8 px-2 text-sm border border-gray-200 rounded-md bg-white outline-none focus:border-indigo-400">
                      {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>

                  {/* Giao cho */}
                  <div>
                    <p className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
                      <UserIcon size={10} /> Giao cho
                    </p>
                    <select value={editForm.assigneeId}
                      onChange={e => setEditForm(f => f ? { ...f, assigneeId: e.target.value } : f)}
                      className="w-full h-8 px-2 text-sm border border-gray-200 rounded-md bg-white outline-none focus:border-indigo-400">
                      <option value="">-- Chưa giao --</option>
                      {users.map((u: User) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                    </select>
                  </div>

                  {/* Hạn */}
                  <div>
                    <p className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
                      <Calendar size={10} /> Hạn hoàn thành
                    </p>
                    <input type="date"
                      min={TODAY}
                      value={editForm.dueDate}
                      onChange={e => setEditForm(f => f ? { ...f, dueDate: e.target.value } : f)}
                      className={`w-full h-8 px-2 text-sm border rounded-md bg-white outline-none focus:border-indigo-400 ${
                        taskDetail.status === 'QUA_HAN' ? 'border-orange-300 text-orange-600' : 'border-gray-200'
                      }`}
                    />
                  </div>
                </div>
                )}

                {/* Description */}
                {taskDetail.description && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Mô tả</p>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 leading-relaxed whitespace-pre-wrap">{taskDetail.description}</p>
                  </div>
                )}

                {/* Comments */}
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-3">Bình luận ({taskDetail.comments?.length || 0})</p>
                  {(taskDetail.comments?.length ?? 0) > 0 && (
                    <div className="space-y-2 mb-3">
                      {taskDetail.comments?.map((c: any) => (
                        <div key={c.id} className="flex gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 flex-shrink-0 flex items-center justify-center">
                            <span className="text-[11px] text-indigo-600 font-semibold">{c.user?.fullName?.charAt(0)}</span>
                          </div>
                          <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2.5">
                            <p className="text-xs font-medium text-gray-700 mb-0.5">{c.user?.fullName}</p>
                            <p className="text-sm text-gray-800 leading-relaxed">{c.body}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input value={newComment} onChange={e => setNewComment(e.target.value)}
                      placeholder="Thêm bình luận..."
                      className="flex-1 h-9 px-3 text-sm border border-gray-200 rounded-md outline-none focus:border-indigo-400"
                      onKeyDown={e => { if (e.key === 'Enter' && newComment.trim()) addComment.mutate({ taskId: taskDetail.id, body: newComment.trim() }); }}
                    />
                    <button onClick={() => newComment.trim() && addComment.mutate({ taskId: taskDetail.id, body: newComment.trim() })}
                      className="h-9 px-4 bg-indigo-500 text-white text-sm rounded-md hover:bg-indigo-600">
                      Gửi
                    </button>
                  </div>
                </div>

                {/* History */}
                <div className="border-t border-gray-100 pt-4">
                  <button onClick={() => setShowHistory(s => !s)}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-3">
                    <History size={12} />
                    {showHistory ? 'Ẩn lịch sử' : 'Xem lịch sử thay đổi'}
                  </button>
                  {showHistory && (
                    <div className="space-y-3">
                      {taskHistory.length === 0
                        ? <p className="text-xs text-gray-400">Chưa có lịch sử</p>
                        : taskHistory.map(h => (
                          <div key={h.id} className="flex gap-2.5 text-xs">
                            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-[10px] text-gray-500 font-semibold">{h.changedBy?.fullName?.charAt(0) || 'H'}</span>
                            </div>
                            <div className="flex-1 leading-relaxed">
                              <span className="font-medium text-gray-700">{h.changedBy?.fullName || 'Hệ thống'}</span>
                              {' '}
                              {h.changeType === 'CREATED' && <span className="text-gray-500">đã tạo công việc này</span>}
                              {h.changeType === 'STATUS_CHANGE' && (
                                <span className="text-gray-500">
                                  đổi <span className="font-medium">{FIELD_LABELS[h.fieldName!]}</span>:{' '}
                                  <span className="text-gray-400 line-through">{fmtHistVal(h.fieldName!, h.oldValue!, users)}</span>
                                  {' → '}
                                  <span className="text-gray-800">{fmtHistVal(h.fieldName!, h.newValue!, users)}</span>
                                </span>
                              )}
                              {h.changeType === 'FIELD_UPDATE' && (
                                <span className="text-gray-500">
                                  cập nhật <span className="font-medium">{FIELD_LABELS[h.fieldName!] || h.fieldName}</span>
                                  {h.fieldName !== 'description' && (
                                    <>
                                      {': '}
                                      <span className="text-gray-400 line-through">{fmtHistVal(h.fieldName!, h.oldValue!, users)}</span>
                                      {' → '}
                                      <span className="text-gray-800">{fmtHistVal(h.fieldName!, h.newValue!, users)}</span>
                                    </>
                                  )}
                                </span>
                              )}
                              <span className="text-gray-400 ml-1.5">· {timeAgo(h.createdAt)}</span>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-gray-100 flex justify-between items-center bg-gray-50/50">
                <p className="text-[11px] text-gray-400">
                  Tạo bởi {taskDetail.createdBy?.fullName} · {new Date(taskDetail.createdAt).toLocaleDateString('vi-VN')}
                </p>
                <div className="flex items-center gap-2">
                  {/* Save button — only visible when there are unsaved changes */}
                  {editForm && (
                    editForm.status !== taskDetail.status ||
                    editForm.priority !== taskDetail.priority ||
                    editForm.assigneeId !== (taskDetail.assignee?.id || '') ||
                    editForm.dueDate !== toDateInput(taskDetail.dueDate)
                  ) && (
                    <button
                      onClick={() => {
                        if (!editForm) return;
                        const data: Record<string, any> = {};
                        if (editForm.status !== taskDetail.status) data.status = editForm.status;
                        if (editForm.priority !== taskDetail.priority) data.priority = editForm.priority;
                        if (editForm.assigneeId !== (taskDetail.assignee?.id || '')) data.assigneeId = editForm.assigneeId;
                        if (editForm.dueDate !== toDateInput(taskDetail.dueDate)) data.dueDate = editForm.dueDate;
                        updateTask.mutate({ id: taskDetail.id, data });
                      }}
                      disabled={updateTask.isPending}
                      className="flex items-center gap-1.5 h-7 px-3 text-xs text-white bg-indigo-500 rounded-md hover:bg-indigo-600 disabled:opacity-50">
                      <Save size={11} />
                      {updateTask.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                  )}

                  {/* Delete with confirmation */}
                  {showDeleteConfirm ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-500">Xác nhận xóa?</span>
                      <button onClick={() => deleteTask.mutate(taskDetail.id)} disabled={deleteTask.isPending}
                        className="h-7 px-3 text-xs text-white bg-red-500 rounded-md hover:bg-red-600 disabled:opacity-50">
                        {deleteTask.isPending ? '...' : 'Xóa'}
                      </button>
                      <button onClick={() => setShowDeleteConfirm(false)}
                        className="h-7 px-3 text-xs text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50">
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setShowDeleteConfirm(true)}
                      className="h-7 px-3 text-xs text-red-600 border border-red-200 rounded-md hover:bg-red-50">
                      Xóa công việc
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <CreateTaskDialog open={showCreate} onClose={() => setShowCreate(false)} users={users} onSubmit={(d: any) => createTask.mutate(d)} />
    </div>
  );
}

/* ─── Create dialog ──────────────────────────────────────── */
function CreateTaskDialog({ open, onClose, users, onSubmit }: any) {
  const [form, setForm] = useState({ title: '', description: '', assigneeId: '', priority: 'NORMAL', dueDate: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...form, assigneeId: form.assigneeId || undefined, dueDate: form.dueDate || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Tạo công việc mới</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Tiêu đề *</label>
            <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full h-9 px-3 text-sm border border-gray-200 rounded-md outline-none focus:border-indigo-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Mô tả</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md outline-none focus:border-indigo-400 resize-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Giao cho</label>
            <select value={form.assigneeId} onChange={e => setForm(f => ({ ...f, assigneeId: e.target.value }))}
              className="w-full h-9 px-2 text-sm border border-gray-200 rounded-md">
              <option value="">-- Chưa chọn --</option>
              {users.map((u: any) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Độ ưu tiên</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full h-9 px-2 text-sm border border-gray-200 rounded-md">
                <option value="LOW">Thấp</option>
                <option value="NORMAL">Bình thường</option>
                <option value="HIGH">Cao</option>
                <option value="URGENT">Khẩn</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Hạn hoàn thành</label>
              <input type="date" min={TODAY} value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                className="w-full h-9 px-2 text-sm border border-gray-200 rounded-md" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="h-8 px-4 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50">Hủy</button>
            <button type="submit"
              className="h-8 px-4 text-sm text-white bg-indigo-500 rounded-md hover:bg-indigo-600">Tạo</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

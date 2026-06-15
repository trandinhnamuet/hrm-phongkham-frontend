'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { useAuth } from '@/contexts/auth-context';
import api from '@/lib/api';
import { Task, TaskStatus, TaskPriority } from '@/types';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TaskDetailDialog } from '@/components/tasks/task-detail-dialog';

const STATUS_COLS: { key: TaskStatus; label: string; color: string }[] = [
  { key: 'TODO',        label: 'Cần làm',     color: 'bg-gray-100 text-gray-700' },
  { key: 'IN_PROGRESS', label: 'Đang làm',    color: 'bg-blue-50 text-blue-700' },
  { key: 'DONE',        label: 'Hoàn thành',  color: 'bg-green-50 text-green-700' },
  { key: 'CANCELLED',   label: 'Đã hủy',      color: 'bg-red-50 text-red-700' },
];

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW:    'bg-gray-100 text-gray-600',
  NORMAL: 'bg-blue-50 text-blue-700',
  HIGH:   'bg-amber-50 text-amber-700',
  URGENT: 'bg-red-50 text-red-700',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Thấp', NORMAL: 'Bình thường', HIGH: 'Cao', URGENT: 'Khẩn',
};

export default function TasksPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Drag-and-drop state
  const dragRef = useRef<{ id: number; fromStatus: TaskStatus } | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);

  // Directors/managers need explicit assigneeId filter; employees are filtered server-side
  const isManagerOrDirector = user?.role === 'GIAM_DOC' || user?.role === 'QUAN_LY';

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['my-tasks', filterStatus, user?.id],
    queryFn: () => api.get('/tasks', {
      params: {
        ...(filterStatus ? { status: filterStatus } : {}),
        ...(isManagerOrDirector ? { assigneeId: user?.id } : {}),
      },
    }).then(r => r.data),
    enabled: !!user,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
    enabled: user?.role !== 'NHAN_VIEN',
  });

  // Mutation đổi trạng thái khi kéo-thả kanban
  const updateTask = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.patch(`/tasks/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-tasks'] }),
  });

  const createTask = useMutation({
    mutationFn: (data: any) => api.post('/tasks', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-tasks'] });
      setShowCreate(false);
      toast.success('Đã tạo công việc');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi tạo công việc'),
  });

  const grouped = STATUS_COLS.map(col => ({
    ...col,
    tasks: tasks.filter(t => t.status === col.key),
  }));

  const handleDrop = (targetStatus: TaskStatus) => {
    const drag = dragRef.current;
    if (drag && drag.fromStatus !== targetStatus) {
      updateTask.mutate({ id: drag.id, data: { status: targetStatus } });
      const col = STATUS_COLS.find(c => c.key === targetStatus);
      toast.success(`Đã chuyển sang "${col?.label}"`);
    }
    setDragOverCol(null);
    dragRef.current = null;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Công việc của tôi"
        description={`${tasks.length} công việc được giao`}
        actions={
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 h-8 px-3 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-md transition-colors">
            <Plus size={14} />
            Tạo mới
          </button>
        }
      />

      {/* Filter bar */}
      <div className="px-6 py-3 bg-white border-b border-gray-100 flex gap-2 overflow-x-auto">
        {['', ...STATUS_COLS.map(c => c.key)].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`flex-shrink-0 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              filterStatus === s ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}>
            {s === '' ? 'Tất cả' : STATUS_COLS.find(c => c.key === s)?.label}
          </button>
        ))}
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto p-4 sm:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex gap-3 h-full" style={{ minWidth: '720px' }}>
            {grouped.map(col => (
              <div
                key={col.key}
                className={`flex-1 flex flex-col min-w-[200px] rounded-xl p-2 transition-colors duration-150 ${
                  dragOverCol === col.key
                    ? 'bg-indigo-50 ring-2 ring-inset ring-indigo-300'
                    : 'bg-gray-50/60'
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={() => setDragOverCol(col.key)}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverCol(null);
                  }
                }}
                onDrop={(e) => { e.preventDefault(); handleDrop(col.key); }}
              >
                {/* Column header */}
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${col.color}`}>{col.label}</span>
                  <span className="text-xs text-gray-400">{col.tasks.length}</span>
                </div>

                {/* Task cards */}
                <div className="flex-1 space-y-2 overflow-y-auto">
                  {col.tasks.map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => {
                        dragRef.current = { id: task.id, fromStatus: col.key };
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', String(task.id));
                      }}
                      onDragEnd={() => setDragOverCol(null)}
                      onClick={() => setSelectedTask(task)}
                      className="bg-white border border-gray-200 rounded-lg p-3.5 cursor-grab active:cursor-grabbing hover:border-indigo-300 hover:shadow-sm transition-all select-none"
                    >
                      <p className="text-sm font-medium text-gray-900 mb-2">{task.title}</p>
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${PRIORITY_COLORS[task.priority]}`}>
                          {PRIORITY_LABELS[task.priority]}
                        </span>
                        {task.dueDate && (
                          <span className="text-[11px] text-gray-400">
                            {new Date(task.dueDate).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                      </div>
                      {task.assignee && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-[10px] text-indigo-600 font-semibold">
                              {task.assignee.fullName?.charAt(0)}
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-500">{task.assignee.fullName}</span>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Empty drop hint */}
                  {col.tasks.length === 0 && dragOverCol === col.key && (
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

      {/* Task Detail Dialog (dùng chung với màn /tasks/manage) */}
      <TaskDetailDialog
        taskId={selectedTask?.id ?? null}
        onClose={() => setSelectedTask(null)}
        users={users}
        canDelete={user?.role !== 'NHAN_VIEN'}
        onChanged={() => qc.invalidateQueries({ queryKey: ['my-tasks'] })}
      />

      <CreateTaskDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        users={users}
        userRole={user?.role}
        userId={user?.id}
        onSubmit={(data: any) => createTask.mutate(data)}
      />
    </div>
  );
}

function CreateTaskDialog({ open, onClose, users, userRole, userId, onSubmit }: any) {
  const [form, setForm] = useState({ title: '', description: '', assigneeId: '', priority: 'NORMAL', dueDate: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...form, assigneeId: form.assigneeId || undefined, dueDate: form.dueDate || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
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
              <label className="text-xs font-medium text-gray-700 block mb-1">Hạn</label>
              <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                className="w-full h-9 px-2 text-sm border border-gray-200 rounded-md" />
            </div>
          </div>
          {userRole !== 'NHAN_VIEN' && (
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Giao cho</label>
              <select value={form.assigneeId} onChange={e => setForm(f => ({ ...f, assigneeId: e.target.value }))}
                className="w-full h-9 px-2 text-sm border border-gray-200 rounded-md">
                <option value="">-- Chưa chọn --</option>
                {users.map((u: any) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="h-8 px-4 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50">
              Hủy
            </button>
            <button type="submit"
              className="h-8 px-4 text-sm text-white bg-indigo-500 rounded-md hover:bg-indigo-600">
              Tạo
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

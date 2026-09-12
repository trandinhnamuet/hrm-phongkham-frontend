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
import { AssigneeStack, AssigneePicker } from '@/components/tasks/assignee-picker';
import { ReviewBadge } from '@/components/tasks/review-badge';
import { MobileBoard } from '@/components/tasks/mobile-board';

const STATUS_COLS: { key: TaskStatus; label: string; color: string }[] = [
  { key: 'TODO',        label: 'Cần làm',     color: 'bg-gray-100 text-gray-700' },
  { key: 'IN_PROGRESS', label: 'Đang làm',    color: 'bg-blue-50 text-blue-700' },
  { key: 'DONE',        label: 'Hoàn thành',  color: 'bg-green-50 text-green-700' },
  { key: 'CANCELLED',   label: 'Đã hủy',      color: 'bg-red-50 text-red-700' },
  // Thiếu cột này thì việc quá hạn không nằm ở đâu, nhân viên không thấy để xử lý.
  { key: 'QUA_HAN',     label: 'Quá hạn',     color: 'bg-orange-50 text-orange-700' },
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
    // Không tự kéo vào Quá hạn; việc quá hạn chỉ chuyển được sang Hoàn thành.
    if (drag && (targetStatus === 'QUA_HAN' || (drag.fromStatus === 'QUA_HAN' && targetStatus !== 'DONE'))) {
      if (drag.fromStatus === 'QUA_HAN') toast.error('Công việc quá hạn chỉ có thể chuyển sang "Hoàn thành"');
      setDragOverCol(null); dragRef.current = null; return;
    }
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
            className="btn btn-primary">
            <Plus size={14} />
            Tạo mới
          </button>
        }
      />

      {/* Filter bar */}
      <div className="hidden lg:flex px-6 py-3 bg-white border-b border-gray-100 gap-2 overflow-x-auto">
        {['', ...STATUS_COLS.map(c => c.key)].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`flex-shrink-0 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              filterStatus === s ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}>
            {s === '' ? 'Tất cả' : STATUS_COLS.find(c => c.key === s)?.label}
          </button>
        ))}
      </div>

      {/* Kanban desktop — kéo-thả, chỉ từ lg */}
      <div className="hidden lg:block flex-1 overflow-x-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex gap-3 h-full" style={{ minWidth: '900px' }}>
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
                      {task.reviewStatus && (
                        <div className="mt-2"><ReviewBadge status={task.reviewStatus} /></div>
                      )}
                      <AssigneeStack assignees={task.assignees} />
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

      {/* Mobile: mỗi cột trọn màn hình, vuốt ngang, chuyển trạng thái bằng nút */}
      <div className="lg:hidden flex-1 min-h-0">
        <MobileBoard
          columns={STATUS_COLS}
          tasks={tasks}
          loading={isLoading}
          onOpen={setSelectedTask}
          canMoveTo={(from, to) => to !== 'QUA_HAN' && (from !== 'QUA_HAN' || to === 'DONE')}
          onMove={(task, to) => {
            updateTask.mutate({ id: task.id, data: { status: to } });
            toast.success(`Đã chuyển sang "${STATUS_COLS.find(c => c.key === to)?.label}"`);
          }}
        />
      </div>

      {/* Task Detail Dialog (dùng chung với màn /tasks/manage) */}
      <TaskDetailDialog
        taskId={selectedTask?.id ?? null}
        onClose={() => setSelectedTask(null)}
        users={users}
        canDelete={user?.role !== 'NHAN_VIEN'}
        currentUserId={user?.id}
        isManager={user?.role === 'GIAM_DOC' || user?.role === 'QUAN_LY'}
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
  const [form, setForm] = useState({
    title: '', description: '', assigneeIds: [] as string[], priority: 'NORMAL', dueDate: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...form,
      // Không chọn ai thì để backend mặc định giao cho người tạo.
      assigneeIds: form.assigneeIds.length > 0 ? form.assigneeIds : undefined,
      dueDate: form.dueDate || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Tạo công việc mới</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className="lbl">Tiêu đề *</label>
            <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="field" />
          </div>
          <div>
            <label className="lbl">Mô tả</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3} className="field field-area" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="lbl">Độ ưu tiên</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="field">
                <option value="LOW">Thấp</option>
                <option value="NORMAL">Bình thường</option>
                <option value="HIGH">Cao</option>
                <option value="URGENT">Khẩn</option>
              </select>
            </div>
            <div>
              <label className="lbl">Hạn</label>
              <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                className="field" />
            </div>
          </div>
          {userRole !== 'NHAN_VIEN' && (
            <div>
              <label className="lbl">
                Giao cho <span className="text-gray-400 font-normal">(tìm và thêm nhiều người)</span>
              </label>
              <AssigneePicker users={users} value={form.assigneeIds}
                onChange={ids => setForm(f => ({ ...f, assigneeIds: ids }))} />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="btn btn-secondary">
              Hủy
            </button>
            <button type="submit"
              className="btn btn-primary">
              Tạo
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Task, TaskStatus, TaskPriority, User, TaskHistory } from '@/types';
import { History, Calendar, User as UserIcon, Flag, Tag, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const TODAY = new Date().toISOString().split('T')[0];

export const TASK_STATUS_META: Record<TaskStatus, { label: string; color: string }> = {
  TODO:        { label: 'Cần làm',    color: 'bg-gray-100 text-gray-700' },
  IN_PROGRESS: { label: 'Đang làm',   color: 'bg-blue-50 text-blue-700' },
  DONE:        { label: 'Hoàn thành', color: 'bg-green-50 text-green-700' },
  CANCELLED:   { label: 'Đã hủy',     color: 'bg-red-50 text-red-700' },
  QUA_HAN:     { label: 'Quá hạn',    color: 'bg-orange-50 text-orange-700' },
};

export const TASK_PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
  LOW:    { label: 'Thấp',        color: 'bg-gray-100 text-gray-600' },
  NORMAL: { label: 'Bình thường', color: 'bg-blue-50 text-blue-700' },
  HIGH:   { label: 'Cao',         color: 'bg-amber-50 text-amber-700' },
  URGENT: { label: 'Khẩn',        color: 'bg-red-50 text-red-700' },
};

const FIELD_LABELS: Record<string, string> = {
  status: 'Trạng thái', title: 'Tiêu đề', description: 'Mô tả',
  assigneeId: 'Người được giao', priority: 'Độ ưu tiên', dueDate: 'Hạn',
};

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
  if (field === 'status') return TASK_STATUS_META[val as TaskStatus]?.label || val;
  if (field === 'priority') return TASK_PRIORITY_META[val as TaskPriority]?.label || val;
  if (field === 'assigneeId') return users.find(u => u.id === val)?.fullName || val.slice(0, 8) + '…';
  if (field === 'dueDate') { try { return new Date(val).toLocaleDateString('vi-VN'); } catch { return val; } }
  return val.length > 60 ? val.slice(0, 60) + '…' : val;
}

interface EditForm {
  title: string;
  description: string;
  status: string;
  priority: string;
  assigneeId: string;
  dueDate: string;
}

interface Props {
  taskId: number | null;
  onClose: () => void;
  /** Danh sách nhân viên để hiển thị dropdown "Giao cho". Nếu rỗng → người được giao chỉ hiển thị, không sửa. */
  users?: User[];
  /** Cho phép xóa công việc (Giám đốc / Quản lý). */
  canDelete?: boolean;
  /** Gọi sau khi lưu / xóa để parent làm mới danh sách của mình. */
  onChanged?: () => void;
}

export function TaskDetailDialog({ taskId, onClose, users = [], canDelete = false, onChanged }: Props) {
  const qc = useQueryClient();
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [newComment, setNewComment] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  const canAssign = users.length > 0;

  const { data: taskDetail } = useQuery<Task>({
    queryKey: ['task', taskId],
    queryFn: () => api.get(`/tasks/${taskId}`).then(r => r.data),
    enabled: !!taskId,
  });

  const { data: taskHistory = [] } = useQuery<TaskHistory[]>({
    queryKey: ['task-history', taskId],
    queryFn: () => api.get(`/tasks/${taskId}/history`).then(r => r.data),
    enabled: !!taskId && showHistory,
  });

  useEffect(() => {
    if (taskDetail) {
      setEditForm({
        title: taskDetail.title,
        description: taskDetail.description || '',
        status: taskDetail.status,
        priority: taskDetail.priority,
        assigneeId: taskDetail.assignee?.id || '',
        dueDate: toDateInput(taskDetail.dueDate),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskDetail?.id]);

  // Reset trạng thái UI tạm thời khi đổi sang task khác
  useEffect(() => {
    setShowHistory(false);
    setShowDeleteConfirm(false);
    setNewComment('');
  }, [taskId]);

  // Tự co giãn chiều cao ô tiêu đề
  useEffect(() => {
    const el = titleRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }
  }, [editForm?.title]);

  const updateTask = useMutation({
    mutationFn: (data: any) => api.patch(`/tasks/${taskId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task', taskId] });
      qc.invalidateQueries({ queryKey: ['task-history', taskId] });
      onChanged?.();
      onClose();
      toast.success('Đã lưu thay đổi');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Không thể lưu'),
  });

  const deleteTask = useMutation({
    mutationFn: () => api.delete(`/tasks/${taskId}`),
    onSuccess: () => {
      onChanged?.();
      setShowDeleteConfirm(false);
      onClose();
      toast.success('Đã xóa công việc');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi xóa công việc'),
  });

  const addComment = useMutation({
    mutationFn: (body: string) => api.post(`/tasks/${taskId}/comments`, { body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task', taskId] });
      setNewComment('');
    },
  });

  const allowedStatuses: TaskStatus[] = taskDetail?.status === 'QUA_HAN'
    ? ['QUA_HAN', 'DONE']
    : ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'];

  const dirty = !!(taskDetail && editForm && (
    editForm.title !== taskDetail.title ||
    editForm.description !== (taskDetail.description || '') ||
    editForm.status !== taskDetail.status ||
    editForm.priority !== taskDetail.priority ||
    editForm.assigneeId !== (taskDetail.assignee?.id || '') ||
    editForm.dueDate !== toDateInput(taskDetail.dueDate)
  ));

  const titleEmpty = !editForm?.title.trim();

  const handleSave = () => {
    if (!editForm || !taskDetail || titleEmpty) return;
    const data: Record<string, any> = {};
    if (editForm.title !== taskDetail.title) data.title = editForm.title.trim();
    if (editForm.description !== (taskDetail.description || '')) data.description = editForm.description;
    if (editForm.status !== taskDetail.status) data.status = editForm.status;
    if (editForm.priority !== taskDetail.priority) data.priority = editForm.priority;
    if (editForm.assigneeId !== (taskDetail.assignee?.id || '')) data.assigneeId = editForm.assigneeId || null;
    if (editForm.dueDate !== toDateInput(taskDetail.dueDate)) data.dueDate = editForm.dueDate;
    updateTask.mutate(data);
  };

  return (
    <Dialog open={!!taskId} onOpenChange={o => { if (!o) { onClose(); setShowDeleteConfirm(false); } }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden gap-0">
        {taskDetail && editForm && (
          <>
            {/* Header — tiêu đề có thể sửa */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-2.5">
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${TASK_STATUS_META[taskDetail.status]?.color}`}>
                  {TASK_STATUS_META[taskDetail.status]?.label}
                </span>
                <span className="text-[11px] text-gray-400">#{taskDetail.id}</span>
              </div>
              <textarea
                ref={titleRef}
                rows={1}
                value={editForm.title}
                onChange={e => setEditForm(f => f ? { ...f, title: e.target.value } : f)}
                placeholder="Tiêu đề công việc"
                className="w-full -ml-2 px-2 py-1 text-lg font-semibold text-gray-900 leading-snug resize-none overflow-hidden rounded-md border border-transparent outline-none transition-colors hover:border-gray-200 focus:border-indigo-400 focus:bg-white"
              />
              {titleEmpty && <p className="text-[11px] text-red-500 mt-0.5 ml-0.5">Tiêu đề không được để trống</p>}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Metadata grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 bg-gray-50 rounded-xl p-4">
                {/* Trạng thái */}
                <div>
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
                    <Tag size={10} /> Trạng thái
                  </p>
                  <select value={editForm.status}
                    onChange={e => setEditForm(f => f ? { ...f, status: e.target.value } : f)}
                    className="w-full h-8 px-2 text-sm border border-gray-200 rounded-md bg-white outline-none focus:border-indigo-400">
                    {allowedStatuses.map(s => <option key={s} value={s}>{TASK_STATUS_META[s].label}</option>)}
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
                    {Object.entries(TASK_PRIORITY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>

                {/* Giao cho */}
                <div>
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
                    <UserIcon size={10} /> Giao cho
                  </p>
                  {canAssign ? (
                    <select value={editForm.assigneeId}
                      onChange={e => setEditForm(f => f ? { ...f, assigneeId: e.target.value } : f)}
                      className="w-full h-8 px-2 text-sm border border-gray-200 rounded-md bg-white outline-none focus:border-indigo-400">
                      <option value="">-- Chưa giao --</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                    </select>
                  ) : (
                    <div className="w-full h-8 px-2 flex items-center text-sm text-gray-700 border border-gray-200 rounded-md bg-white">
                      {taskDetail.assignee?.fullName || 'Chưa giao'}
                    </div>
                  )}
                </div>

                {/* Hạn */}
                <div>
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
                    <Calendar size={10} /> Hạn hoàn thành
                  </p>
                  <input type="date" min={TODAY} value={editForm.dueDate}
                    onChange={e => setEditForm(f => f ? { ...f, dueDate: e.target.value } : f)}
                    className={`w-full h-8 px-2 text-sm border rounded-md bg-white outline-none focus:border-indigo-400 ${
                      taskDetail.status === 'QUA_HAN' ? 'border-orange-300 text-orange-600' : 'border-gray-200'
                    }`}
                  />
                </div>
              </div>

              {/* Mô tả — có thể sửa */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Mô tả</p>
                <textarea
                  value={editForm.description}
                  onChange={e => setEditForm(f => f ? { ...f, description: e.target.value } : f)}
                  rows={4}
                  placeholder="Thêm mô tả cho công việc..."
                  className="w-full text-sm text-gray-700 bg-gray-50 rounded-lg p-3 leading-relaxed resize-y outline-none border border-transparent transition-colors focus:border-indigo-400 focus:bg-white placeholder:text-gray-400"
                />
              </div>

              {/* Bình luận */}
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
                    onKeyDown={e => { if (e.key === 'Enter' && newComment.trim()) addComment.mutate(newComment.trim()); }}
                  />
                  <button onClick={() => newComment.trim() && addComment.mutate(newComment.trim())}
                    className="h-9 px-4 bg-indigo-500 text-white text-sm rounded-md hover:bg-indigo-600">
                    Gửi
                  </button>
                </div>
              </div>

              {/* Lịch sử */}
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
            <div className="px-6 py-3 border-t border-gray-100 flex justify-between items-center bg-gray-50/50 gap-2">
              <p className="text-[11px] text-gray-400 truncate">
                Tạo bởi {taskDetail.createdBy?.fullName} · {new Date(taskDetail.createdAt).toLocaleDateString('vi-VN')}
              </p>
              <div className="flex items-center gap-2 flex-shrink-0">
                {dirty && (
                  <button onClick={handleSave} disabled={updateTask.isPending || titleEmpty}
                    className="flex items-center gap-1.5 h-7 px-3 text-xs text-white bg-indigo-500 rounded-md hover:bg-indigo-600 disabled:opacity-50">
                    <Save size={11} />
                    {updateTask.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                )}

                {canDelete && (
                  showDeleteConfirm ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-500">Xác nhận xóa?</span>
                      <button onClick={() => deleteTask.mutate()} disabled={deleteTask.isPending}
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
                  )
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

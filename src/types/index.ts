export type UserRole = 'GIAM_DOC' | 'QUAN_LY' | 'NHAN_VIEN';

export interface Department {
  id: number;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}
export type UserStatus = 'ACTIVE' | 'RESIGNED';

export interface User {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  positionTitle?: string;
  avatarUrl?: string;
  joinDate?: string;
  status: UserStatus;
  departmentId?: number;
  department?: Department;
  shiftId?: number;
  shift?: Shift;
  managedDepartments?: Department[];
  createdAt: string;
}

export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED' | 'QUA_HAN';

export interface Task {
  id: number;
  title: string;
  description?: string;
  createdBy: User;
  /** Danh sách người được giao — một công việc có thể giao cho nhiều người. */
  assignees?: User[];
  /** @deprecated backend vẫn trả về (= assignees[0]) cho client cũ. Dùng assignees. */
  assignee?: User;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  completedAt?: string;
  /** Đánh giá của người giao việc, chỉ có nghĩa khi status = DONE. */
  reviewStatus?: 'PENDING_REVIEW' | 'ACCEPTED' | 'RETURNED' | null;
  reviewNote?: string | null;
  reviewedBy?: User | null;
  reviewedAt?: string | null;
  comments?: TaskComment[];
  attachments?: TaskAttachment[];
  createdAt: string;
  updatedAt: string;
}

export type NotificationType = 'TASK_ASSIGNED' | 'TASK_COMMENT' | 'TASK_REVIEWED' | 'LEAVE_REVIEWED';

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
  actor?: User | null;
  isRead: boolean;
  createdAt: string;
}

export interface TaskHistory {
  id: number;
  taskId: number;
  changedBy?: User;
  changeType: 'CREATED' | 'STATUS_CHANGE' | 'FIELD_UPDATE';
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
}

export interface TaskComment {
  id: number;
  taskId: number;
  user: User;
  body: string;
  createdAt: string;
}

export interface TaskAttachment {
  id: number;
  taskId: number;
  uploadedBy: User;
  fileName: string;
  fileUrl: string;
  mimeType?: string;
  sizeBytes?: number;
  createdAt: string;
}

export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'ON_LEAVE' | 'HOLIDAY' | 'SHORT_HOURS';

/** Một ca = giờ làm việc của cả ngày: buổi sáng + buổi chiều. */
export interface Shift {
  id: number;
  code: string;
  name: string;
  morningStart: string | null;
  morningEnd: string | null;
  afternoonStart: string | null;
  afternoonEnd: string | null;
  graceMinutes: number;
  isActive: boolean;
}

export interface AttendanceLog {
  id: number;
  userId: string;
  user?: User;
  workDate: string;
  shift?: Shift;
  checkInAt?: string;
  checkOutAt?: string;
  checkInDistanceM?: number;
  checkInValid?: boolean;
  checkOutDistanceM?: number;
  checkOutValid?: boolean;
  status: AttendanceStatus;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  workedMinutes: number;
  /** Tổng số phút phải làm theo ca của ngày đó. */
  expectedMinutes: number;
  isAdjusted: boolean;
  note?: string;
}

export interface AttendanceAdjustment {
  id: number;
  log: AttendanceLog;
  requestedBy: User;
  field: 'CHECK_IN' | 'CHECK_OUT' | 'STATUS';
  requestedValue: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: User;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
}

export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveType {
  id: number;
  code: string;
  name: string;
  deductsBalance: boolean;
  maxDays?: number;
  requiresDoc: boolean;
  isPaid: boolean;
  isActive?: boolean;
}

export interface LeaveBalance {
  id: number;
  userId: string;
  year: number;
  month: number;
  entitledDays: number;
  usedDays: number;
  pendingDays: number;
}

export interface LeaveRequest {
  id: number;
  user: User;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  attachmentUrl?: string;
  status: LeaveRequestStatus;
  reviewedBy?: User;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
}

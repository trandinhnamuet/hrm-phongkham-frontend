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
  createdAt: string;
}

export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED' | 'QUA_HAN';

export interface Task {
  id: number;
  title: string;
  description?: string;
  createdBy: User;
  assignee?: User;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  completedAt?: string;
  comments?: TaskComment[];
  attachments?: TaskAttachment[];
  createdAt: string;
  updatedAt: string;
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

export interface Shift {
  id: number;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  graceMinutes: number;
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
  workedMinutes: number;
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

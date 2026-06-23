export interface Employee {
  id: string;
  name: string;
  active: boolean;
  color: string;
}

export interface LeavePattern {
  id: string;
  employeeId: string;
  workDays: number;
  leaveDays: number;
  startDate: string; // ISO date YYYY-MM-DD
  isActive: boolean;
}

export type LeaveRequestType = 'full' | 'hours';
export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected';
export type LeaveRequestSource = 'auto' | 'manual' | 'request';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  date: string; // ISO date YYYY-MM-DD
  type: LeaveRequestType;
  startTime?: string; // HH:MM format
  endTime?: string;   // HH:MM format
  status: LeaveRequestStatus;
  source: LeaveRequestSource;
}

export interface AttendanceLog {
  id: string;
  employeeId: string;
  date: string; // ISO date YYYY-MM-DD
  checkIn: string; // HH:MM format
  checkOut: string; // HH:MM format
}

export interface Settings {
  approverPin: string;
  minStaffPerDay: number;
  boardStartDate: string; // ISO date YYYY-MM-DD
  boardEndDate: string;   // ISO date YYYY-MM-DD
}

export interface AppData {
  employees: Employee[];
  leavePatterns: LeavePattern[];
  leaveRequests: LeaveRequest[];
  attendanceLogs: AttendanceLog[];
  settings: Settings;
}

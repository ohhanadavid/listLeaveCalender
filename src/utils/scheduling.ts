import type { LeavePattern, LeaveRequest } from '../types';

/**
 * Calculates the difference in days between two ISO date strings (date2 - date1).
 */
export const getDaysDiff = (date1Str: string, date2Str: string): number => {
  const d1 = new Date(date1Str);
  const d2 = new Date(date2Str);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  const diffTime = d2.getTime() - d1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Adds a specific number of days to an ISO date string and returns the new string in YYYY-MM-DD format.
 */
export const addDays = (dateStr: string, days: number): string => {
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

/**
 * Generates cyclical leave requests for a given pattern from its start date until the board's end date.
 * Each cycle has `workDays` followed by `leaveDays`.
 */
export const generateCyclicalLeaveRequests = (
  pattern: LeavePattern,
  boardEndDate: string
): LeaveRequest[] => {
  const requests: LeaveRequest[] = [];
  const cycleLength = pattern.workDays + pattern.leaveDays;
  if (cycleLength <= 0) return [];

  let currentOffset = 0;
  let currentDateStr = pattern.startDate;

  while (true) {
    if (getDaysDiff(currentDateStr, boardEndDate) < 0) {
      break;
    }

    const cycleIndex = currentOffset % cycleLength;
    if (cycleIndex >= pattern.workDays) {
      // This is a leave day
      requests.push({
        id: crypto.randomUUID(),
        employeeId: pattern.employeeId,
        date: currentDateStr,
        type: 'full',
        status: 'approved',
        source: 'auto',
      });
    }

    currentOffset++;
    currentDateStr = addDays(pattern.startDate, currentOffset);
  }

  return requests;
};

/**
 * Generates daily manual leave requests for a given date range.
 */
export const generateManualRangeLeaveRequests = (
  employeeId: string,
  startDate: string,
  endDate: string
): LeaveRequest[] => {
  const requests: LeaveRequest[] = [];
  const totalDays = getDaysDiff(startDate, endDate);
  if (totalDays < 0) return [];

  for (let i = 0; i <= totalDays; i++) {
    const currentDateStr = addDays(startDate, i);
    requests.push({
      id: crypto.randomUUID(),
      employeeId,
      date: currentDateStr,
      type: 'full',
      status: 'approved',
      source: 'manual',
    });
  }

  return requests;
};

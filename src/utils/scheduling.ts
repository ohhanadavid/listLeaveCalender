import type { LeavePattern, LeaveRequest, LeaveRequestType } from '../types';

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
  return date.toLocaleDateString('en-CA');
  
};

/**
 * Generates cyclical leave requests for a given pattern from its start date until the board's end date.
 * Each cycle has `workDays` followed by `leaveDays`.
 */
// export const generateCyclicalLeaveRequests = (
//   pattern: LeavePattern,
//   boardEndDate: string
// ): LeaveRequest[] => {
//   const requests: LeaveRequest[] = [];
//   const cycleLength = pattern.workDays + pattern.leaveDays;
//   if (cycleLength <= 0) return [];

//   let currentOffset = 0;
//   let currentDateStr = pattern.startDate;

//   while (true) {
//     if (getDaysDiff(currentDateStr, boardEndDate) < 0) {
//       break;
//     }

//     const cycleIndex = currentOffset % cycleLength;
//     if (cycleIndex >= pattern.workDays) {
//       // This is a leave day
//       requests.push({
//         id: crypto.randomUUID(),
//         employeeId: pattern.employeeId,
//         date: currentDateStr,
//         type: statusOfLeaveRequest(cycleIndex - pattern.workDays, pattern.leaveDays),
//         status: 'approved',
//         source: 'auto',
//       });
//     }

//     currentOffset++;
//     currentDateStr = addDays(pattern.startDate, currentOffset);
//   }

//   return requests;
// };


export const generateCyclicalLeaveRequests = (
  pattern: LeavePattern,
  boardEndDate: string
): LeaveRequest[] => {
  const requests: LeaveRequest[] = [];
  const cycleLength = pattern.workDays + pattern.leaveDays ;
  if (cycleLength <= 0) return [];

  let currentOffset = 0;
  let currentDateStr = pattern.startDate;

  while (true) {
    if (getDaysDiff(currentDateStr, boardEndDate) < 0) {
      
      break;
    }

    // חישוב המיקום המדויק בתוך המחזור הנוכחי (מ-0 עד cycleLength - 1)
    const cycleIndex = currentOffset % cycleLength;

    // בדיקה האם היום הנוכחי נופל בטווח של ימי החופשה
    // לדוגמה: אם יש 7 ימי עבודה, הימים הם 0-6. חופשה מתחילה מאינדקס 7 ומעלה.
    if (cycleIndex >= pattern.workDays) {
      
      // החישוב המדויק של יום החופשה הנוכחי (יום ראשון לחופשה = 0)
      const leaveDayIndex = cycleIndex - pattern.workDays;

      requests.push({
        id: crypto.randomUUID(),
        requestId: pattern.id, // מזהה דפוס החופשה המקורי
        employeeId: pattern.employeeId,
        date: currentDateStr,
        // מעביר 0 עבור יום החופשה הראשון (יום יציאה), 1 עבור השני וכו'
        type: statusOfLeaveRequest(leaveDayIndex, pattern.leaveDays),
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
  requestId: string,
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
      requestId: requestId,
      date: currentDateStr,
      type: totalDays > 0 ? statusOfLeaveRequest(i, totalDays) : 'hours',
      status: 'approved',
      source: 'manual',
    });
  }

  return requests;
};

const statusOfLeaveRequest = (day: number,totalDays: number): LeaveRequestType => {
  if (day === 0 ) {
    return 'outgoing';
  } else if (day === totalDays-1) {
    return 'incoming';
  }
  return 'full';
  
}

import React, { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import { useApp } from '../state/AppContext';
import { getHebrewDateAndHolidays } from '../utils/hebrewCalendar';

export const CalendarView: React.FC = () => {
  const { appData } = useApp();
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');

  const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2);
    return (parts[0][0] || '') + (parts[parts.length - 1][0] || '');
  };

  // Map leave requests to FullCalendar events
  const calendarEvents = appData.leaveRequests
    .filter((req) => req.status === 'approved')
    .map((req) => {
      const employee = appData.employees.find((emp) => emp.id === req.employeeId);
      return {
        id: req.id,
        title: employee ? employee.name : 'חופשה',
        start: req.date,
        allDay: true,
        extendedProps: {
          employeeId: req.employeeId,
          color: employee ? employee.color : '#5c6670',
          initials: employee ? getInitials(employee.name) : '?',
          type: req.type,
          source: req.source,
        },
      };
    });

  // Filter events based on selection
  const filteredEvents = selectedEmpId
    ? calendarEvents.filter((ev) => ev.extendedProps.employeeId === selectedEmpId)
    : calendarEvents;

  // Custom Event content renderer (employee color strips + initials)
  const renderEventContent = (eventInfo: {
    event: {
      title: string;
      extendedProps: {
        color: string;
        initials: string;
      };
    };
  }) => {
    const { color, initials } = eventInfo.event.extendedProps;
    return (
      <div 
        className="calendar-event-strip"
        style={{ 
          borderRight: `4px solid ${color}`,
          backgroundColor: `${color}15`,
          color: '#1f2933',
          padding: '2px 6px',
          fontSize: '0.8rem',
          fontWeight: '600',
          borderRadius: '3px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        <span className="event-initials" style={{ color: color, fontWeight: '700' }}>
          {initials}
        </span>
        <span className="event-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {eventInfo.event.title}
        </span>
      </div>
    );
  };

  // // Custom Day Cell content renderer (Hebrew dates, holidays, minimum staffing warnings)
  // const renderDayCellContent = (dayInfo: {
  //   date: Date;
  //   dayNumberText: string;
  // }) => {
  //   console.log('Rendering day cell for date:', dayInfo.date.toISOString());
  //   // Format to YYYY-MM-DD local format
  //   const year = dayInfo.date.getFullYear();
  //   const month = String(dayInfo.date.getMonth() + 1).padStart(2, '0');
  //   const day = String(dayInfo.date.getDate()).padStart(2, '0');
  //   const dateStr = `${year}-${month}-${day}`;

  //   const { hebrewDate, holiday } = getHebrewDateAndHolidays(dateStr);

  //   // Calculate working staff for this day
  //   const activeEmployees = appData.employees.filter((emp) => emp.active);
  //   const leavesForDate = appData.leaveRequests.filter(
  //     (req) => req.status === 'approved' && req.date === dateStr
  //   );
  //   const workingCount = activeEmployees.length - leavesForDate.length;
  //   const isBelowMin = activeEmployees.length > 0 && workingCount < appData.settings.minStaffPerDay;

  //   return (
  //     <div className="calendar-day-cell-content" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
  //       <div className="day-cell-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  //         <span className="day-number-text" >{dayInfo.date.getDate()}</span>
  //         <span className="hebrew-date-text" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
  //           {hebrewDate}
  //         </span>
  //       </div>
  //       {holiday && (
  //         <div className="day-cell-holiday" style={{
  //           fontSize: '0.7rem',
  //           color: 'var(--accent-red)',
  //           fontWeight: '600',
  //           textAlign: 'right',
  //           marginTop: '2px',
  //           whiteSpace: 'nowrap',
  //           overflow: 'hidden',
  //           textOverflow: 'ellipsis'
  //         }} title={holiday}>
  //           {holiday}
  //         </div>
  //       )}
  //       {isBelowMin && (
  //         <div className="day-cell-warning" style={{
  //           fontSize: '0.7rem',
  //           color: 'var(--accent-amber)',
  //           backgroundColor: '#fffbeb',
  //           border: '1px solid #fde68a',
  //           borderRadius: '3px',
  //           padding: '2px 4px',
  //           fontWeight: '700',
  //           marginTop: '2px',
  //           display: 'inline-flex',
  //           alignItems: 'center',
  //           gap: '2px',
  //           width: 'fit-content'
  //         }} title={`חוסר כוח אדם: רק ${workingCount} עובדים פעילים (מינימום נדרש: ${appData.settings.minStaffPerDay})`}>
  //           ⚠️ חוסר עובדים ({workingCount})
  //         </div>
  //       )}
  //     </div>
  //   );
  // };


  
  // Custom Day Cell content renderer (Hebrew dates, holidays, minimum staffing warnings)
  const renderDayCellContent = (dayInfo: {
    date: Date;
    dayNumberText: string;
  }) => {
    // Format to YYYY-MM-DD local format
    const year = dayInfo.date.getFullYear();
    const month = String(dayInfo.date.getMonth() + 1).padStart(2, '0');
    const day = String(dayInfo.date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const { hebrewDate, holiday } = getHebrewDateAndHolidays(dateStr);

    // Calculate working staff for this day
    const activeEmployees = appData.employees.filter((emp) => emp.active);
    const leavesForDate = appData.leaveRequests.filter(
      (req) => req.status === 'approved' && req.date === dateStr
    );
    const workingCount = activeEmployees.length - leavesForDate.length;
    const isBelowMin = activeEmployees.length > 0 && workingCount < appData.settings.minStaffPerDay;

    return (
      <div className="calendar-day-cell-content" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        <div className="day-cell-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span className="day-number-text" style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1f2933' }}>
            {dayInfo.dayNumberText}
          </span>
          <span className="hebrew-date-text" style={{ fontSize: '0.75rem', color: '#657786', fontWeight: '500' }}>
            {hebrewDate}
          </span>
        </div>
        {holiday && (
          <div className="day-cell-holiday" style={{
            fontSize: '0.7rem',
            color: '#dc2626',
            fontWeight: '600',
            textAlign: 'right',
            marginTop: '2px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }} title={holiday}>
            {holiday}
          </div>
        )}
        {isBelowMin && (
          <div className="day-cell-warning" style={{
            fontSize: '0.7rem',
            color: '#b45309',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '3px',
            padding: '2px 4px',
            fontWeight: '700',
            marginTop: '2px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px',
            width: 'fit-content'
          }} title={`חוסר כוח אדם: רק ${workingCount} עובדים פעילים (מינימום נדרש: ${appData.settings.minStaffPerDay})`}>
            ⚠️ חוסר עובדים ({workingCount})
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="calendar-view-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
      
      {/* הזרקת עיצוב מקומי לתיקון הדריסה של FullCalendar */}
      <style>{`
        .fc .fc-daygrid-day-top {
          display: flex !important;
          width: 100% !important;
        }
        .fc .fc-daygrid-day-number {
          width: 100% !important;
          display: block !important;
          text-decoration: none !important;
          color: #1f2933 !important;
          padding: 4px 8px !important;
          box-sizing: border-box !important;
        }
        .fc-direction-rtl .fc-daygrid-day-top {
          flex-direction: row !important;
        }
      `}</style>

      {/* Filter and Legend Row */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', padding: '1.2rem' }}>
        <div className="filter-group" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <label htmlFor="calendar-emp-filter" style={{ fontWeight: '600', fontSize: '0.95rem' }}>סינון לפי עובד/ת:</label>
          <select
            id="calendar-emp-filter"
            value={selectedEmpId}
            onChange={(e) => setSelectedEmpId(e.target.value)}
            className="form-control"
            style={{ width: '200px' }}
          >
            <option value="">-- כל העובדים --</option>
            {appData.employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.name} {!emp.active ? '(לא פעיל/ה)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Legend */}
        <div className="legend-group" style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
          {appData.employees.map(emp => (
            <div key={emp.id} className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
              <span className="legend-color-dot" style={{ backgroundColor: emp.color, width: '10px', height: '10px', borderRadius: '50%', display: 'inline-block' }}></span>
              <span>{emp.name} ({getInitials(emp.name)})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Calendar Card */}
      <div className="card calendar-card" style={{ padding: '1.5rem' }}>
        <FullCalendar
          plugins={[dayGridPlugin]}
          initialView="dayGridMonth"
          events={filteredEvents}
          eventContent={renderEventContent}
          dayCellContent={renderDayCellContent}
          locale="he"
          direction="rtl"
          firstDay={0}
          headerToolbar={{
            start: 'title',
            center: '',
            end: 'prev,next today'
          }}
          height="auto"
          validRange={{
            start: appData.settings.boardStartDate,
            end: appData.settings.boardEndDate
          }}
        />
      </div>
    </div>
  );
};


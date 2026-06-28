import React, { useEffect, useState, useRef, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useApp } from '../state/AppContext';
import { getHebrewDateAndHolidays } from '../utils/hebrewCalendar';
import type { LeaveRequest, LeaveRequestType } from '../types';

export const CalendarView: React.FC = () => {
  const { appData, isApproverMode, updateLeaveRequest, deleteLeaveRequest } = useApp();
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  // Use lazy initializer to avoid calling impure Date.now() during render
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(() => Date.now());

  useEffect(() => {
    // עדכון ה-State פעם בשעה כדי לוודא שהתאריך מדויק גם אם הדף פתוח ימים
    const interval = setInterval(() => {
      setCurrentTimestamp(Date.now());
    }, 1000 * 60 * 60); // 60 דקות

    return () => clearInterval(interval); // ניקוי הזיכרון בעת סגירה
  }, []);

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
          isActive: appData.leavePatterns.find((pat)=>pat.id===req.requestId)?.isActive,
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
      start: string;
      extendedProps: {
        color: string;
        initials: string;
        type: LeaveRequestType;
        isActive: boolean;
        
      };
    };
  }) => {
    const { color,isActive } = eventInfo.event.extendedProps;
    const eventDateStr = eventInfo.event.start;
    const isPastEvent = eventDateStr ? new Date(eventDateStr).getTime() < currentTimestamp : false;
    const shouldShow = isActive || isPastEvent;

    if (!shouldShow) return null;
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
          boxSizing: 'border-box',
          cursor: 'pointer'
        }}
      >
        <span className="event-initials" style={{ color: color, fontWeight: '700' }}>
          {eventInfo.event.title} {vacationIcon(eventInfo.event.extendedProps.type)}
        </span>
        {/* <span className="event-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {eventInfo.event.title}
        </span> */}
      </div>
    );
  };

  const vacationIcon = (type: LeaveRequestType) => {
    switch (type) {
      case 'full':
        return '🏖️'
      case 'hours':
        return '⏰'
      case 'outgoing':
        return '🔺'
      case 'incoming':
        return '♻️'
      default:
        return ''
    };
  };
  
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

  // ── Drag-to-resize (tri-mode) ────────────────────────────────────────────
  type ResizeMode = 'x' | 'y' | 'both';

  const [calendarHeight, setCalendarHeight] = useState<number>(560);
  const [calendarWidth,  setCalendarWidth]  = useState<number>(900);
  const [isActiveDrag,   setIsActiveDrag]   = useState(false);

  // refs – never read during render
  const isDragging  = useRef(false);
  const dragMode    = useRef<ResizeMode>('y');
  const dragStartX  = useRef(0);
  const dragStartY  = useRef(0);
  const dragStartW  = useRef(0);
  const dragStartH  = useRef(0);

  const onDragStart = useCallback(
    (mode: ResizeMode) =>
      (e: React.MouseEvent | React.TouchEvent) => {
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        isDragging.current  = true;
        dragMode.current    = mode;
        dragStartX.current  = clientX;
        dragStartY.current  = clientY;
        dragStartW.current  = calendarWidth;
        dragStartH.current  = calendarHeight;
        setIsActiveDrag(true);
        const cursorMap: Record<ResizeMode, string> = {
          x: 'ew-resize', y: 'ns-resize', both: 'nwse-resize',
        };
        document.body.style.cursor     = cursorMap[mode];
        document.body.style.userSelect = 'none';
      },
    [calendarHeight, calendarWidth],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging.current) return;
      const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
      const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;
      const mode    = dragMode.current;

      if (mode === 'x' || mode === 'both') {
        const dX   = dragStartX.current - clientX  ;
       
        const newW = Math.max(400, Math.min(2000, dragStartW.current + dX));
        setCalendarWidth(newW);
        
      }
      if (mode === 'y' || mode === 'both') {
        const dY   = clientY - dragStartY.current;
        const newH = Math.max(300, Math.min(1400, dragStartH.current + dY));
        setCalendarHeight(newH);
      }
      
    };

    const onUp = () => {
      if (!isDragging.current) return;
      isDragging.current             = false;
      setIsActiveDrag(false);
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove',  onMove, { passive: false });
    window.addEventListener('mouseup',   onUp);
    window.addEventListener('touchend',  onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove',  onMove);
      window.removeEventListener('mouseup',   onUp);
      window.removeEventListener('touchend',  onUp);
    };
  }, []);
  // ─────────────────────────────────────────────────────────────────────────

  // ── Leave Request Popover State & Handlers ──────────────────────────────
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editType, setEditType] = useState<LeaveRequestType>('full');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');

  const handleEventClick = useCallback((clickInfo: { event: { id: string } }) => {
    const leave = appData.leaveRequests.find((req) => req.id === clickInfo.event.id);
    if (leave) {
      setSelectedLeave(leave);
      setIsEditing(false);
      setEditType(leave.type);
      setEditStartTime(leave.startTime || '08:00');
      setEditEndTime(leave.endTime || '16:00');
    }
  }, [appData.leaveRequests]);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeave) return;

    updateLeaveRequest(selectedLeave.id, {
      type: editType,
      startTime: editType !== 'full' ? editStartTime : undefined,
      endTime: editType !== 'full' ? editEndTime : undefined,
    });
    setSelectedLeave(null);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (!selectedLeave) return;
    const emp = appData.employees.find((e) => e.id === selectedLeave.employeeId);
    const name = emp ? emp.name : 'העובד/ת';
    if (window.confirm(`האם למחוק את החופשה של ${name} בתאריך ${selectedLeave.date}?`)) {
      deleteLeaveRequest(selectedLeave.id);
      setSelectedLeave(null);
    }
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
            {appData.employees.filter(emp => emp.active).map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>

        {/* Legend */}
        <div className="legend-group" style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
          {appData.employees.filter(emp => emp.active).map(emp => (
            <div key={emp.id} className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
              <span className="legend-color-dot" style={{ backgroundColor: emp.color, width: '10px', height: '10px', borderRadius: '50%', display: 'inline-block' }}></span>
              <span>{emp.name} ({getInitials(emp.name)})</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Resizable calendar wrapper ──────────────────────────────────── */}
      <div
        style={{
          position: 'relative',
          width: `${calendarWidth}px`,
          maxWidth: '100%',
          transition: isActiveDrag ? 'none' : 'width 0.05s ease, height 0.05s ease',
        }}
      >
        {/* Calendar card */}
        <div
          className="card calendar-card"
          style={{ padding: '1.5rem', overflow: 'hidden', height: `${calendarHeight}px` }}
        >
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            events={filteredEvents}
            eventContent={renderEventContent}
            dayCellContent={renderDayCellContent}
            eventClick={handleEventClick}
            locale="he"
            direction="rtl"
            firstDay={0}
            headerToolbar={{
              start: 'title',
              center: '',
              end: 'prev,next today'
            }}
            height={calendarHeight - 48}
            validRange={{
              start: appData.settings.boardStartDate,
              end: appData.settings.boardEndDate
            }}
          />
        </div>

        {/* RIGHT edge – horizontal resize (X-axis) */}
        <div
          className="calendar-resize-handle calendar-resize-handle--x"
          onMouseDown={onDragStart('x')}
          onTouchStart={onDragStart('x')}
          title="גרור לשינוי רוחב"
        >
          <span className="resize-handle-dots">⠿</span>
        </div>

        {/* BOTTOM-RIGHT corner – diagonal resize (X+Y) */}
        <div
          className="calendar-resize-handle calendar-resize-handle--both"
          onMouseDown={onDragStart('both')}
          onTouchStart={onDragStart('both')}
          title="גרור לשינוי רוחב וגובה"
        >
          <span style={{ fontSize: '0.9rem', lineHeight: 1 }}>⤡</span>
        </div>
      </div>

      {/* BOTTOM – vertical resize (Y-axis) */}
      <div
        className="calendar-resize-handle calendar-resize-handle--y"
        onMouseDown={onDragStart('y')}
        onTouchStart={onDragStart('y')}
        title="גרור לשינוי גובה"
        style={{ width: `${calendarWidth}px`, maxWidth: '100%' }}
      >
        <span className="resize-handle-dots">⠿</span>
        <span className="resize-handle-label">גרור לשינוי גובה</span>
        <span className="resize-handle-dots">⠿</span>
      </div>

      {/* Popover / Modal Overlay for Selected Leave Request */}
      {selectedLeave && (
        <div className="pin-modal-overlay" onClick={() => setSelectedLeave(null)}>
          <div className="pin-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', width: '100%' }}>
            <button type="button" className="pin-modal-close" onClick={() => setSelectedLeave(null)}>×</button>
            
            <h3 style={{ marginBottom: '1rem', width: '100%', textAlign: 'right', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              פרטי חופשה
            </h3>

            {!isEditing ? (
              <div className="popover-body" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.8rem', textAlign: 'right' }}>
                <div>
                  <strong>שם עובד/ת:</strong> {appData.employees.find(emp => emp.id === selectedLeave.employeeId)?.name || 'עובד לא מוכר'}
                </div>
                <div>
                  <strong>תאריך:</strong> {selectedLeave.date}
                </div>
                <div>
                  <strong>סוג חופשה:</strong> {
                    selectedLeave.type === 'full' ? 'יום מלא' :
                    selectedLeave.type === 'hours' ? 'שעות (חלקי)' :
                    selectedLeave.type === 'outgoing' ? 'יציאה' :
                    selectedLeave.type === 'incoming' ? 'חזרה' : selectedLeave.type
                  }
                </div>
                {selectedLeave.type !== 'full' && (selectedLeave.startTime || selectedLeave.endTime) && (
                  <div>
                    <strong>שעות:</strong> {selectedLeave.startTime || '--:--'} עד {selectedLeave.endTime || '--:--'}
                  </div>
                )}
                <div>
                  <strong>מקור חופשה:</strong> {
                    selectedLeave.source === 'auto' ? 'מחזורי (אוטומטי)' :
                    selectedLeave.source === 'manual' ? 'טווח ידני' :
                    selectedLeave.source === 'request' ? 'בקשת עובד' : selectedLeave.source
                  }
                </div>
                <div>
                  <strong>סטטוס:</strong> {
                    selectedLeave.status === 'approved' ? 'מאושר' :
                    selectedLeave.status === 'pending' ? 'ממתין' : 'נדחה'
                  }
                </div>

                <div className="btn-group" style={{ marginTop: '1rem', justifyContent: 'flex-start', width: '100%' }}>
                  {isApproverMode && (
                    <>
                      <button type="button" className="btn btn-primary" onClick={() => setIsEditing(true)}>ערוך</button>
                      <button type="button" className="btn btn-danger" onClick={handleDelete}>מחק יום זה</button>
                    </>
                  )}
                  <button type="button" className="btn btn-secondary" onClick={() => setSelectedLeave(null)}>סגור</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveEdit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'right' }}>
                <div className="form-group">
                  <label htmlFor="edit-leave-type">סוג חופשה:</label>
                  <select
                    id="edit-leave-type"
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as LeaveRequestType)}
                    className="form-control"
                  >
                    <option value="full">יום מלא</option>
                    <option value="hours">שעות (חלקי)</option>
                    <option value="outgoing">יציאה</option>
                    <option value="incoming">חזרה</option>
                  </select>
                </div>

                {editType !== 'full' && (
                  <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label htmlFor="edit-start-time">שעת התחלה:</label>
                      <input
                        type="time"
                        id="edit-start-time"
                        value={editStartTime}
                        onChange={(e) => setEditStartTime(e.target.value)}
                        className="form-control"
                        required
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label htmlFor="edit-end-time">שעת סיום:</label>
                      <input
                        type="time"
                        id="edit-end-time"
                        value={editEndTime}
                        onChange={(e) => setEditEndTime(e.target.value)}
                        className="form-control"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="btn-group" style={{ marginTop: '1rem', justifyContent: 'flex-start', width: '100%' }}>
                  <button type="submit" className="btn btn-primary">שמור שינויים</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)}>בטל</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


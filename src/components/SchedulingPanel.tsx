import React, { useState } from 'react';
import { useApp } from '../state/AppContext';
import type { LeavePattern } from '../types';
import { getDaysDiff } from '../utils/scheduling';

export const SchedulingPanel: React.FC = () => {
  const {
    appData,
    isApproverMode,
    addLeavePattern,
    updateLeavePattern,
    addManualLeaveRange,
  } = useApp();

  const activeEmployees = appData.employees.filter((emp) => emp.active);

  // Form states for Cyclical Pattern
  const [cycleEmp, setCycleEmp] = useState('');
  const [workDays, setWorkDays] = useState(5);
  const [leaveDays, setLeaveDays] = useState(2);
  const [cycleStart, setCycleStart] = useState(new Date().toISOString().split('T')[0]);

  // Form states for Manual Range
  const [manualEmp, setManualEmp] = useState('');
  const [manualStart, setManualStart] = useState(new Date().toISOString().split('T')[0]);
  const [manualEnd, setManualEnd] = useState(new Date().toISOString().split('T')[0]);

  // Modifying/Editing patterns state
  const [editingPattern, setEditingPattern] = useState<LeavePattern | null>(null);
  const [editWorkDays, setEditWorkDays] = useState(5);
  const [editLeaveDays, setEditLeaveDays] = useState(2);
  const [editStartDate, setEditStartDate] = useState('');
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [pendingUpdateFields, setPendingUpdateFields] = useState<Partial<LeavePattern> | null>(null);

  // Errors / Success alerts
  const [cycleError, setCycleError] = useState<string | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSuccess, setManualSuccess] = useState<string | null>(null);
  const [cycleSuccess, setCycleSuccess] = useState<string | null>(null);

  // Handle adding cyclical pattern
  const handleAddCycle = (e: React.FormEvent) => {
    e.preventDefault();
    setCycleError(null);
    setCycleSuccess(null);

    if (!cycleEmp) {
      setCycleError('נא לבחור עובד/ת');
      return;
    }
    if (workDays <= 0 || leaveDays <= 0) {
      setCycleError('מספר הימים חייב להיות גדול מ-0');
      return;
    }

    // Check bounds
    const startDiff = getDaysDiff(appData.settings.boardStartDate, cycleStart);
    const endDiff = getDaysDiff(cycleStart, appData.settings.boardEndDate);
    if (startDiff < 0 || endDiff < 0) {
      setCycleError('תאריך התחלה חייב להיות בתוך גבולות הלוח');
      return;
    }

    addLeavePattern({
      employeeId: cycleEmp,
      workDays,
      leaveDays,
      startDate: cycleStart,
      isActive: true,
    });

    setCycleSuccess('הדפוס המחזורי נוצר והוזן ללוח בהצלחה!');
    setCycleEmp('');
  };

  // Handle adding manual range
  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    setManualError(null);
    setManualSuccess(null);

    if (!manualEmp) {
      setManualError('נא לבחור עובד/ת');
      return;
    }

    const rangeLength = getDaysDiff(manualStart, manualEnd);
    if (rangeLength < 0) {
      setManualError('תאריך סיום אינו יכול להיות לפני תאריך התחלה');
      return;
    }

    // Check bounds
    const startInBounds = getDaysDiff(appData.settings.boardStartDate, manualStart) >= 0 && getDaysDiff(manualStart, appData.settings.boardEndDate) >= 0;
    const endInBounds = getDaysDiff(appData.settings.boardStartDate, manualEnd) >= 0 && getDaysDiff(manualEnd, appData.settings.boardEndDate) >= 0;

    if (!startInBounds || !endInBounds) {
      setManualError('טווח התאריכים חייב להיות בתוך גבולות הלוח');
      return;
    }

    addManualLeaveRange(manualEmp, manualStart, manualEnd);
    setManualSuccess(`חופשה ידנית נרשמה בהצלחה ל-${rangeLength + 1} ימים!`);
    setManualEmp('');
  };

  const getEmployeeName = (id: string) => {
    return appData.employees.find((emp) => emp.id === id)?.name || 'עובד לא מוכר';
  };

  // Start edit flow
  const startEditPattern = (pattern: LeavePattern) => {
    setEditingPattern(pattern);
    setEditWorkDays(pattern.workDays);
    setEditLeaveDays(pattern.leaveDays);
    setEditStartDate(pattern.startDate);
    setShowUpdateConfirm(false);
  };

  const cancelEditPattern = () => {
    setEditingPattern(null);
    setShowUpdateConfirm(false);
    setPendingUpdateFields(null);
  };

  // Submit edit: opens choice dialog
  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editWorkDays <= 0 || editLeaveDays <= 0) return;
    
    // Check bounds
    const startDiff = getDaysDiff(appData.settings.boardStartDate, editStartDate);
    const endDiff = getDaysDiff(editStartDate, appData.settings.boardEndDate);
    if (startDiff < 0 || endDiff < 0) {
      alert('תאריך התחלה חייב להיות בתוך גבולות הלוח');
      return;
    }

    setPendingUpdateFields({
      workDays: editWorkDays,
      leaveDays: editLeaveDays,
      startDate: editStartDate,
    });
    setShowUpdateConfirm(true);
  };

  // Execute pattern update
  const executeUpdate = (updateMode: 'future' | 'rebuild') => {
    if (editingPattern && pendingUpdateFields) {
      updateLeavePattern(editingPattern.id, pendingUpdateFields, updateMode);
      setEditingPattern(null);
      setPendingUpdateFields(null);
      setShowUpdateConfirm(false);
    }
  };

  const togglePatternActive = (pattern: LeavePattern) => {
    // Toggling active/inactive uses 'future' mode
    updateLeavePattern(pattern.id, { isActive: !pattern.isActive }, 'future');
  };

  return (
    <div className="scheduling-panel">
      {isApproverMode ? (
        <div className="scheduling-forms-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.8rem' }}>
          
          {/* Form 1: Cyclical Pattern */}
          <div className="card">
            <h3>הגדרת דפוס מחזורי</h3>
            <p className="description">יוצר רשומות חופשה אוטומטיות (auto) לאורך כל תקופת הלוח.</p>
            
            <form onSubmit={handleAddCycle} className="form-column" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div className="form-group">
                <label htmlFor="cycle-emp">בחר עובד/ת:</label>
                <select 
                  id="cycle-emp" 
                  value={cycleEmp} 
                  onChange={(e) => setCycleEmp(e.target.value)} 
                  className="form-control"
                >
                  <option value="">-- בחר עובד/ת --</option>
                  {activeEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="work-days">ימי עבודה רצופים:</label>
                  <input 
                    type="number" 
                    id="work-days" 
                    min="1" 
                    value={workDays} 
                    onChange={(e) => setWorkDays(parseInt(e.target.value) || 0)} 
                    className="form-control"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="leave-days">ימי חופשה רצופים:</label>
                  <input 
                    type="number" 
                    id="leave-days" 
                    min="1" 
                    value={leaveDays} 
                    onChange={(e) => setLeaveDays(parseInt(e.target.value) || 0)} 
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="cycle-start">תאריך התחלה:</label>
                <input 
                  type="date" 
                  id="cycle-start" 
                  value={cycleStart} 
                  min={appData.settings.boardStartDate}
                  max={appData.settings.boardEndDate}
                  onChange={(e) => setCycleStart(e.target.value)} 
                  className="form-control"
                />
              </div>

              {cycleError && <div className="form-error-msg">{cycleError}</div>}
              {cycleSuccess && <div className="alert alert-info" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>{cycleSuccess}</div>}

              <button type="submit" className="btn btn-teal">
                צור דפוס מחזורי
              </button>
            </form>
          </div>

          {/* Form 2: Manual Range */}
          <div className="card">
            <h3>רישום חופשה ידנית (טווח תאריכים)</h3>
            <p className="description">יוצר רשומות חופשה ידניות (manual) בטווח תאריכים מוגדר.</p>
            
            <form onSubmit={handleAddManual} className="form-column" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div className="form-group">
                <label htmlFor="manual-emp">בחר עובד/ת:</label>
                <select 
                  id="manual-emp" 
                  value={manualEmp} 
                  onChange={(e) => setManualEmp(e.target.value)} 
                  className="form-control"
                >
                  <option value="">-- בחר עובד/ת --</option>
                  {activeEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="manual-start">מתאריך:</label>
                  <input 
                    type="date" 
                    id="manual-start" 
                    value={manualStart} 
                    min={appData.settings.boardStartDate}
                    max={appData.settings.boardEndDate}
                    onChange={(e) => setManualStart(e.target.value)} 
                    className="form-control"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="manual-end">עד תאריך:</label>
                  <input 
                    type="date" 
                    id="manual-end" 
                    value={manualEnd} 
                    min={appData.settings.boardStartDate}
                    max={appData.settings.boardEndDate}
                    onChange={(e) => setManualEnd(e.target.value)} 
                    className="form-control"
                  />
                </div>
              </div>

              {manualError && <div className="form-error-msg">{manualError}</div>}
              {manualSuccess && <div className="alert alert-info" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>{manualSuccess}</div>}

              <button type="submit" className="btn btn-teal">
                רשום חופשה ידנית
              </button>
            </form>
          </div>

        </div>
      ) : (
        <div className="alert alert-warning" style={{ marginBottom: '1.8rem', fontSize: '0.9rem' }}>
          הערה: כדי להגדיר דפוסים מחזוריים או לרשום חופשות ידניות, עליך להיכנס למצב מאשר (מנהל).
        </div>
      )}

      {/* Cyclical Patterns List Section */}
      <div className="card">
        <h3>דפוסים מחזוריים פעילים</h3>
        
        {appData.leavePatterns.length === 0 ? (
          <p className="empty-state">אין דפוסים מחזוריים מוגדרים במערכת.</p>
        ) : (
          <div className="patterns-list" style={{ overflowX: 'auto' }}>
            <table className="patterns-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', height: '40px' }}>
                  <th>שם עובד/ת</th>
                  <th>ימי עבודה</th>
                  <th>ימי חופשה</th>
                  <th>תאריך התחלה</th>
                  <th>סטטוס</th>
                  {isApproverMode && <th>פעולות</th>}
                </tr>
              </thead>
              <tbody>
                {appData.leavePatterns.map((pat) => (
                  <tr key={pat.id} style={{ borderBottom: '1px solid var(--border-color)', height: '50px' }}>
                    <td><strong>{getEmployeeName(pat.employeeId)}</strong></td>
                    <td>{pat.workDays} ימים</td>
                    <td>{pat.leaveDays} ימים</td>
                    <td>{pat.startDate}</td>
                    <td>
                      <span className={`status-badge ${pat.isActive ? 'active' : 'inactive'}`} style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        backgroundColor: pat.isActive ? '#dcfce7' : '#f1f5f9',
                        color: pat.isActive ? '#15803d' : '#475569'
                      }}>
                        {pat.isActive ? 'פעיל' : 'מושהה'}
                      </span>
                    </td>
                    {isApproverMode && (
                      <td>
                        <div className="btn-group-sm" style={{ display: 'flex', gap: '0.4rem' }}>
                          <button 
                            type="button" 
                            className="btn btn-secondary btn-sm"
                            onClick={() => startEditPattern(pat)}
                          >
                            ערוך
                          </button>
                          <button 
                            type="button" 
                            className={`btn btn-sm ${pat.isActive ? 'btn-danger' : 'btn-teal'}`}
                            onClick={() => togglePatternActive(pat)}
                          >
                            {pat.isActive ? 'השהה' : 'הפעל'}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Pattern Modal / Form Overlay */}
      {editingPattern && (
        <div className="pin-modal-overlay">
          <div className="pin-modal-card" style={{ width: '420px' }}>
            <button className="pin-modal-close" onClick={cancelEditPattern}>×</button>
            <h3>עריכת דפוס מחזורי</h3>
            <p className="pin-modal-desc">עדכן את הגדרות הדפוס עבור <strong>{getEmployeeName(editingPattern.employeeId)}</strong></p>
            
            {!showUpdateConfirm ? (
              <form onSubmit={handleSubmitEdit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>ימי עבודה:</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={editWorkDays} 
                      onChange={(e) => setEditWorkDays(parseInt(e.target.value) || 0)} 
                      className="form-control"
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>ימי חופשה:</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={editLeaveDays} 
                      onChange={(e) => setEditLeaveDays(parseInt(e.target.value) || 0)} 
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>תאריך התחלה:</label>
                  <input 
                    type="date" 
                    value={editStartDate} 
                    min={appData.settings.boardStartDate}
                    max={appData.settings.boardEndDate}
                    onChange={(e) => setEditStartDate(e.target.value)} 
                    className="form-control"
                  />
                </div>

                <div className="btn-group" style={{ marginTop: '0.8rem', display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                    שמור שינויים
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={cancelEditPattern} style={{ flex: 1 }}>
                    ביטול
                  </button>
                </div>
              </form>
            ) : (
              <div className="rebuild-choices-panel" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'center' }}>
                <div className="alert alert-warning" style={{ fontSize: '0.85rem', lineHeight: '1.5', padding: '0.8rem' }}>
                  שמירת השינויים דורשת יצירה מחדש של רשומות החופשה בלוח. כיצד תרצה לעדכן?
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={() => executeUpdate('future')}
                  >
                    עדכן רק מהיום והלאה
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-teal" 
                    onClick={() => executeUpdate('rebuild')}
                  >
                    בנה מחדש את הכל (מיום ההתחלה)
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowUpdateConfirm(false)}
                  >
                    חזור
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

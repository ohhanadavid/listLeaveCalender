import React, { useState } from 'react';
import { useApp } from '../state/AppContext';
import type { Employee } from '../types';

export const EmployeeManagement: React.FC = () => {
  const {
    appData,
    isApproverMode,
    addEmployee,
    updateEmployee,
    toggleEmployeeActive,
    deactivateEmployee,
    hardDeleteEmployee,
    
  } = useApp();

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#0F6B5C'); // Default to Deep Teal
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [deactivatingEmployee, setDeactivatingEmployee] = useState<Employee | null>(null);

  const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2);
    return (parts[0][0] || '') + (parts[parts.length - 1][0] || '');
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmed = newName.trim();
    if (!trimmed) {
      setValidationError('שם העובד אינו יכול להיות ריק');
      return;
    }

    const isDuplicate = appData.employees.some(
      (emp) => emp.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setValidationError('עובד עם שם זה כבר קיים במערכת');
      return;
    }

    addEmployee(trimmed, newColor);
    setNewName('');
    setNewColor('#0F6B5C');
  };

  const startEdit = (emp: Employee) => {
    setEditId(emp.id);
    setEditName(emp.name);
    setEditColor(emp.color);
    setValidationError(null);
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditName('');
    setEditColor('');
    setValidationError(null);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmed = editName.trim();
    if (!trimmed) {
      setValidationError('שם העובד אינו יכול להיות ריק');
      return;
    }

    const isDuplicate = appData.employees.some(
      (emp) => emp.id !== editId && emp.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setValidationError('עובד עם שם זה כבר קיים במערכת');
      return;
    }

    if (editId) {
      updateEmployee(editId, trimmed, editColor);
      setEditId(null);
    }
  };

  const handleDeactivateClick = (emp: Employee) => {
    if (!isApproverMode) return;
    setDeactivatingEmployee(emp);
  };

  const handleDeactivateConfirm = (mode: 'all' | 'future' | 'none') => {
    if (deactivatingEmployee) {
      deactivateEmployee(deactivatingEmployee.id, mode);
      setDeactivatingEmployee(null);
    }
  };

  const handleHardDeleteClick = (emp: Employee) => {
    if (!isApproverMode) return;
    const confirmDelete = window.confirm(
      `⚠️ אזהרה חמורה: האם למחוק לצמיתות את העובד/ת "${emp.name}" ואת כל הנתונים שלו/שלה (דפוסים, חופשות ונוכחות) מהקובץ?\n\nפעולה זו אינה ניתנת לביטול!`
    );
    if (confirmDelete) {
      hardDeleteEmployee(emp.id);
      setDeactivatingEmployee(null);
    }
  };


  // Okabe-Ito Color Palette
  const presetColors = [
    '#0F6B5C', // Deep Teal (Brand)
    '#E69F00', // Orange
    '#56B4E9', // Sky Blue
    '#009E73', // Bluish Green
    '#F0E442', // Yellow
    '#0072B2', // Blue
    '#D55E00', // Vermilion
    '#CC79A7', // Reddish Purple
    '#5C6670', // Slate Gray
  ];

  return (
    <div className="employee-management">
      {/* Add Employee Form - Only visible in Approver Mode */}
      {isApproverMode ? (
        <div className="employee-form-card">
          <h3>הוספת עובד/ת חדש/ה</h3>
          <form onSubmit={handleAdd} className="employee-form">
            <div className="form-row">
              <div className="form-group flex-2">
                <label htmlFor="new-emp-name">שם מלא:</label>
                <input
                  type="text"
                  id="new-emp-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="לדוגמה: ישראל ישראלי"
                  className="form-control"
                  maxLength={50}
                />
              </div>
              <div className="form-group flex-1">
                <label>בחירת צבע:</label>
                <div className="color-selectors">
                  <input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="color-picker-input"
                  />
                  <div className="color-presets">
                    {presetColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`color-preset-dot ${newColor === color ? 'selected' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewColor(color)}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {validationError && !editId && (
              <div className="form-error-msg">{validationError}</div>
            )}
            
            <button type="submit" className="btn btn-teal" style={{ marginTop: '0.8rem' }}>
              הוסף עובד למערכת
            </button>
          </form>
        </div>
      ) : (
        <div className="alert alert-warning" style={{ fontSize: '0.9rem' }}>
          הערה: כדי להוסיף, לערוך או להשבית עובדים, עליך להיכנס למצב מאשר (מנהל).
        </div>
      )}

      {/* Employees Grid List */}
      <div className="employees-list-container">
        {/* Active Employees Section */}
        <h3>עובדים פעילים במערכת ({appData.employees.filter(e => e.active).length})</h3>
        
        {appData.employees.filter(e => e.active).length === 0 ? (
          <p className="empty-state">אין עובדים פעילים במערכת.</p>
        ) : (
          <div className="employees-grid">
            {appData.employees.filter(e => e.active).map((emp) => {
              const isEditing = editId === emp.id;
              
              if (isEditing) {
                return (
                  <div key={emp.id} className="employee-item editing-mode">
                    <form onSubmit={handleUpdate} className="edit-inline-form">
                      <div className="form-group">
                        <label>שם עובד:</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="form-control"
                          required
                          maxLength={50}
                        />
                      </div>
                      <div className="form-group">
                        <label>צבע:</label>
                        <div className="color-edit-row">
                          <input
                            type="color"
                            value={editColor}
                            onChange={(e) => setEditColor(e.target.value)}
                            className="color-picker-input"
                          />
                          <div className="color-presets-mini">
                            {presetColors.map((color) => (
                              <button
                                key={color}
                                type="button"
                                className={`color-preset-dot mini ${editColor === color ? 'selected' : ''}`}
                                style={{ backgroundColor: color }}
                                onClick={() => setEditColor(color)}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      {validationError && editId === emp.id && (
                        <div className="form-error-msg">{validationError}</div>
                      )}

                      <div className="btn-group-sm">
                        <button type="submit" className="btn btn-teal btn-sm">שמור</button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={cancelEdit}>ביטול</button>
                      </div>
                    </form>
                  </div>
                );
              }

              return (
                <div 
                  key={emp.id} 
                  className="employee-item" 
                  style={{ borderRightColor: emp.color }}
                >
                  <div className="emp-info-block">
                    <div 
                      className="emp-avatar" 
                      style={{ 
                        backgroundColor: emp.color,
                        color: '#FFF',
                      }}
                    >
                      {getInitials(emp.name)}
                    </div>
                    <div className="emp-text-details">
                      <strong>
                        {emp.name}
                      </strong>
                      <span className="status-label">פעיל/ה</span>
                    </div>
                  </div>
                  
                  {isApproverMode && (
                    <div className="emp-action-buttons">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => startEdit(emp)}
                      >
                        ערוך
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeactivateClick(emp)}
                      >
                        השבת / מחק
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Deactivated Employees Section */}
        {appData.employees.filter(e => !e.active).length > 0 && (
          <div style={{ marginTop: '2.5rem' }}>
            <h3 style={{ color: 'var(--text-secondary)' }}>עובדים שהושבתו ({appData.employees.filter(e => !e.active).length})</h3>
            <div className="employees-grid">
              {appData.employees.filter(e => !e.active).map((emp) => (
                <div 
                  key={emp.id} 
                  className="employee-item inactive" 
                  style={{ borderRightColor: '#A0AEC0' }}
                >
                  <div className="emp-info-block">
                    <div 
                      className="emp-avatar" 
                      style={{ 
                        backgroundColor: '#A0AEC0',
                        color: '#FFF',
                      }}
                    >
                      {getInitials(emp.name)}
                    </div>
                    <div className="emp-text-details">
                      <strong className="disabled-text">
                        {emp.name}
                      </strong>
                      <span className="status-label">לא פעיל/ה</span>
                    </div>
                  </div>
                  
                  {isApproverMode && (
                    <div className="emp-action-buttons" style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        type="button"
                        className="btn btn-teal btn-sm"
                        onClick={() => toggleEmployeeActive(emp.id)}
                      >
                        הפעל מחדש
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleHardDeleteClick(emp)}
                      >
                        מחק לצמיתות
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Deactivation & Leaves Deletion Modal */}
      {deactivatingEmployee && (
        <div className="pin-modal-overlay" onClick={() => setDeactivatingEmployee(null)}>
          <div className="pin-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px', width: '100%' }}>
            <button type="button" className="pin-modal-close" onClick={() => setDeactivatingEmployee(null)}>×</button>
            
            <h3 style={{ color: 'var(--conflict-color)', marginBottom: '1rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem', textAlign: 'right' }}>
              השבתת עובד/ת — {deactivatingEmployee.name}
            </h3>

            <div className="popover-body" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'right' }}>
              <div style={{ lineHeight: '1.5', fontSize: '0.95rem' }}>
                בעת השבתת עובד/ת, הוא/היא יוסרו מרשימות הבחירה וסרגלי הכלים העתידיים.
                כיצד תרצה לטפל ברשומות החופשה הקיימות של עובד/ת זה?
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  style={{ width: '100%', textAlign: 'right', justifyContent: 'flex-start', padding: '0.8rem' }}
                  onClick={() => handleDeactivateConfirm('all')}
                >
                  🔴 <strong>השבת ומחק את כל החופשות</strong> (עבר ועתיד)
                </button>
                
                <button 
                  type="button" 
                  className="btn btn-warning" 
                  style={{ width: '100%', textAlign: 'right', justifyContent: 'flex-start', padding: '0.8rem' }}
                  onClick={() => handleDeactivateConfirm('future')}
                >
                  🟠 <strong>השבת עובד ומחק חופשות עתידיות בלבד</strong> (שמור חופשות עבר)
                </button>

                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ width: '100%', textAlign: 'right', justifyContent: 'flex-start', padding: '0.8rem' }}
                  onClick={() => handleDeactivateConfirm('none')}
                >
                  ⚪ <strong>השבת בלבד</strong> (שמור את כל החופשות בלוח)
                </button>

                <button 
                  type="button" 
                  className="btn btn-danger" 
                  style={{ width: '100%', textAlign: 'right', justifyContent: 'flex-start', padding: '0.8rem', backgroundColor: '#7f1d1d' }}
                  onClick={() => handleHardDeleteClick(deactivatingEmployee)}
                >
                  💀 <strong>מחק לצמיתות מהקובץ</strong> (הסר עובד וכל היסטוריית החופשות)
                </button>
             

                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border-color)', marginTop: '0.4rem' }}
                  onClick={() => setDeactivatingEmployee(null)}
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

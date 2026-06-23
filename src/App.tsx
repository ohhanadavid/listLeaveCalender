import { useState } from 'react';
import { useApp } from './state/AppContext';
import { PinLogin } from './components/PinLogin';
import { EmployeeManagement } from './components/EmployeeManagement';
import { SchedulingPanel } from './components/SchedulingPanel';
import { CalendarView } from './components/CalendarView';
import './App.css';

function App() {
  const {
    fileHandle,
    appData,
    isApproverMode,
    isFileSystemSupported,
    writeError,
    isLoading,
    fileNeedsPermission,
    selectFile,
    createNewFile,
    closeFile,
    exportData,
    loadFromFileObject,
    verifyPermission,
    setApproverMode,
    updateSettings,
  } = useApp();

  const [isPinLoginOpen, setIsPinLoginOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'employees' | 'scheduling'>('calendar');

  return (
    <div className="app-container" dir="rtl">
      {/* Header bar */}
      <header className={`app-header ${isApproverMode ? 'approver-active' : ''}`}>
        <div className="header-brand">
          <h1>ניהול לוח חופשות - שלב ב' וג'</h1>
          {isApproverMode && <span className="admin-badge">מצב מאשר פעיל</span>}
        </div>
        <div className="header-actions">
          {isApproverMode ? (
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => setApproverMode(false)}
            >
              יציאה ממצב מאשר
            </button>
          ) : (
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={() => setIsPinLoginOpen(true)}
            >
              כניסה כמנהל/מאשר
            </button>
          )}
        </div>
      </header>

      {/* Main Responsive Grid Layout */}
      <main className="app-main">
        {writeError && (
          <div className="alert alert-error">
            <strong>שגיאת כתיבה: </strong> {writeError}
          </div>
        )}

        {fileNeedsPermission && (
          <div className="alert alert-warning file-permission-banner">
            <div>
              <strong>נדרשת הרשאת גישה לקובץ:</strong> הדפדפן דורש אישור מחדש כדי לשמור שינויים לקובץ <strong>{fileHandle?.name}</strong>.
            </div>
            <button type="button" className="btn btn-teal btn-sm" onClick={verifyPermission}>
              אשר גישה לקובץ
            </button>
          </div>
        )}

        <div className="grid-responsive">
          {/* Right Panel: File connection & actions + Settings */}
          <div className="sidebar-cards" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card">
              <h2>חיבור ואחסון נתונים (100% אופליין)</h2>
              <p className="description">
                האפליקציה שומרת את הנתונים באופן אוטומטי ישירות לקובץ JSON במחשב שלך באמצעות ה-File System Access API.
              </p>

              <div className="connection-status">
                <span className={`status-dot ${fileHandle ? (fileNeedsPermission ? 'warning' : 'connected') : 'disconnected'}`}></span>
                <span>
                  {fileHandle 
                    ? `קובץ מחובר: ${fileHandle.name} ${fileNeedsPermission ? '(נדרש אישור)' : ''}` 
                    : 'אין קובץ מחובר (השינויים יישמרו רק בזיכרון)'}
                </span>
              </div>

              <div className="btn-group">
                {isFileSystemSupported ? (
                  <>
                    <button 
                      type="button" 
                      className="btn btn-primary" 
                      onClick={selectFile}
                      disabled={isLoading}
                    >
                      {isLoading ? 'טוען...' : 'פתח קובץ נתונים'}
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-teal" 
                      onClick={createNewFile}
                      disabled={isLoading}
                    >
                      צור קובץ חדש
                    </button>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%' }}>
                    <div className="alert alert-warning" style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
                      הדפדפן או הפרוטוקול הנוכחי אינם תומכים בגישה ישירה למערכת הקבצים. אנא טען קובץ JSON באופן ידני.
                    </div>
                    <label className="btn btn-teal" style={{ position: 'relative', cursor: 'pointer', textAlign: 'center', width: '100%' }}>
                      {isLoading ? 'טוען...' : 'טען קובץ נתונים (JSON)'}
                      <input
                        type="file"
                        accept=".json"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            await loadFromFileObject(file);
                          }
                        }}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          opacity: 0,
                          cursor: 'pointer'
                        }}
                        disabled={isLoading}
                      />
                    </label>
                  </div>
                )}
                {fileHandle && (
                  <button type="button" className="btn btn-danger" onClick={closeFile}>
                    סגור קובץ
                  </button>
                )}
              </div>

              <hr className="divider" />

              <h2>גיבוי וייצוא ידני (Fallback)</h2>
              <p className="description">
                ניתן לייצא את הנתונים הנוכחיים לקובץ JSON לקובץ מקומי בכל עת.
              </p>
              <button type="button" className="btn btn-secondary" onClick={exportData}>
                ייצוא נתונים (Download JSON)
              </button>
            </div>

            {/* System Settings Card */}
            <div className="card">
              <h2>הגדרות מערכת</h2>
              <p className="description">
                הגדר את ערכי המינימום של המערכת. השינויים נשמרים אוטומטית.
              </p>
              
              {isApproverMode ? (
                <div className="settings-fields" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="min-staff">מינימום עובדים ביום:</label>
                    <input 
                      type="number" 
                      id="min-staff"
                      min="0"
                      value={appData.settings.minStaffPerDay}
                      onChange={(e) => updateSettings({ minStaffPerDay: parseInt(e.target.value, 10) || 0 })}
                      className="form-control"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="approver-pin">קוד PIN מנהל חדש:</label>
                    <input 
                      type="text" 
                      id="approver-pin"
                      maxLength={8}
                      value={appData.settings.approverPin}
                      onChange={(e) => updateSettings({ approverPin: e.target.value.trim() })}
                      className="form-control"
                      placeholder="הקש קוד PIN חדש..."
                    />
                  </div>
                </div>
              ) : (
                <div className="alert alert-warning" style={{ fontSize: '0.85rem' }}>
                  עליך להיות במצב מנהל כדי לשנות את הגדרות המערכת.
                </div>
              )}
            </div>
          </div>

          {/* Left Panel: Calendar, Employee Management, or Scheduling Panel */}
          <div className="main-content-area" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="tabs-header" style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.8rem' }}>
              <button
                type="button"
                className={`tab-btn btn ${activeTab === 'calendar' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('calendar')}
                style={{ flex: 1 }}
              >
                לוח שנה ויזואלי
              </button>
              <button
                type="button"
                className={`tab-btn btn ${activeTab === 'employees' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('employees')}
                style={{ flex: 1 }}
              >
                ניהול עובדים
              </button>
              <button
                type="button"
                className={`tab-btn btn ${activeTab === 'scheduling' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('scheduling')}
                style={{ flex: 1 }}
              >
                בנייה אוטומטית ולוח זמנים
              </button>
            </div>

            {activeTab === 'calendar' && <CalendarView />}

            {activeTab === 'employees' && (
              <div className="card">
                <h2>ניהול עובדי המערכת</h2>
                <EmployeeManagement />
              </div>
            )}

            {activeTab === 'scheduling' && <SchedulingPanel />}
          </div>
        </div>

        {/* Full-width panel: Raw Data Viewer */}
        <div className="card state-card">
          <h2>תצוגת קובץ הנתונים (JSON גולמי)</h2>
          <pre className="raw-json">
            {JSON.stringify(appData, null, 2)}
          </pre>
        </div>
      </main>

      {/* PIN Login Dialog */}
      {isPinLoginOpen && (
        <PinLogin 
          isOpen={isPinLoginOpen}
          onClose={() => setIsPinLoginOpen(false)}
        />
      )}
    </div>
  );
}

export default App;

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/preserve-manual-memoization */
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { AppData, Employee, LeavePattern, LeaveRequest, AttendanceLog, Settings } from '../types';
import {
  createInitialAppData,
  loadAppDataFromFile,
  saveAppDataToFile,
  exportAppDataFallback,
  validateAndSanitizeAppData,
  saveFileHandleToIndexedDB,
  loadFileHandleFromIndexedDB,
  clearFileHandleFromIndexedDB
} from '../data/fileSystem';
import {
  generateCyclicalLeaveRequests,
  generateManualRangeLeaveRequests,
  getDaysDiff,
  addDays
} from '../utils/scheduling';

interface AppContextType {
  fileHandle: FileSystemFileHandle | null;
  appData: AppData;
  isApproverMode: boolean;
  isFileSystemSupported: boolean;
  writeError: string | null;
  isLoading: boolean;
  fileNeedsPermission: boolean;
  
  // Actions
  selectFile: () => Promise<boolean>;
  createNewFile: () => Promise<boolean>;
  closeFile: () => void;
  exportData: () => void;
  loadFromFileObject: (file: File) => Promise<boolean>;
  verifyPermission: () => Promise<boolean>;
  
  // State modifications
  setApproverMode: (active: boolean) => void;
  addEmployee: (name: string, color: string) => void;
  updateEmployee: (id: string, name: string, color: string) => void;
  toggleEmployeeActive: (id: string) => void;
  deactivateEmployee: (id: string, deleteMode: 'all' | 'future' | 'none') => void;
  hardDeleteEmployee: (id: string) => void;

  addLeavePattern: (pattern: Omit<LeavePattern, 'id'>) => void;
  updateLeavePattern: (id: string, pattern: Partial<LeavePattern>, updateMode?: 'future' | 'rebuild') => void;
  addManualLeaveRange: (employeeId: string, startDate: string, endDate: string) => void;
  addLeaveRequest: (request: Omit<LeaveRequest, 'id'>) => void;
  updateLeaveRequestStatus: (id: string, status: LeaveRequest['status']) => void;
  updateLeaveRequest: (id: string, updates: Partial<LeaveRequest>) => void;
  deleteLeaveRequest: (id: string) => void;
  deleteLeaveRequestRange: (employeeId: string, startDate: string, endDate: string, sourceFilter: 'all' | 'auto' | 'manual') => void;
  addAttendanceLog: (log: Omit<AttendanceLog, 'id'>) => void;
  updateSettings: (settings: Partial<Settings>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [appData, setAppData] = useState<AppData>(createInitialAppData());
  const [isApproverMode, setIsApproverMode] = useState<boolean>(false);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fileNeedsPermission, setFileNeedsPermission] = useState<boolean>(false);
  const isFileSystemSupported = typeof window !== 'undefined' && 'showOpenFilePicker' in window;
  
  const isSavingRef = useRef<boolean>(false);
  const pendingSaveRef = useRef<AppData | null>(null);

  // Serialized save mechanism to prevent write overlap
  const triggerSave = useCallback(async (data: AppData, handle: FileSystemFileHandle) => {
    if (isSavingRef.current) {
      pendingSaveRef.current = data;
      return;
    }
    
    isSavingRef.current = true;
    setWriteError(null);
    
    try {
      const perm = await (handle as any).queryPermission({ mode: 'readwrite' });
      if (perm !== 'granted') {
        setFileNeedsPermission(true);
        throw new Error("נא לאשר גישת כתיבה לקובץ (לחץ על 'אשר גישה לקובץ')");
      }
      setFileNeedsPermission(false);
      await saveAppDataToFile(handle, data);
    } catch (err: any) {
      console.error("Auto-save failed:", err);
      setWriteError(err?.message || "שגיאת כתיבה לקובץ");
    } finally {
      isSavingRef.current = false;
      if (pendingSaveRef.current) {
        const nextData = pendingSaveRef.current;
        pendingSaveRef.current = null;
        triggerSave(nextData, handle);
      }
    }
  }, []);

  // Trigger save on any appData changes when a file is opened
  useEffect(() => {
    if (fileHandle) {
      triggerSave(appData, fileHandle);
    }
  }, [appData, fileHandle, triggerSave]);



  // Restore file handle from IndexedDB on initialization
  useEffect(() => {
    const restoreHandle = async () => {
      if (!isFileSystemSupported) return;
      try {
        const savedHandle = await loadFileHandleFromIndexedDB();
        if (savedHandle) {
          const perm = await (savedHandle as any).queryPermission({ mode: 'readwrite' });
          if (perm === 'granted') {
            const data = await loadAppDataFromFile(savedHandle);
            setAppData(data);
            setFileHandle(savedHandle);
            setFileNeedsPermission(false);
          } else {
            setFileHandle(savedHandle);
            setFileNeedsPermission(true);
          }
        }
      } catch (err) {
        console.error("Failed to restore file handle:", err);
      }
    };
    restoreHandle();
  }, [isFileSystemSupported]);

  // File Picker Handlers
  const selectFile = async (): Promise<boolean> => {
    if (!isFileSystemSupported) return false;
    setIsLoading(true);
    try {
      const [handle] = await (window as any).showOpenFilePicker({
        types: [{
          description: 'JSON Files',
          accept: { 'application/json': ['.json'] }
        }],
        multiple: false
      });
      const data = await loadAppDataFromFile(handle);
      setAppData(data);
      setFileHandle(handle);
      setFileNeedsPermission(false);
      await saveFileHandleToIndexedDB(handle);
      setWriteError(null);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error("Failed to select file:", err);
      setIsLoading(false);
      return false;
    }
  };

  const createNewFile = async (): Promise<boolean> => {
    if (!isFileSystemSupported) return false;
    setIsLoading(true);
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: 'leave-calendar-data.json',
        types: [{
          description: 'JSON Files',
          accept: { 'application/json': ['.json'] }
        }]
      });
      const initialData = createInitialAppData();
      await saveAppDataToFile(handle, initialData);
      setAppData(initialData);
      setFileHandle(handle);
      setFileNeedsPermission(false);
      await saveFileHandleToIndexedDB(handle);
      setWriteError(null);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error("Failed to create new file:", err);
      setIsLoading(false);
      return false;
    }
  };

  const closeFile = () => {
    setFileHandle(null);
    setAppData(createInitialAppData());
    setIsApproverMode(false);
    setFileNeedsPermission(false);
    setWriteError(null);
    clearFileHandleFromIndexedDB().catch(console.error);
  };

  const verifyPermission = async (): Promise<boolean> => {
    if (!fileHandle) return false;
    setIsLoading(true);
    try {
      const perm = await (fileHandle as any).requestPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        const data = await loadAppDataFromFile(fileHandle);
        setAppData(data);
        setFileNeedsPermission(false);
        setWriteError(null);
        setIsLoading(false);
        return true;
      }
      setIsLoading(false);
      return false;
    } catch (err) {
      console.error("Failed to request file permission:", err);
      setIsLoading(false);
      return false;
    }
  };

  // Auto-Logout Inactivity Timer
  const activityTimerRef = useRef<any>(null);

  const resetActivityTimer = useCallback(() => {
    if (activityTimerRef.current) {
      clearTimeout(activityTimerRef.current);
    }
    activityTimerRef.current = setTimeout(() => {
      if (isApproverMode) {
        setIsApproverMode(false);
        console.log("Auto-logged out due to inactivity");
      }
    }, 5 * 60 * 1000); // 5 minutes in milliseconds
  }, [isApproverMode]);

  useEffect(() => {
    if (isApproverMode) {
      resetActivityTimer();
      const events = ['mousemove', 'mousedown', 'keydown', 'click', 'touchstart'];
      const handler = () => resetActivityTimer();
      
      events.forEach(event => document.addEventListener(event, handler));
      return () => {
        if (activityTimerRef.current) {
          clearTimeout(activityTimerRef.current);
        }
        events.forEach(event => document.removeEventListener(event, handler));
      };
    } else {
      if (activityTimerRef.current) {
        clearTimeout(activityTimerRef.current);
      }
    }
  }, [isApproverMode, resetActivityTimer]);

  const loadFromFileObject = async (file: File): Promise<boolean> => {
    setIsLoading(true);
    try {
      const text = await file.text();
      if (!text.trim()) {
        setAppData(createInitialAppData());
      } else {
        const parsed = JSON.parse(text);
        setAppData(validateAndSanitizeAppData(parsed));
      }
      setFileHandle(null);
      setWriteError(null);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error("Failed to load file:", err);
      setIsLoading(false);
      return false;
    }
  };

  const exportData = () => {
    exportAppDataFallback(appData);
  };

  // State modification actions
  const setApproverMode = (active: boolean) => {
    setIsApproverMode(active);
  };

  const addEmployee = (name: string, color: string) => {
    if (!isApproverMode) return;
    setAppData((prev) => {
      const newEmployee: Employee = {
        id: crypto.randomUUID(),
        name,
        active: true,
        color,
      };
      return {
        ...prev,
        employees: [...prev.employees, newEmployee],
      };
    });
  };

  const updateEmployee = (id: string, name: string, color: string) => {
    if (!isApproverMode) return;
    setAppData((prev) => ({
      ...prev,
      employees: prev.employees.map((emp) =>
        emp.id === id ? { ...emp, name, color } : emp
      ),
    }));
  };

  const toggleEmployeeActive = (id: string) => {
    if (!isApproverMode) return;
    setAppData((prev) => ({
      ...prev,
      employees: prev.employees.map((emp) =>
        emp.id === id ? { ...emp, active: !emp.active } : emp
      ),
    }));
  };

  const deactivateEmployee = (id: string, deleteMode: 'all' | 'future' | 'none') => {
    if (!isApproverMode) return;
    const todayStr = new Date().toLocaleDateString('en-CA');
    
    setAppData((prev) => {
      const updatedEmployees = prev.employees.map((emp) =>
        emp.id === id ? { ...emp, active: false } : emp
      );

      let updatedRequests = prev.leaveRequests;
      if (deleteMode === 'all') {
        updatedRequests = prev.leaveRequests.filter((req) => req.employeeId !== id);
      } else if (deleteMode === 'future') {
        updatedRequests = prev.leaveRequests.filter(
          (req) => !(req.employeeId === id && req.date > todayStr)
        );
      }

      return {
        ...prev,
        employees: updatedEmployees,
        leaveRequests: updatedRequests,
      };
    });
  };

  const hardDeleteEmployee = (id: string) => {
    if (!isApproverMode) return;
    setAppData((prev) => ({
      ...prev,
      employees: prev.employees.filter((emp) => emp.id !== id),
      leaveRequests: prev.leaveRequests.filter((req) => req.employeeId !== id),
      leavePatterns: prev.leavePatterns.filter((pat) => pat.employeeId !== id),
      attendanceLogs: prev.attendanceLogs.filter((log) => log.employeeId !== id),
    }));
  };


  const addLeavePattern = (patternInput: Omit<LeavePattern, 'id'>) => {
    if (!isApproverMode) return;
    const newId = crypto.randomUUID();
    const newPattern: LeavePattern = {
      ...patternInput,
      id: newId,
    };
    
    // Generate cyclical requests up to boardEndDate
    const generatedRequests = generateCyclicalLeaveRequests(newPattern, appData.settings.boardEndDate);

    setAppData((prev) => {
      // Deactivate any existing active patterns for this employee
      const updatedPatterns = prev.leavePatterns.map((pat) =>
        pat.employeeId === patternInput.employeeId && pat.isActive ? { ...pat, isActive: false } : pat
      );

      // Remove any existing 'auto' requests for this employee on or after patternInput.startDate
      const cleanRequests = prev.leaveRequests.filter(
        (req) => !(req.employeeId === patternInput.employeeId && req.source === 'auto' && getDaysDiff(patternInput.startDate, req.date) >= 0)
      );

      // Filter out new requests that overlap with existing manual/request leaves to avoid double requests
      const nonOverlappingGenerated = generatedRequests.filter(
        (newReq) => !cleanRequests.some((existing) => existing.employeeId === newReq.employeeId && existing.date === newReq.date)
      );

      return {
        ...prev,
        leavePatterns: [...updatedPatterns, newPattern],
        leaveRequests: [...cleanRequests, ...nonOverlappingGenerated],
      };
    });
  };

  const updateLeavePattern = (
    id: string,
    updatedFields: Partial<LeavePattern>,
    updateMode: 'future' | 'rebuild' = 'future'
  ) => {
    if (!isApproverMode) return;
    
    setAppData((prev) => {
      const oldPattern = prev.leavePatterns.find((p) => p.id === id);
      if (!oldPattern) return prev;

      const newPattern = { ...oldPattern, ...updatedFields };

      // Update the patterns list
      const updatedPatterns = prev.leavePatterns.map((pat) => (pat.id === id ? newPattern : pat));

      // Re-generate requests
      let cleanRequests = [...prev.leaveRequests];
      let generatedRequests: LeaveRequest[] = [];

      const todayStr = new Date().toISOString().split('T')[0];

      if (!newPattern.isActive) {
        // If deactivating, delete all future 'auto' requests starting from today
        cleanRequests = cleanRequests.filter(
          (req) => !(req.employeeId === newPattern.employeeId && req.source === 'auto' && getDaysDiff(todayStr, req.date) >= 0)
        );
      } else {
        if (updateMode === 'rebuild') {
          // Rebuild everything: delete all 'auto' requests for this employee in the range [pattern.startDate, boardEndDate]
          cleanRequests = cleanRequests.filter(
            (req) => !(req.employeeId === newPattern.employeeId && req.source === 'auto' && getDaysDiff(newPattern.startDate, req.date) >= 0)
          );
          generatedRequests = generateCyclicalLeaveRequests(newPattern, prev.settings.boardEndDate);
        } else {
          // Update only future: delete 'auto' requests starting from today/now
          const rebuildStart = getDaysDiff(newPattern.startDate, todayStr) >= 0 ? todayStr : newPattern.startDate;
          cleanRequests = cleanRequests.filter(
            (req) => !(req.employeeId === newPattern.employeeId && req.source === 'auto' && getDaysDiff(rebuildStart, req.date) >= 0)
          );
          
          // Generate new pattern but override its startDate temporarily to generate only future requests
          const tempPattern = { ...newPattern, startDate: rebuildStart };
          generatedRequests = generateCyclicalLeaveRequests(tempPattern, prev.settings.boardEndDate);
        }
      }

      // Filter out generated requests that overlap with existing manual/request leaves
      const nonOverlappingGenerated = generatedRequests.filter(
        (newReq) => !cleanRequests.some((existing) => existing.employeeId === newReq.employeeId && existing.date === newReq.date)
      );

      return {
        ...prev,
        leavePatterns: updatedPatterns,
        leaveRequests: [...cleanRequests, ...nonOverlappingGenerated],
      };
    });
  };

  const addManualLeaveRange = (employeeId: string, startDate: string, endDate: string) => {
    if (!isApproverMode) return;
    const requestId = crypto.randomUUID(); // Unique ID for this manual range
    // Generate manual requests
    const generatedRequests = generateManualRangeLeaveRequests(employeeId, requestId, startDate, endDate);

    setAppData((prev) => {
      // Overwrite/Remove any existing requests on those exact dates for this employee to avoid double requests
      const datesToOverwrite = new Set(generatedRequests.map((r) => r.date));
      
      const cleanRequests = prev.leaveRequests.filter(
        (req) => !(req.employeeId === employeeId && datesToOverwrite.has(req.date))
      );

      return {
        ...prev,
        leaveRequests: [...cleanRequests, ...generatedRequests],
      };
    });
  };

  const addLeaveRequest = (request: Omit<LeaveRequest, 'id'>) => {
    if (!isApproverMode) return;
    setAppData((prev) => {
      const newRequest: LeaveRequest = {
        ...request,
        id: crypto.randomUUID(),
      };
      return {
        ...prev,
        leaveRequests: [...prev.leaveRequests, newRequest],
      };
    });
  };

  const updateLeaveRequestStatus = (id: string, status: LeaveRequest['status']) => {
    if (!isApproverMode) return;
    setAppData((prev) => ({
      ...prev,
      leaveRequests: prev.leaveRequests.map((req) =>
        req.id === id ? { ...req, status } : req
      ),
    }));
  };

  const updateLeaveRequest = (id: string, updates: Partial<LeaveRequest>) => {
    if (!isApproverMode) return;
    setAppData((prev) => ({
      ...prev,
      leaveRequests: prev.leaveRequests.map((req) =>
        req.id === id ? { ...req, ...updates } : req
      ),
    }));
  };

  const deleteLeaveRequest = (id: string) => {
    if (!isApproverMode) return;
    setAppData((prev) => ({
      ...prev,
      leaveRequests: prev.leaveRequests.filter((req) => req.id !== id),
    }));
  };

  const deleteLeaveRequestRange = (
    employeeId: string,
    startDate: string,
    endDate: string,
    sourceFilter: 'all' | 'auto' | 'manual'
  ) => {
    if (!isApproverMode) {
      console.warn('deleteLeaveRequestRange blocked: not in Approver Mode');
      return;
    }
    console.log('Executing deleteLeaveRequestRange:', { employeeId, startDate, endDate, sourceFilter });
    setAppData((prev) => {
      const filtered = prev.leaveRequests.filter((req) => {
        const matchesEmployee = req.employeeId === employeeId;
        const matchesDate = req.date >= startDate && req.date <= endDate;
        const matchesSource =
          sourceFilter === 'all' ||
          (sourceFilter === 'auto' && req.source === 'auto') ||
          (sourceFilter === 'manual' && (req.source === 'manual' || req.source === 'request'));
        
        const isMatch = matchesEmployee && matchesDate && matchesSource;
        if (isMatch) {
          console.log('Deleting leave request:', req);
        }
        return !isMatch;
      });
      return {
        ...prev,
        leaveRequests: filtered,
      };
    });
  };

  const addAttendanceLog = (log: Omit<AttendanceLog, 'id'>) => {
    setAppData((prev) => {
      const newLog: AttendanceLog = {
        ...log,
        id: crypto.randomUUID(),
      };
      return {
        ...prev,
        attendanceLogs: [...prev.attendanceLogs, newLog],
      };
    });
  };

  const updateSettings = (updatedSettings: Partial<Settings>) => {
    if (!isApproverMode) return;
    setAppData((prev) => {
      const oldEndDate = prev.settings.boardEndDate;
      const newEndDate = updatedSettings.boardEndDate || oldEndDate;
      const newSettings = { ...prev.settings, ...updatedSettings };

      let additionalRequests: LeaveRequest[] = [];

      // Check if boardEndDate is extended
      if (getDaysDiff(oldEndDate, newEndDate) > 0) {
        // Run cyclical patterns generator for the extended range (from oldEndDate + 1 to newEndDate)
        prev.leavePatterns.forEach((pat) => {
          if (pat.isActive) {
            const oldEndPlus1 = addDays(oldEndDate, 1);
            const extensionStart = getDaysDiff(pat.startDate, oldEndPlus1) >= 0 ? oldEndPlus1 : pat.startDate;
            
            if (getDaysDiff(extensionStart, newEndDate) >= 0) {
              const tempPattern = { ...pat, startDate: extensionStart };
              const gen = generateCyclicalLeaveRequests(tempPattern, newEndDate);
              additionalRequests = [...additionalRequests, ...gen];
            }
          }
        });
      }

      // Filter out overlapping leaves
      const filteredAdditional = additionalRequests.filter(
        (newReq) => !prev.leaveRequests.some((existing) => existing.employeeId === newReq.employeeId && existing.date === newReq.date)
      );

      return {
        ...prev,
        settings: newSettings,
        leaveRequests: [...prev.leaveRequests, ...filteredAdditional],
      };
    });
  };

  return (
    <AppContext.Provider
      value={{
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
        addEmployee,
        updateEmployee,
        toggleEmployeeActive,
        deactivateEmployee,
        hardDeleteEmployee,
       
        addLeavePattern,
        updateLeavePattern,
        addManualLeaveRange,
        addLeaveRequest,
        updateLeaveRequestStatus,
        updateLeaveRequest,
        deleteLeaveRequest,
        deleteLeaveRequestRange,
        addAttendanceLog,
        updateSettings,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

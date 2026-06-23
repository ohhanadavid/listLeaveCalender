/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AppData } from '../types';

export const createInitialAppData = (): AppData => {
  return {
    employees: [],
    leavePatterns: [],
    leaveRequests: [],
    attendanceLogs: [],
    settings: {
      approverPin: '1234', // Default PIN
      minStaffPerDay: 2,   // Default min staffing level
      boardStartDate: new Date().toISOString().split('T')[0], // Default start is today
      boardEndDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default end is +60 days
    },
  };
};

/**
 * Validates that the loaded object conforms to the AppData structure.
 * Fills in missing fields with defaults if necessary.
 */
export const validateAndSanitizeAppData = (data: any): AppData => {
  const defaults = createInitialAppData();
  
  if (!data || typeof data !== 'object') {
    return defaults;
  }

  return {
    employees: Array.isArray(data.employees) ? data.employees : [],
    leavePatterns: Array.isArray(data.leavePatterns) ? data.leavePatterns : [],
    leaveRequests: Array.isArray(data.leaveRequests) ? data.leaveRequests : [],
    attendanceLogs: Array.isArray(data.attendanceLogs) ? data.attendanceLogs : [],
    settings: {
      approverPin: typeof data.settings?.approverPin === 'string' ? data.settings.approverPin : defaults.settings.approverPin,
      minStaffPerDay: typeof data.settings?.minStaffPerDay === 'number' ? data.settings.minStaffPerDay : defaults.settings.minStaffPerDay,
      boardStartDate: typeof data.settings?.boardStartDate === 'string' ? data.settings.boardStartDate : defaults.settings.boardStartDate,
      boardEndDate: typeof data.settings?.boardEndDate === 'string' ? data.settings.boardEndDate : defaults.settings.boardEndDate,
    },
  };
};

/**
 * Loads and parses AppData from a FileSystemFileHandle.
 */
export const loadAppDataFromFile = async (fileHandle: FileSystemFileHandle): Promise<AppData> => {
  const file = await fileHandle.getFile();
  const text = await file.text();
  
  if (!text.trim()) {
    // If the file is completely empty, initialize it with default data
    return createInitialAppData();
  }

  const parsed = JSON.parse(text);
  return validateAndSanitizeAppData(parsed);
};

/**
 * Writes AppData to a FileSystemFileHandle.
 */
export const saveAppDataToFile = async (fileHandle: FileSystemFileHandle, data: AppData): Promise<void> => {
  const writable = await fileHandle.createWritable();
  const serialized = JSON.stringify(data, null, 2);
  await writable.write(serialized);
  await writable.close();
};

/**
 * Triggers a manual browser download of the JSON data as a fallback for unsupported browsers.
 */
export const exportAppDataFallback = (data: AppData): void => {
  const serialized = JSON.stringify(data, null, 2);
  const blob = new Blob([serialized], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `calendar-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  
  // Clean up
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const DB_NAME = 'listLeaveCalendarDB';
const STORE_NAME = 'fileHandles';
const KEY_NAME = 'activeHandle';

/**
 * Saves a FileSystemFileHandle to IndexedDB so it can be restored on reload.
 */
export const saveFileHandleToIndexedDB = async (handle: FileSystemFileHandle): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const putRequest = store.put(handle, KEY_NAME);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };
    request.onerror = () => reject(request.error);
  });
};

/**
 * Loads the saved FileSystemFileHandle from IndexedDB, if it exists.
 */
export const loadFileHandleFromIndexedDB = async (): Promise<FileSystemFileHandle | null> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        resolve(null);
        return;
      }
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(KEY_NAME);
      getRequest.onsuccess = () => resolve(getRequest.result || null);
      getRequest.onerror = () => reject(getRequest.error);
    };
    request.onerror = () => reject(request.error);
  });
};

/**
 * Clears the saved FileSystemFileHandle from IndexedDB.
 */
export const clearFileHandleFromIndexedDB = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        resolve();
        return;
      }
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const deleteRequest = store.delete(KEY_NAME);
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
    request.onerror = () => reject(request.error);
  });
};

# Project Rules & Instructions - listLeaveCalender

This file defines the role, constraints, design system, and development workflow for AI agents working on this project.

## Agent Role & Profile
You are an expert React & TypeScript Developer specialized in building **100% offline-first web applications** designed for shared-device (kiosk) environments. Your focus is on reliability, strict network isolation, local storage/file system capabilities, and high-quality RTL (Hebrew) user interfaces.

---

## Core Constraints & Requirements

### 1. 100% Offline Execution (Critical)
- **Zero Network Calls**: The application must run completely disconnected from the internet.
- **No CDNs**: Do not load any external libraries, fonts, stylesheets, or icons via CDN.
- **Local Assets Only**: All dependencies (e.g., UI components, calendar, icons) must be installed as local `npm` packages and bundled.
- **Fonts**: Use local fonts (e.g., Heebo, Assistant) bundled with the application. Never import Google Fonts via URL.
- **Hebrew Calendar**: Use `@hebcal/core` installed locally for offline Hebrew date and holiday calculations.

### 2. Storage & File Access (JSON-based)
- **Local JSON File Storage**: The primary database is a single JSON file on the local disk.
- **Auto-Save**: Save data automatically on every state change using the browser's **File System Access API** (`showOpenFilePicker` to select/create a file once on application launch, and then write updates directly via file handles).
- **No Browser Database**: Avoid IndexedDB or WebSQL as primary stores (except for holding the file handle between sessions if supported).
- **Fallback**: Provide a manual "Export JSON" button (`Blob` + download link) for browsers that do not support the File System Access API.

### 3. Shared Kiosk Security (PIN)
- **Approver Mode**: Access to modifying configurations, employee lists, auto-generated schedules, and approving requests is guarded by a simple PIN/password entry.
- **State Guarding**: Ensure actions are blocked if `isApproverMode` is false.
- **Auto-Logout**: Implement an inactivity timeout to automatically exit Approver Mode since this is a shared kiosk.

### 4. Layout & RTL Support
- **RTL Language**: The user interface is entirely in Hebrew (`dir="rtl"`). Ensure layouts, forms, and calendar views align correctly for right-to-left reading.

---

## Design System

### Color Palette
- **Background**: `#FAF9F6` (warm off-white)
- **Surface**: `#FFFFFF` (pure white for cards/forms)
- **Primary Text**: `#1F2933`
- **Secondary Text**: `#5C6670`
- **Borders/Dividers**: `#E2E5E8`
- **Approver Active Accent**: `#0F6B5C` (deep teal - indicates active administrator/approver mode)
- **Warning Accent**: `#C2780C` (amber orange - used for minimum staff warnings)
- **Conflict/Error Accent**: `#B3261E` (red - used for request conflicts and file write errors)

### Employee Color Coding
- Use a categorical palette of up to 10 distinct, colorblind-friendly colors (e.g., Okabe-Ito palette) to represent different employees.
- **Important**: Never rely solely on color to distinguish employees; always include text identifiers (like initials or short names) alongside color indicators.

---

## Development Workflow

### Phase 1: Foundation & Types
1. Initialize the project using Vite + React + TypeScript.
2. Define types/interfaces for:
   - `Employee` (id, name, active, color)
   - `LeavePattern` (id, employeeId, workDays, leaveDays, startDate, isActive)
   - `LeaveRequest` (id, employeeId, date, type: full/hours, startTime?, endTime?, status: pending/approved/rejected, source: auto/manual/request)
   - `AttendanceLog` (id, employeeId, date, checkIn, checkOut)
   - `Settings` (approverPin, minStaffPerDay, boardStartDate, boardEndDate)

### Phase 2: State & Storage Layer
1. Setup global state management (Context API or Zustand).
2. Implement the File System Access API wrapper to handle file loading, auto-saving on state changes, and manual export fallback.

### Phase 3: Authentication & Admin Features
1. Implement the PIN verification login screen and `isApproverMode` state management.
2. Build employee management screens (create, edit, toggle active status).

### Phase 4: Core Logic & Calendaring
1. Implement the scheduling logic:
   - Recurring/Cyclical patterns (e.g., X work days + Y leave days starting from date).
   - Checking and highlighting conflicts (e.g., requests overlapping with automated patterns).
   - Minimum staffing checks (highlighting days where active staff falls below `minStaffPerDay`).
2. Integrate `FullCalendar` with Hebrew date display (`@hebcal/core`) and custom event rendering (color bars with employee initials).

### Phase 5: Verification & Audit
1. Test fully offline by disabling the network in the browser dev tools.
2. Review the Network tab to confirm zero external resource requests.

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AppShell } from './layouts/AppShell';
import { LoginPage } from './pages/LoginPage';

const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const EmployeesPage = lazy(() =>
  import('./pages/EmployeesPage').then((m) => ({ default: m.EmployeesPage }))
);
const EmployeeFormPage = lazy(() =>
  import('./pages/EmployeeFormPage').then((m) => ({ default: m.EmployeeFormPage }))
);
const EmployeeProfilePage = lazy(() =>
  import('./pages/EmployeeProfilePage').then((m) => ({ default: m.EmployeeProfilePage }))
);
const DepartmentsPage = lazy(() =>
  import('./pages/DepartmentsPage').then((m) => ({ default: m.DepartmentsPage }))
);
const DesignationsPage = lazy(() =>
  import('./pages/DesignationsPage').then((m) => ({ default: m.DesignationsPage }))
);
const AttendancePage = lazy(() =>
  import('./pages/AttendancePage').then((m) => ({ default: m.AttendancePage }))
);
const LeavePage = lazy(() =>
  import('./pages/LeavePage').then((m) => ({ default: m.LeavePage }))
);
const PayrollPage = lazy(() =>
  import('./pages/PayrollPage').then((m) => ({ default: m.PayrollPage }))
);
const PerformancePage = lazy(() =>
  import('./pages/PerformancePage').then((m) => ({ default: m.PerformancePage }))
);
const ReportsPage = lazy(() =>
  import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage }))
);
const NotificationsPage = lazy(() =>
  import('./pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage }))
);
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);

function RouteLoadingFallback() {
  return (
    <div className="p-6 space-y-4">
      <div className="h-7 w-48 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
      <div className="h-48 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#090E1A]">
        <div className="text-sm text-slate-500 dark:text-slate-400">Loading workspace...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#090E1A]">
        <div className="text-sm text-slate-500 dark:text-slate-400">Checking session...</div>
      </div>
    );
  }
  if (user) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<RouteLoadingFallback />}>
              <Routes>
                <Route
                  path="/login"
                  element={
                    <PublicOnlyRoute>
                      <LoginPage />
                    </PublicOnlyRoute>
                  }
                />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <AppShell />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<DashboardPage />} />
                  <Route path="employees" element={<EmployeesPage />} />
                  <Route path="employees/new" element={<EmployeeFormPage />} />
                  <Route path="employees/:id" element={<EmployeeProfilePage />} />
                  <Route path="employees/:id/edit" element={<EmployeeFormPage />} />
                  <Route path="departments" element={<DepartmentsPage />} />
                  <Route path="designations" element={<DesignationsPage />} />
                  <Route path="attendance" element={<AttendancePage />} />
                  <Route path="leave" element={<LeavePage />} />
                  <Route path="payroll" element={<PayrollPage />} />
                  <Route path="performance" element={<PerformancePage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

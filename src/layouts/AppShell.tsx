import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Building2,
  Briefcase,
  CalendarCheck,
  CalendarClock,
  CreditCard,
  TrendingUp,
  BarChart3,
  Bell,
  Settings,
  UserCircle,
  LogOut,
  Search,
  Sun,
  Moon,
  ChevronDown,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Avatar } from '../components/Avatar';
import { apiRequest } from '../services/api';
import type { EmployeeRecord, NotificationRecord } from '../types/hr';

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Overview',
  '/employees': 'Employees',
  '/employees/new': 'Add Employee',
  '/departments': 'Departments',
  '/designations': 'Designations',
  '/attendance': 'Attendance',
  '/leave': 'Leave Management',
  '/payroll': 'Payroll',
  '/performance': 'Performance',
  '/reports': 'Reports',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
  '/profile': 'Profile',
};

export function AppShell() {
  const { user, employee, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<EmployeeRecord[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);

  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const isHrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'HR_ADMIN';
  const canViewReports = isHrAdmin || user?.role === 'MANAGER';

  const navItems = [
    { to: '/', label: 'Overview', icon: LayoutDashboard, show: true },
    { to: '/employees', label: 'Employees', icon: Users, show: true },
    { to: '/employees/new', label: 'Add Employee', icon: UserPlus, show: isHrAdmin },
    { to: '/departments', label: 'Departments', icon: Building2, show: true },
    { to: '/designations', label: 'Designations', icon: Briefcase, show: true },
    { to: '/attendance', label: 'Attendance', icon: CalendarCheck, show: true },
    { to: '/leave', label: 'Leave Management', icon: CalendarClock, show: true },
    { to: '/payroll', label: 'Payroll', icon: CreditCard, show: true },
    { to: '/performance', label: 'Performance', icon: TrendingUp, show: true },
    { to: '/reports', label: 'Reports', icon: BarChart3, show: canViewReports },
    { to: '/notifications', label: 'Notifications', icon: Bell, show: true },
    { to: '/settings', label: 'Settings', icon: Settings, show: true },
    { to: '/profile', label: 'Profile', icon: UserCircle, show: true },
  ].filter((item) => item.show);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    let active = true;
    apiRequest<{ items: NotificationRecord[]; unreadCount: number }>('/api/dashboard/notifications')
      .then((res) => {
        if (active) {
          setNotifications(res.items.slice(0, 6));
          setUnreadCount(res.unreadCount);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [location.pathname]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      apiRequest<{ items: EmployeeRecord[] }>(
        `/api/employees?search=${encodeURIComponent(searchQuery.trim())}&limit=6`
      )
        .then((res) => {
          setSearchResults(res.items);
          setSearchOpen(true);
        })
        .catch(() => setSearchResults([]));
    }, 180);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentBreadcrumb =
    ROUTE_TITLES[location.pathname] ||
    (location.pathname.startsWith('/employees/') ? 'Employee Profile' : 'Workspace');

  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  const handleMarkAllRead = async () => {
    await apiRequest('/api/dashboard/notifications/all/read', { method: 'PATCH' });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const SidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-[#0D1424] border-r border-slate-200 dark:border-slate-800/90">
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800/90 shrink-0">
        <Link
          to="/"
          className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap"
        >
          Calibre HR
        </Link>
        <button
          type="button"
          onClick={() => setMobileNavOpen(false)}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/' || item.to === '/employees'}
              aria-label={item.label}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-blue-600 dark:text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
              {item.to === '/notifications' && unreadCount > 0 && (
                <span aria-hidden="true" className="ml-auto font-mono text-xs tabular-nums opacity-85">
                  {unreadCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-200 dark:border-slate-800/90 shrink-0">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-400 transition-colors whitespace-nowrap"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#090E1A] text-slate-900 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-60 shrink-0 sticky top-0 h-screen">
        {SidebarContent}
      </aside>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNavOpen(false)}
              className="fixed inset-0 bg-slate-950/60"
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-64 max-w-[85vw] h-full"
            >
              {SidebarContent}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-16 bg-white/90 dark:bg-[#0D1424]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/90 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>

            <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-sm min-w-0">
              <Link
                to="/"
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white whitespace-nowrap"
              >
                Workspace
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                {currentBreadcrumb}
              </span>
            </nav>
          </div>

          {/* Global Search */}
          <div ref={searchRef} className="relative flex-1 max-w-md">
            <label htmlFor="global-employee-search" className="sr-only">
              Search employees
            </label>
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="global-employee-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
              placeholder="Search employees by name, ID, or email..."
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/70 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
            />
            <AnimatePresence>
              {searchOpen && searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.14 }}
                  className="absolute left-0 right-0 mt-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-xl overflow-hidden z-40"
                >
                  {searchResults.map((emp) => (
                    <button
                      key={emp._id}
                      type="button"
                      onClick={() => {
                        setSearchOpen(false);
                        setSearchQuery('');
                        navigate(`/employees/${emp._id}`);
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
                    >
                      <Avatar src={emp.avatarUrl} name={emp.fullName} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {emp.fullName}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          <span className="font-mono">{emp.employeeId}</span> · {emp.departmentId?.name || 'Department'}
                        </div>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden xl:inline-block text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap pr-2">
              {todayFormatted}
            </span>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notifications */}
            <div ref={notifRef} className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((o) => !o)}
                aria-label="Open notifications"
                className="relative h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-blue-600 text-white font-mono text-[10px] leading-4 text-center tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-xl z-40 overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Notifications
                      </span>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                          You are all caught up.
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <button
                            key={n._id}
                            type="button"
                            onClick={() => {
                              setNotifOpen(false);
                              if (n.link) navigate(n.link);
                            }}
                            className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                              !n.isRead ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                            }`}
                          >
                            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                              {n.title}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                              {n.message}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                    <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                      <Link
                        to="/notifications"
                        onClick={() => setNotifOpen(false)}
                        className="text-xs font-medium text-slate-700 dark:text-slate-300 hover:underline"
                      >
                        View all notifications
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Dropdown */}
            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((o) => !o)}
                aria-label="Open account menu"
                className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Avatar src={employee?.avatarUrl} name={user?.fullName || 'User'} size="sm" />
                <div className="hidden md:block text-left">
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight whitespace-nowrap max-w-[120px] truncate">
                    {user?.fullName}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight whitespace-nowrap">
                    {user?.role.replace('_', ' ')}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <AnimatePresence>
                {profileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.14 }}
                    className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-xl py-1.5 z-40"
                  >
                    <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {user?.fullName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {user?.email}
                      </div>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setProfileMenuOpen(false)}
                      className="block px-3.5 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      My Profile
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setProfileMenuOpen(false)}
                      className="block px-3.5 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      Settings
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left px-3.5 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

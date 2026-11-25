import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock, Mail, User, ShieldCheck, Sun, Moon, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { apiRequest } from '../services/api';

type AuthMode = 'login' | 'forgot' | 'reset';

export function LoginPage() {
  const { needsSetup, login, setupWorkspace } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // First-run workspace setup fields
  const [setupName, setSetupName] = useState('Raghuraj Pratap Singh');
  const [setupEmail, setSetupEmail] = useState('raghurajpratapsingh8787@gmail.com');
  const [setupPassword, setSetupPassword] = useState('');
  const [seedSampleData, setSeedSampleData] = useState(true);

  // Standard auth fields
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      await setupWorkspace({
        fullName: setupName,
        email: setupEmail,
        password: setupPassword,
        seedSampleData,
      });
      showToast('Enterprise workspace initialized', 'success');
      navigate('/');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Workspace setup failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      await login(email, password);
      showToast('Signed in successfully', 'success');
      navigate('/');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      const res = await apiRequest<{ message: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
        skipAuthRefresh: true,
      });
      showToast(res.message, 'info');
      setMode('reset');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      const res = await apiRequest<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: resetToken, newPassword }),
        skipAuthRefresh: true,
      });
      showToast(res.message, 'success');
      setMode('login');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Password reset failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#090E1A] text-slate-900 dark:text-slate-100">
      <header className="h-16 px-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0D1424]">
        <span className="font-display text-lg font-bold tracking-tight">Calibre HR</span>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </header>

      <div className="flex-1 grid lg:grid-cols-12">
        {/* Left Brand Context Panel */}
        <div className="hidden lg:flex lg:col-span-6 flex-col justify-between p-12 bg-slate-900 dark:bg-[#0D1424] text-white border-r border-slate-800">
          <div>
            <p className="text-xs font-medium tracking-wide text-blue-400">
              Enterprise People Operations
            </p>
            <h1 className="mt-4 font-display text-4xl font-bold tracking-tight leading-tight max-w-lg text-balance">
              Workforce governance, payroll precision, and team performance in one system.
            </h1>
            <p className="mt-5 text-sm text-slate-300 max-w-md leading-relaxed">
              Role-scoped access control protects compensation records, personal files, and manager reviews across your entire organization.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-800">
            <div>
              <div className="text-2xl font-bold font-mono tabular-nums">4 Roles</div>
              <div className="text-xs text-slate-400 mt-1">Server-enforced RBAC</div>
            </div>
            <div>
              <div className="text-2xl font-bold font-mono tabular-nums">12 Models</div>
              <div className="text-xs text-slate-400 mt-1">MongoDB persistence</div>
            </div>
            <div>
              <div className="text-2xl font-bold font-mono tabular-nums">Audit Log</div>
              <div className="text-xs text-slate-400 mt-1">Action accountability</div>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="lg:col-span-6 flex items-center justify-center p-6 sm:p-12">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-7 shadow-sm"
          >
            {needsSetup ? (
              <form onSubmit={handleSetup} className="space-y-4">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-medium">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Initial Workspace Setup</span>
                </div>
                <div>
                  <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                    Claim Super Admin Account
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Set your administrator password to initialize MongoDB and launch Calibre HR.
                  </p>
                </div>

                {errorMsg && (
                  <div className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-3.5 py-2.5 text-xs text-rose-700 dark:text-rose-300">
                    {errorMsg}
                  </div>
                )}

                <div>
                  <label htmlFor="setup-name" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="setup-name"
                      type="text"
                      required
                      value={setupName}
                      onChange={(e) => setSetupName(e.target.value)}
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="setup-email" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Administrator Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="setup-email"
                      type="email"
                      required
                      value={setupEmail}
                      onChange={(e) => setSetupEmail(e.target.value)}
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="setup-password" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Password (minimum 8 characters)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="setup-password"
                      type="password"
                      required
                      minLength={8}
                      value={setupPassword}
                      onChange={(e) => setSetupPassword(e.target.value)}
                      placeholder="Choose a strong password"
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={seedSampleData}
                    onChange={(e) => setSeedSampleData(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                  />
                  <span>Populate enterprise departments, staff, attendance, and payroll records</span>
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-10 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-sm font-medium hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <span>{submitting ? 'Initializing workspace...' : 'Initialize Workspace'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                    Sign in to Calibre HR
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Enter your enterprise credentials to access your workspace.
                  </p>
                </div>

                {errorMsg && (
                  <div className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-3.5 py-2.5 text-xs text-rose-700 dark:text-rose-300">
                    {errorMsg}
                  </div>
                )}

                <div>
                  <label htmlFor="login-email" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Work Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="login-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.io"
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="login-password" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg('');
                        setMode('forgot');
                      }}
                      className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="login-password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-10 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-sm font-medium hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <span>{submitting ? 'Signing in...' : 'Sign in'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : mode === 'forgot' ? (
              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                    Reset Password
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Enter your work email to request a password reset token.
                  </p>
                </div>

                {errorMsg && (
                  <div className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-3.5 py-2.5 text-xs text-rose-700 dark:text-rose-300">
                    {errorMsg}
                  </div>
                )}

                <div>
                  <label htmlFor="forgot-email" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Work Email
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-10 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
                >
                  {submitting ? 'Submitting...' : 'Request Reset Token'}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="w-full text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  Back to sign in
                </button>
              </form>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                    Enter Reset Token
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Provide your reset token and choose a new password.
                  </p>
                </div>

                {errorMsg && (
                  <div className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-3.5 py-2.5 text-xs text-rose-700 dark:text-rose-300">
                    {errorMsg}
                  </div>
                )}

                <div>
                  <label htmlFor="reset-token" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Reset Token
                  </label>
                  <input
                    id="reset-token"
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono"
                  />
                </div>

                <div>
                  <label htmlFor="reset-new-pw" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    New Password
                  </label>
                  <input
                    id="reset-new-pw"
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-10 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
                >
                  {submitting ? 'Updating...' : 'Update Password'}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="w-full text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  Back to sign in
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

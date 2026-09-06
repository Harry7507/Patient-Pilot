import React, { useState } from 'react';
import { Stethoscope, Lock, Mail, User, Phone, Loader2, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, register } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      await login({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      // Successful login updates context state; App will branch based on role
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!regEmail.trim() || !regPassword.trim()) {
      setError('Email and password are required.');
      return;
    }

    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      await register({
        email: regEmail.trim(),
        password: regPassword,
        fullName: regName.trim() || undefined,
        contactNumber: regPhone.trim() || undefined,
      });

      setSuccessMessage('Patient account created successfully! Signing you in...');

      // Auto-login after registration
      try {
        await login({
          email: regEmail.trim(),
          password: regPassword,
        });
      } catch {
        setSuccessMessage('Registration successful! Please sign in below.');
        setMode('login');
        setLoginEmail(regEmail.trim());
      }
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please check the details and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fbff] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Top Brand Logo Banner */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-blue text-white shadow-lg shadow-sky-200 mb-4">
          <Stethoscope className="w-9 h-9" strokeWidth={2.4} />
        </div>
        <h1 className="text-3xl font-extrabold text-text-dark tracking-tight">
          PATIENT<span className="text-primary-blue">PILOT</span>
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Autonomous OPD Intake, Triage & Clinician Briefing System
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-md bg-white py-8 px-6 shadow-xl shadow-slate-100 rounded-2xl border border-slate-200/80 sm:px-10">
        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${mode === 'login'
                ? 'bg-white text-text-dark shadow-sm'
                : 'text-gray-500 hover:text-text-dark'
              }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${mode === 'register'
                ? 'bg-white text-text-dark shadow-sm'
                : 'text-gray-500 hover:text-text-dark'
              }`}
          >
            New Patient Register
          </button>
        </div>

        {/* Inline Error Alert */}
        {error && (
          <div className="mb-5 rounded-xl bg-red-50 border border-red-200 p-3.5 flex items-start gap-3 text-red-700 text-sm animate-fadeIn">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
            <span className="flex-1 font-medium">{error}</span>
          </div>
        )}

        {/* Inline Success Alert */}
        {successMessage && (
          <div className="mb-5 rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 flex items-start gap-3 text-emerald-700 text-sm animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600" />
            <span className="flex-1 font-medium">{successMessage}</span>
          </div>
        )}

        {/* Mode 1: Login Form */}
        {mode === 'login' ? (
          <form className="space-y-4" onSubmit={handleLoginSubmit}>
            <div>
              <label className="block text-xs font-bold text-text-dark uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="patient@example.com or doctor@hospital.org"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-300 text-text-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-dark uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-300 text-text-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-md shadow-sky-100 text-sm font-bold text-white bg-primary-blue hover:bg-[#1a90d9] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-blue disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </div>

            <div className="pt-3 text-center">
              <p className="text-xs text-gray-500">
                New patient?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className="font-bold text-primary-blue hover:underline focus:outline-none"
                >
                  Register here
                </button>
              </p>
            </div>
          </form>
        ) : (
          /* Mode 2: Patient Registration Form */
          <form className="space-y-4" onSubmit={handleRegisterSubmit}>
            <div className="rounded-lg bg-sky-50/70 border border-sky-100 p-3 text-xs text-sky-800 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-primary-blue flex-shrink-0 mt-0.5" />
              <span>
                Self-service registration creates an OPD <strong>Patient</strong> account. Clinician credentials are issued by hospital administration.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-dark uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Ramesh Sharma"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-300 text-text-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-dark uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="ramesh@example.com"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-300 text-text-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-dark uppercase tracking-wider mb-1.5">
                Contact Phone
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-300 text-text-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-dark uppercase tracking-wider mb-1.5">
                Password (min. 6 characters)
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-300 text-text-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-md shadow-sky-100 text-sm font-bold text-white bg-primary-blue hover:bg-[#1a90d9] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-blue disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Patient Account...</span>
                  </>
                ) : (
                  <span>Register Patient Account</span>
                )}
              </button>
            </div>

            <div className="pt-3 text-center">
              <p className="text-xs text-gray-500">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className="font-bold text-primary-blue hover:underline focus:outline-none"
                >
                  Sign in here
                </button>
              </p>
            </div>
          </form>
        )}
      </div>

      {/* Security and Hospital Compliance Footnote */}
      <div className="mt-8 text-center text-xs text-gray-400 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-gray-400 inline" />
        <span>NABH & ABDM Secure Protocol • End-to-End Encrypted Session</span>
      </div>
    </div>
  );
};

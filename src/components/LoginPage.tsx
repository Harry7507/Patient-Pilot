import React, { useState, useEffect, useCallback } from 'react';
import { Stethoscope, Lock, Mail, User, Phone, Loader2, AlertCircle, CheckCircle2, ShieldCheck, RefreshCw, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';

export const LoginPage: React.FC = () => {
  const { login, register, loginOfflineDemo } = useAuth();

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
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  const checkStatus = useCallback(async () => {
    setBackendStatus('checking');
    const isHealthy = await apiClient.checkHealth();
    setBackendStatus(isHealthy ? 'online' : 'offline');
    return isHealthy;
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, [checkStatus]);

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
      setBackendStatus('offline');
      if (err?.message === 'Failed to fetch' || err?.message?.includes('fetch') || err?.message?.includes('Cannot reach the backend server')) {
        setError('Cannot reach the backend server at http://localhost:8000. Please ensure the FastAPI backend is running (npm run server or python -m uvicorn app.main:app --port 8000).');
      } else {
        setError(err?.message || 'Login failed. Please check your credentials and try again.');
      }
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
    <div className="min-h-screen bg-[url('/login-page-bg.jpg')] bg-cover bg-center bg-no-repeat relative flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Dark overlay for contrast and sleek medical aesthetic */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-slate-900/70 to-slate-950/85 backdrop-blur-[2px]" />

      {/* Content wrapper with relative z-10 */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        {/* Top Brand Logo Banner */}
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-blue text-white shadow-xl shadow-sky-500/30 mb-3 border border-white/20">
            <Stethoscope className="w-9 h-9" strokeWidth={2.4} />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
            PATIENT<span className="text-primary-blue">PILOT</span>
          </h1>
          <p className="mt-1.5 text-sm text-sky-100/80 drop-shadow-sm font-medium">
            Autonomous OPD Intake, Triage & Clinician Briefing System
          </p>
        </div>

        {/* Main Authentication Card */}
        <div className="w-full bg-white/95 backdrop-blur-md py-8 px-6 shadow-2xl shadow-black/40 rounded-2xl border border-white/60 sm:px-10">
        
        {/* Live Backend Connectivity Pill */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            {backendStatus === 'online' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                FastAPI Backend Online (Port 8000)
              </span>
            ) : backendStatus === 'checking' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                <Loader2 className="w-3 h-3 animate-spin text-slate-500" />
                Connecting to backend...
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Backend Offline (Offline Demo Available)
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={checkStatus}
            className="text-[11px] font-bold text-slate-500 hover:text-primary-blue flex items-center gap-1 p-1 rounded hover:bg-slate-50 transition-colors"
            title="Check API server health"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${backendStatus === 'checking' ? 'animate-spin' : ''}`} />
            <span>Check</span>
          </button>
        </div>

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

        {/* Inline Error Alert with Actionable Recovery */}
        {error && (
          <div className="mb-5 rounded-xl bg-red-50 border border-red-200 p-4 text-red-700 text-sm animate-fadeIn shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
              <div className="flex-1 space-y-2.5">
                <p className="font-medium text-xs sm:text-sm leading-relaxed">{error}</p>
                {error.includes('Cannot reach the backend') && (
                  <div className="pt-2 border-t border-red-200/80 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await checkStatus();
                        if (ok) {
                          setError(null);
                          handleLoginSubmit({ preventDefault: () => {} } as any);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white border border-red-300 hover:bg-red-100/60 text-red-800 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry Connection</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => loginOfflineDemo(loginEmail.includes('doctor') ? 'doctor' : 'patient')}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Explore in Offline Demo Mode</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
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

        {/* Quick Demo Credentials Assistant */}
        <div className="mt-6 pt-5 border-t border-slate-200/80">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              Demo Accounts (Click to autofill)
            </span>
            <span className="text-[10px] bg-sky-100 text-sky-800 font-semibold px-2 py-0.5 rounded-full">
              3 Doctors • 4 Patients
            </span>
          </div>

          <div className="space-y-2">
            <div>
              <p className="text-[11px] font-semibold text-slate-600 mb-1">👨‍⚕️ Doctors (Clinician Dashboard):</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setLoginEmail('doctor@patientpilot.org');
                    setLoginPassword('Doctor@123');
                    setError(null);
                  }}
                  className="text-left text-[11px] p-2 rounded-lg bg-sky-50/70 hover:bg-sky-100/80 border border-sky-200/60 text-slate-800 transition-colors"
                >
                  <span className="font-bold block text-sky-900 truncate">Dr. Rajesh (Cardio)</span>
                  <span className="text-slate-500 text-[10px] truncate block">doctor@patientpilot.org</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setLoginEmail('dr.priya@patientpilot.org');
                    setLoginPassword('Doctor@123');
                    setError(null);
                  }}
                  className="text-left text-[11px] p-2 rounded-lg bg-sky-50/70 hover:bg-sky-100/80 border border-sky-200/60 text-slate-800 transition-colors"
                >
                  <span className="font-bold block text-sky-900 truncate">Dr. Priya (Internal/ER)</span>
                  <span className="text-slate-500 text-[10px] truncate block">dr.priya@patientpilot.org</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setLoginEmail('dr.anand@patientpilot.org');
                    setLoginPassword('Doctor@123');
                    setError(null);
                  }}
                  className="text-left text-[11px] p-2 rounded-lg bg-sky-50/70 hover:bg-sky-100/80 border border-sky-200/60 text-slate-800 transition-colors"
                >
                  <span className="font-bold block text-sky-900 truncate">Dr. Anand (Pulmo)</span>
                  <span className="text-slate-500 text-[10px] truncate block">dr.anand@patientpilot.org</span>
                </button>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-slate-600 mb-1">👤 Patients (Intake Portal):</p>
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setLoginEmail('patient@patientpilot.org');
                    setLoginPassword('Patient@123');
                    setError(null);
                  }}
                  className="text-left text-[11px] p-2 rounded-lg bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200/60 text-slate-800 transition-colors"
                >
                  <span className="font-bold block text-emerald-950 truncate">Rajesh Kumar (OPD-0001)</span>
                  <span className="text-slate-500 text-[10px] truncate block">Chest Pain • 58M</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setLoginEmail('anita.desai@patientpilot.org');
                    setLoginPassword('Patient@123');
                    setError(null);
                  }}
                  className="text-left text-[11px] p-2 rounded-lg bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200/60 text-slate-800 transition-colors"
                >
                  <span className="font-bold block text-emerald-950 truncate">Anita Desai (OPD-0002)</span>
                  <span className="text-slate-500 text-[10px] truncate block">Asthma Wheezing • 34F</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setLoginEmail('sunil.verma@patientpilot.org');
                    setLoginPassword('Patient@123');
                    setError(null);
                  }}
                  className="text-left text-[11px] p-2 rounded-lg bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200/60 text-slate-800 transition-colors"
                >
                  <span className="font-bold block text-emerald-950 truncate">Sunil Verma (OPD-0003)</span>
                  <span className="text-slate-500 text-[10px] truncate block">Abdominal Pain • 45M</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setLoginEmail('meera.patel@patientpilot.org');
                    setLoginPassword('Patient@123');
                    setError(null);
                  }}
                  className="text-left text-[11px] p-2 rounded-lg bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200/60 text-slate-800 transition-colors"
                >
                  <span className="font-bold block text-emerald-950 truncate">Meera Patel (OPD-0004)</span>
                  <span className="text-slate-500 text-[10px] truncate block">Routine Follow-up • 62F</span>
                </button>
              </div>
            </div>

            {/* Offline Demo Mode Quick Launch */}
            <div className="mt-3 pt-3 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-slate-500">
                Explore without starting server:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => loginOfflineDemo('doctor')}
                  className="text-[11px] font-bold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg border border-sky-200 transition-colors flex items-center gap-1"
                >
                  <Zap className="w-3 h-3 text-sky-600" />
                  <span>Doctor Dashboard Demo</span>
                </button>
                <button
                  type="button"
                  onClick={() => loginOfflineDemo('patient')}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors flex items-center gap-1"
                >
                  <Zap className="w-3 h-3 text-emerald-600" />
                  <span>Patient Intake Demo</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security and Hospital Compliance Footnote */}
      <div className="mt-6 text-center text-xs text-sky-100/70 flex items-center gap-2 drop-shadow-sm font-medium">
        <ShieldCheck className="w-4 h-4 text-primary-blue inline" />
        <span>NABH & ABDM Secure Protocol • End-to-End Encrypted Session</span>
      </div>
      </div>
    </div>
  );
};

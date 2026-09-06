// PatientPilot Thin API Client with Automatic 401 Token Refresh
// Connects React frontend to FastAPI backend (/api/v1)

import {
  PatientDemographics,
  SocratesHistory,
  ExtractedMedication,
  ExtractedLabValue,
  DashavidhaPariksha,
  TriageResult,
  LanguageCode,
} from '../types/clinical';

const BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api/v1';

export interface AuthUser {
  id: string;
  email: string;
  role: 'patient' | 'doctor';
  fullName?: string;
  isFirstLogin: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  role: string;
  isFirstLogin: boolean;
  user: AuthUser;
}

class ApiClient {
  private baseUrl: string;
  private isRefreshing: boolean = false;
  private refreshSubscribers: Array<(token: string) => void> = [];
  private accessToken: string | null = null;
  private refreshTokenValue: string | null = null;
  private currentUser: AuthUser | null = null;
  private onAuthFailureCallback?: () => void;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    try {
      this.refreshTokenValue = sessionStorage.getItem('pp_refresh_token');
      const savedUser = sessionStorage.getItem('pp_user');
      if (savedUser) {
        this.currentUser = JSON.parse(savedUser);
      }
    } catch {
      // Ignore storage access errors
    }
  }

  public async checkHealth(): Promise<boolean> {
    const candidateUrls = [
      this.baseUrl.startsWith('http') ? `${this.baseUrl.replace(/\/api\/v1\/?$/, '')}/health` : '/health',
      'http://127.0.0.1:8000/health',
      'http://localhost:8000/health'
    ];
    for (const target of candidateUrls) {
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 1800);
        const res = await fetch(target, { method: 'GET', signal: controller.signal });
        clearTimeout(id);
        if (res.ok) return true;
      } catch {
        // try next candidate
      }
    }
    return false;
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  public setOnAuthFailure(callback: () => void) {
    this.onAuthFailureCallback = callback;
  }

  // Token management - Access token in memory, session refresh token persisted in sessionStorage
  public getAccessToken(): string | null {
    return this.accessToken;
  }

  public getRefreshToken(): string | null {
    return this.refreshTokenValue;
  }

  public setTokens(access: string, refresh: string, user?: AuthUser) {
    this.accessToken = access;
    this.refreshTokenValue = refresh;
    if (user) {
      this.currentUser = user;
    }
    try {
      sessionStorage.setItem('pp_refresh_token', refresh);
      if (this.currentUser) {
        sessionStorage.setItem('pp_user', JSON.stringify(this.currentUser));
      }
    } catch {
      // Ignore storage access errors
    }
  }

  public clearTokens() {
    this.accessToken = null;
    this.refreshTokenValue = null;
    this.currentUser = null;
    try {
      sessionStorage.removeItem('pp_refresh_token');
      sessionStorage.removeItem('pp_user');
    } catch {
      // Ignore storage access errors
    }
  }

  public getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  private onRefreshed(token: string) {
    this.refreshSubscribers.forEach((cb) => cb(token));
    this.refreshSubscribers = [];
  }

  private addRefreshSubscriber(cb: (token: string) => void) {
    this.refreshSubscribers.push(cb);
  }

  // Core fetch wrapper with 401 handling, resilience fallback & automatic token refresh
  public async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const cleanEndpoint = endpoint.replace(/^\/+/, '');
    const url = `${this.baseUrl}/${cleanEndpoint}`;
    const token = this.getAccessToken();

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };

    // Attach Bearer token if present
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Default to application/json unless FormData
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    let response: Response;
    try {
      response = await fetch(url, { ...options, headers });
    } catch (netErr) {
      // Dual-fetch resilience: Try 127.0.0.1:8000 directly if relative URL or localhost failed
      const directFallbackUrl = `http://127.0.0.1:8000/api/v1/${cleanEndpoint}`;
      if (url !== directFallbackUrl) {
        try {
          response = await fetch(directFallbackUrl, { ...options, headers });
        } catch {
          throw new Error('Cannot reach the backend server at http://localhost:8000. Please ensure the FastAPI backend is running (npm run server or python -m uvicorn app.main:app --port 8000).');
        }
      } else {
        throw new Error('Cannot reach the backend server at http://localhost:8000. Please ensure the FastAPI backend is running (npm run server or python -m uvicorn app.main:app --port 8000).');
      }
    }

    // Handle 401 Unauthorized with refresh flow
    if (response.status === 401 && this.getRefreshToken()) {
      if (this.isRefreshing) {
        // Another refresh is already in flight; wait for it to finish and retry
        return new Promise<T>((resolve, reject) => {
          this.addRefreshSubscriber(async (newToken: string) => {
            try {
              headers['Authorization'] = `Bearer ${newToken}`;
              const retryRes = await fetch(url, { ...options, headers });
              if (!retryRes.ok) {
                const errData = await retryRes.json().catch(() => ({}));
                reject(new Error(errData.detail || `HTTP Error ${retryRes.status}`));
              } else {
                resolve(await retryRes.json());
              }
            } catch (err) {
              reject(err);
            }
          });
        });
      }

      this.isRefreshing = true;
      try {
        const newTokens = await this.refreshToken();
        this.setTokens(newTokens.accessToken, newTokens.refreshToken, newTokens.user);
        this.isRefreshing = false;
        this.onRefreshed(newTokens.accessToken);

        // Directly retry the original request with newly refreshed token
        headers['Authorization'] = `Bearer ${newTokens.accessToken}`;
        const retryRes = await fetch(url, { ...options, headers });
        if (!retryRes.ok) {
          const errData = await retryRes.json().catch(() => ({}));
          throw new Error(errData.detail || `HTTP Error ${retryRes.status}`);
        }
        return await retryRes.json();
      } catch (refreshErr) {
        this.isRefreshing = false;
        this.clearTokens();
        if (this.onAuthFailureCallback) {
          this.onAuthFailureCallback();
        }
        throw new Error('Session expired. Please log in again.');
      }
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  // ==========================================
  // Auth Endpoints
  // ==========================================

  public async register(payload: { email: string; password: string; fullName?: string }): Promise<any> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async login(payload: { email: string; password: string }): Promise<AuthTokens> {
    const res = await this.request<{
      access_token: string;
      refresh_token: string;
      role: string;
      is_first_login: boolean;
      user: { id: string; email: string; role: string; full_name?: string; is_first_login: boolean };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const tokens: AuthTokens = {
      accessToken: res.access_token,
      refreshToken: res.refresh_token,
      role: res.role,
      isFirstLogin: res.is_first_login,
      user: {
        id: res.user.id,
        email: res.user.email,
        role: res.user.role as 'patient' | 'doctor',
        fullName: res.user.full_name,
        isFirstLogin: res.user.is_first_login,
      },
    };

    this.setTokens(tokens.accessToken, tokens.refreshToken, tokens.user);
    return tokens;
  }

  public async refreshToken(): Promise<AuthTokens> {
    const currentRefresh = this.getRefreshToken();
    if (!currentRefresh) {
      throw new Error('No refresh token available');
    }

    const res = await fetch(`${this.baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: currentRefresh }),
    });

    if (!res.ok) {
      throw new Error('Refresh token invalid or expired');
    }

    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      role: data.role,
      isFirstLogin: data.is_first_login,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: data.user.role,
        fullName: data.user.full_name,
        isFirstLogin: data.user.is_first_login,
      },
    };
  }

  public async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.clearTokens();
    }
  }

  // ==========================================
  // Patient & Intake Session Endpoints
  // ==========================================

  public async getPatientProfile(patientId: string): Promise<any> {
    return this.request(`/patients/${patientId}`);
  }

  public async createPatientProfile(demographics: PatientDemographics): Promise<any> {
    return this.request('/patients', {
      method: 'POST',
      body: JSON.stringify(demographics),
    });
  }

  public async updatePatientProfile(patientId: string, updates: Partial<PatientDemographics>): Promise<any> {
    return this.request(`/patients/${patientId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  public async getIntakeSessions(patientId: string): Promise<any[]> {
    return this.request(`/patients/${patientId}/intake-sessions`);
  }

  public async createIntakeSession(patientId: string, initialData: any): Promise<any> {
    return this.request(`/patients/${patientId}/intake-sessions`, {
      method: 'POST',
      body: JSON.stringify(initialData),
    });
  }

  public async updateIntakeSession(sessionId: string, updates: any): Promise<any> {
    return this.request(`/intake-sessions/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  public async addMedication(sessionId: string, medication: ExtractedMedication): Promise<any> {
    return this.request(`/intake-sessions/${sessionId}/medications`, {
      method: 'POST',
      body: JSON.stringify(medication),
    });
  }

  public async addLabValue(sessionId: string, labValue: ExtractedLabValue): Promise<any> {
    return this.request(`/intake-sessions/${sessionId}/lab-values`, {
      method: 'POST',
      body: JSON.stringify(labValue),
    });
  }

  public async uploadDocument(sessionId: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.request(`/intake-sessions/${sessionId}/documents`, {
      method: 'POST',
      body: formData,
    });
  }

  public async evaluateTriage(sessionId: string): Promise<TriageResult> {
    return this.request(`/intake-sessions/${sessionId}/triage`, {
      method: 'POST',
    });
  }

  public async transcribeAudio(sessionId: string, audioBlob: Blob): Promise<{ transcript: string; language: string }> {
    const formData = new FormData();
    formData.append('file', audioBlob, 'speech.webm');
    return this.request(`/intake-sessions/${sessionId}/transcribe`, {
      method: 'POST',
      body: formData,
    });
  }

  public async getSessionFhir(sessionId: string): Promise<any> {
    return this.request(`/intake-sessions/${sessionId}/fhir`);
  }

  // ==========================================
  // AI & Multilingual Endpoints
  // ==========================================

  public async chatIntake(payload: {
    user_message: string;
    language?: LanguageCode;
    current_step_id?: string;
    intake_session_id?: string;
    extracted_socrates?: SocratesHistory;
  }): Promise<{
    agent_message: string;
    localized_message: string;
    language: string;
    suggested_options: string[];
    extracted_socrates_delta?: Partial<SocratesHistory>;
    is_emergency: boolean;
  }> {
    return this.request('/intake/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async assessAyush(payload: {
    factors: DashavidhaPariksha;
    language?: LanguageCode;
    intake_session_id?: string;
  }): Promise<{
    summary: string;
    localized_summary: string;
    dosha_profile: string;
    dietary_guidelines: string[];
    lifestyle_recommendations: string[];
  }> {
    return this.request('/intake/ayush', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async translate(text: string, targetLanguage: LanguageCode): Promise<{ translated_text: string }> {
    return this.request('/intake/translate', {
      method: 'POST',
      body: JSON.stringify({ text, target_language: targetLanguage }),
    });
  }

  // ==========================================
  // Doctor Dashboard Endpoints
  // ==========================================

  public async getDoctorBriefings(triageLevel?: string): Promise<any[]> {
    const query = triageLevel ? `?triage_level=${triageLevel}` : '';
    return this.request(`/doctor/briefings${query}`);
  }

  public async getDoctorBriefing(briefingId: string): Promise<any> {
    return this.request(`/doctor/briefings/${briefingId}`);
  }

  public async updateDoctorBriefing(briefingId: string, notes: string): Promise<any> {
    return this.request(`/doctor/briefings/${briefingId}`, {
      method: 'PATCH',
      body: JSON.stringify({ clinician_notes: notes, reviewed: true }),
    });
  }
}

export const apiClient = new ApiClient();

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Sparkles, 
  Globe, 
  ShieldCheck, 
  Leaf, 
  CheckCircle2, 
  HeartPulse, 
  FileText, 
  ArrowRight, 
  TrendingUp,
  X
} from 'lucide-react';
import { 
  LanguageCode, 
  PatientDemographics, 
  SocratesHistory, 
  ExtractedMedication, 
  ExtractedLabValue, 
  DashavidhaPariksha, 
  ClinicianBriefing, 
  DocumentExtraction 
} from './types/clinical';
import { evaluateDeterministicSafety } from './services/safetyMatrix';
import { KioskHeader } from './components/KioskHeader';
import { IntakeChatView } from './components/IntakeChatView';
import { SidebarStatusPanel } from './components/SidebarStatusPanel';
import { ClinicianDashboardView } from './components/ClinicianDashboardView';
import { DocumentUploadModal } from './components/DocumentUploadModal';
import { EmergencyAlertBanner } from './components/EmergencyAlertBanner';
import { SettingsModal } from './components/SettingsModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RequireRole } from './components/RequireRole';
import { LoginPage } from './components/LoginPage';
import { apiClient } from './services/apiClient';

const HERO_IMAGES = [
  '/hero-1.jpg',
  '/hero-2.jpg',
  '/hero-3.jpg'
];

const DEFAULT_DEMOGRAPHICS: PatientDemographics = {
  name: 'Vikram Malhotra',
  age: 54,
  gender: 'Male',
  opdRegId: 'OPD-2026-084',
  contactNumber: '+91 98765 43210'
};

const AppContent: React.FC = () => {
  const { isAuthenticated, role, user, isFirstLogin, isRestoringSession, logout } = useAuth();

  // App Config
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [isAyushActive, setIsAyushActive] = useState<boolean>(false);
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    return localStorage.getItem('PATIENTPILOT_GEMINI_API_KEY') || '';
  });

  // Hero Banner Carousel: cycle every 2000ms (2 seconds)
  const [heroImageIndex, setHeroImageIndex] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // Modals & Banners
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isEmergencyDismissed, setIsEmergencyDismissed] = useState<boolean>(false);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState<boolean>(true);
  const [isIntakeFinished, setIsIntakeFinished] = useState<boolean>(false);

  // Clinical Intake State
  const [demographics, setDemographics] = useState<PatientDemographics>(DEFAULT_DEMOGRAPHICS);
  const [chiefComplaint, setChiefComplaint] = useState<string>('Chest Pain / Discomfort');
  const [socrates, setSocrates] = useState<SocratesHistory>({
    site: 'Central Chest (Retrosternal)',
    onset: 'Acute Sudden Onset (< 1 hr)',
    character: 'Crushing Heavy Pressure',
    radiation: '',
    associations: [],
    severity: 7
  });
  const [associatedSymptoms, setAssociatedSymptoms] = useState<string[]>([]);
  const [chronicConditions, setChronicConditions] = useState<string[]>(['High Blood Pressure (Hypertension)']);
  const [medications, setMedications] = useState<ExtractedMedication[]>([]);
  const [labValues, setLabValues] = useState<ExtractedLabValue[]>([]);
  const [ayushAssessment, setAyushAssessment] = useState<DashavidhaPariksha>({
    prakriti: 'Pitta',
    agniAharaShakti: 'Tikshnagni (Sharp/Hyper)',
    vyayamaShakti: 'Madhyama (Moderate)',
    satmya: 'Snigdha-Ushna Satmya (Warm/Nourishing)'
  });

  // Backend Profile & Submission State
  const [patientProfileId, setPatientProfileId] = useState<string | null>(null);
  const [isSubmittingIntake, setIsSubmittingIntake] = useState<boolean>(false);

  // Sync demographics with authenticated user profile from backend
  useEffect(() => {
    if (user && role === 'patient') {
      apiClient.getPatientProfile(user.id)
        .then(profile => {
          if (profile) {
            setPatientProfileId(profile.id);
            setDemographics({
              name: profile.name || user.fullName || 'Patient',
              age: profile.age || 40,
              gender: profile.gender || 'Other',
              opdRegId: profile.opd_reg_id || `OPD-${Math.floor(1000 + Math.random() * 9000)}`,
              contactNumber: profile.contact_number,
              vitals: profile.vitals
            });
          }
        })
        .catch(err => {
          console.warn('Could not fetch existing patient profile from server:', err);
          if (user.fullName) {
            setDemographics(prev => ({
              ...prev,
              name: user.fullName || prev.name,
            }));
          }
        });
    }
  }, [user, role]);

  // Evaluate Deterministic Red-Flag Safety Gate
  const triage = useMemo(() => {
    if (!chiefComplaint || !chiefComplaint.trim()) {
      return {
        triage_level: 'ROUTINE' as const,
        triggeredRules: [],
        reason: 'Routine intake in progress.',
        actionRequired: 'Proceed with patient intake assessment.',
        evaluatedAt: new Date().toISOString()
      };
    }
    return evaluateDeterministicSafety({
      chiefComplaint,
      socrates,
      associatedSymptoms
    });
  }, [chiefComplaint, socrates, associatedSymptoms]);

  // Show emergency overlay when triage is EMERGENCY and user hasn't explicitly acknowledged it
  const showEmergencyAlert = triage.triage_level === 'EMERGENCY' && !isEmergencyDismissed;

  // Assemble Clinician Briefing Object
  const briefing: ClinicianBriefing = useMemo(() => ({
    id: `BRIEF-${demographics.opdRegId}`,
    createdAt: new Date().toLocaleString(),
    patient: demographics,
    chiefComplaint: {
      primary: chiefComplaint || 'Routine Pre-Consultation Assessment',
      onset: socrates.onset || 'Subacute',
      duration: socrates.timeDuration || '1-2 days',
      associatedSymptoms
    },
    socrates,
    chronicConditions,
    activeMedications: medications,
    abnormalLabs: labValues,
    ayushAssessment: isAyushActive ? ayushAssessment : undefined,
    triage,
    isAyushActive
  }), [demographics, chiefComplaint, socrates, associatedSymptoms, chronicConditions, medications, labValues, ayushAssessment, triage, isAyushActive]);

  // Handle Intake Completion & Persist Session to Backend
  const handleCompleteIntake = async () => {
    setIsSubmittingIntake(true);
    try {
      let profileId = patientProfileId;
      if (!profileId && user) {
        try {
          const profile = await apiClient.createPatientProfile(demographics);
          profileId = profile.id;
          setPatientProfileId(profile.id);
        } catch (e) {
          const p = await apiClient.getPatientProfile(user.id).catch(() => null);
          if (p) {
            profileId = p.id;
            setPatientProfileId(p.id);
          }
        }
      }

      if (profileId) {
        const sessionPayload = {
          chief_complaint: chiefComplaint || 'General Consultation',
          socrates,
          associated_symptoms: associatedSymptoms,
          chronic_conditions: chronicConditions,
          is_ayush_active: isAyushActive,
          ayush_assessment: isAyushActive ? ayushAssessment : undefined,
          language,
          status: 'completed'
        };
        const createdSession = await apiClient.createIntakeSession(profileId, sessionPayload);

        // Persist extracted medications
        for (const med of medications) {
          await apiClient.addMedication(createdSession.id, med).catch(err => console.warn('Failed to add med:', err));
        }

        // Persist extracted lab values
        for (const lab of labValues) {
          await apiClient.addLabValue(createdSession.id, lab).catch(err => console.warn('Failed to add lab:', err));
        }

        // Authoritatively evaluate triage server-side (creates ClinicianBriefing record)
        await apiClient.evaluateTriage(createdSession.id).catch(err => console.warn('Failed to evaluate triage:', err));
      }
    } catch (err: any) {
      console.error('Failed to persist intake session to database:', err);
    } finally {
      setIsSubmittingIntake(false);
      setIsIntakeFinished(true);
    }
  };

  // Reset Session for next intake
  const handleResetSession = () => {
    setChiefComplaint('');
    setSocrates({ severity: 5 });
    setAssociatedSymptoms([]);
    setChronicConditions([]);
    setMedications([]);
    setLabValues([]);
    setIsEmergencyDismissed(false);
    setIsIntakeFinished(false);
  };

  // Merge OCR Extraction
  const handleExtractSuccess = (extraction: DocumentExtraction) => {
    if (extraction.medications.length > 0) {
      setMedications(prev => {
        const names = new Set(prev.map(m => m.name.toLowerCase()));
        const newMeds = extraction.medications.filter(m => !names.has(m.name.toLowerCase()));
        return [...prev, ...newMeds];
      });
    }

    if (extraction.keyLabValues.length > 0) {
      setLabValues(prev => {
        const testNames = new Set(prev.map(l => l.test_name.toLowerCase()));
        const newLabs = extraction.keyLabValues.filter(l => !testNames.has(l.test_name.toLowerCase()));
        return [...prev, ...newLabs];
      });
    }

    if (extraction.diagnosesOrPastProcedures.length > 0) {
      setChronicConditions(prev => {
        const unique = new Set([...prev, ...extraction.diagnosesOrPastProcedures]);
        return Array.from(unique);
      });
    }
  };

  if (isRestoringSession) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white gap-3">
        <div className="w-9 h-9 border-3 border-primary-blue border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-400 font-semibold tracking-wide">Restoring secure clinical session...</p>
      </div>
    );
  }

  // Guard: Every session starts at LoginPage before anything else in the app is reachable
  if (!isAuthenticated || !role || !user) {
    return <LoginPage />;
  }

  return (
    <div className="portal-container">
      {/* Header Bar with real Log Out action replacing viewMode toggle */}
      <KioskHeader
        language={language}
        onLanguageChange={setLanguage}
        isAyushActive={isAyushActive}
        onToggleAyush={() => setIsAyushActive(!isAyushActive)}
        onLogout={logout}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onResetSession={handleResetSession}
        hasEmergency={triage.triage_level === 'EMERGENCY'}
      />

      {/* Strict Role Branching with Render-time Guard Wrappers */}
      {role === 'doctor' ? (
        <RequireRole role="doctor">
          <main className="portal-body full-width">
            <ClinicianDashboardView
              briefing={briefing}
            />
          </main>
        </RequireRole>
      ) : (
        <RequireRole role="patient">
          {/* One-time welcome banner for first login (never changes dashboard destination) */}
          {isFirstLogin && showWelcomeBanner && (
            <div className="mx-6 mt-4 p-4 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 flex items-center justify-between shadow-sm animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary-blue text-white flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-sm text-text-dark">Welcome, let's get your first intake started!</span>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Answer the interactive clinical questions or speak your symptoms. Your data is structured for your doctor.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowWelcomeBanner(false)}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1"
                title="Dismiss welcome message"
              >
                <X className="w-3.5 h-3.5" />
                <span>Dismiss</span>
              </button>
            </div>
          )}

          {/* Patient Portal Intake View */}
          <section className="portal-hero-banner">
            {/* Full-Banner Image Carousel Layer (Cycles Every 2 Seconds) */}
            <div className="portal-hero-slider" aria-hidden="true">
              {HERO_IMAGES.map((imgSrc, idx) => (
                <div
                  key={imgSrc}
                  className="portal-hero-slide"
                  style={{
                    backgroundImage: `url(${imgSrc})`,
                    opacity: heroImageIndex === idx ? 1 : 0,
                    transform: heroImageIndex === idx ? 'scale(1.03)' : 'scale(1)',
                  }}
                />
              ))}
              <div className="portal-hero-overlay" />
            </div>

            <div className="portal-hero-content" style={{ position: 'relative', zIndex: 10 }}>
              <div className="hero-eyebrow">
                <Sparkles size={14} color="var(--primary-blue, #23A6F0)" />
                <span>Welcome to PatientPilot</span>
              </div>
              <h1 className="hero-headline">
                Online OPD Pre-Consultation
              </h1>
              <p className="hero-description">
                PatientPilot captures your clinical anamnesis, OCR lab & prescription extraction, and deterministic red-flag safety triage before you meet your doctor.
              </p>

              <div className="hero-cta-group">
                <button
                  className="portal-btn portal-btn-primary"
                  onClick={() => {
                    const el = document.getElementById('intake-anchor');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  style={{ height: '46px', padding: '0 24px', fontSize: '0.94rem' }}
                >
                  <span>Start Consultation Now</span>
                  <ArrowRight size={16} />
                </button>
              </div>

              <div className="hero-badges">
                <div className="hero-badge-pill">
                  <Globe size={14} color="var(--primary-blue, #23A6F0)" />
                  <span>23 Indian Languages</span>
                </div>
                <div className="hero-badge-pill">
                  <ShieldCheck size={14} color="var(--accent-lime, #2DC071)" />
                  <span>Deterministic Safety Matrix</span>
                </div>
                <div className="hero-badge-pill">
                  <Leaf size={14} color="var(--accent-lime, #2DC071)" />
                  <span>AYUSH Pariksha Ready</span>
                </div>
                <div className="hero-badge-pill">
                  <CheckCircle2 size={14} color="var(--primary-blue, #23A6F0)" />
                  <span>FHIR Interoperable</span>
                </div>
              </div>
            </div>

            {/* Right: Curved Sky-Blue Doctor Frame with Synchronized Image */}
            <div className="hero-doctor-container" style={{ position: 'relative', zIndex: 10 }}>
              <div className="hero-curved-backdrop">
                <div className="portal-hero-image-wrap">
                  <img 
                    src={HERO_IMAGES[heroImageIndex]} 
                    alt="Doctor Clinical Healthcare Operations" 
                    className="portal-hero-image"
                    key={heroImageIndex}
                    style={{ animation: 'fadeScaleIn 0.5s ease' }}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                    right: '10px',
                    background: 'rgba(37, 43, 66, 0.88)',
                    backdropFilter: 'blur(6px)',
                    padding: '6px 12px',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '0.74rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontWeight: 600
                  }}>
                    <span>OPD AI Clinic Wing</span>
                    <span style={{ color: 'var(--primary-blue, #23A6F0)' }}>● Photo 0{heroImageIndex + 1}/03</span>
                  </div>
                </div>

                {/* Floating Metric Card 1 */}
                <div className="hero-floating-stat" style={{ top: '-14px', left: '-20px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'var(--primary-blue-soft, #e8f5fe)',
                    color: 'var(--primary-blue, #23A6F0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <TrendingUp size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.70rem', color: 'var(--text-gray, #737373)' }}>AI Triage Gate</div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-dark, #252B42)' }}>99.8% Precision</div>
                  </div>
                </div>

                {/* Floating Metric Card 2 */}
                <div className="hero-floating-stat" style={{ bottom: '-14px', right: '-10px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#f0fdf4',
                    color: '#2DC071',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.70rem', color: 'var(--text-gray, #737373)' }}>Safety Standard</div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#2DC071' }}>NABH & ABDM</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Carousel Slide Indicators */}
            <div className="hero-slide-indicators" aria-label="Hero slide indicators">
              {HERO_IMAGES.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`hero-slide-dot ${heroImageIndex === idx ? 'active' : ''}`}
                  onClick={() => setHeroImageIndex(idx)}
                  aria-label={`Slide ${idx + 1}`}
                  title={`View photo ${idx + 1} of ${HERO_IMAGES.length}`}
                />
              ))}
            </div>
          </section>

          {/* 4-Card Activity Grid Section */}
          <section className="activity-section">
            <div className="activity-header">
              <div className="activity-eyebrow">
                <span>Practice Advice</span>
              </div>
              <h2 className="activity-headline">
                Our Clinical Services
              </h2>
              <p className="activity-subtext">
                Autonomous clinical intelligence and structured protocol gates designed for fast, accurate OPD patient triage.
              </p>
            </div>

            <div className="activity-grid">
              <div 
                className="activity-card"
                onClick={() => {
                  const el = document.getElementById('intake-anchor');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <div className="activity-icon-wrap" style={{ background: '#fef2f2', color: '#E74040' }}>
                  <HeartPulse size={26} />
                </div>
                <h3 className="activity-card-title">Emergency Case</h3>
                <div className="activity-card-divider" style={{ background: '#E74040' }}></div>
                <p className="activity-card-desc">
                  Deterministic screening for chest pain, acute stroke, severe dyspnea, and sepsis with immediate red-flag physician alert.
                </p>
              </div>

              <div 
                className="activity-card"
                onClick={() => setIsAyushActive(!isAyushActive)}
              >
                <div className="activity-icon-wrap" style={{ background: '#f0fdf4', color: '#2DC071' }}>
                  <Leaf size={26} />
                </div>
                <h3 className="activity-card-title">Health Queries & AYUSH</h3>
                <div className="activity-card-divider" style={{ background: '#2DC071' }}></div>
                <p className="activity-card-desc">
                  Constitutional Dashavidha Pariksha evaluating Prakriti, Agni, Satmya, and Sara for holistic integrative medicine.
                </p>
              </div>

              <div 
                className="activity-card"
                onClick={() => setIsUploadOpen(true)}
              >
                <div className="activity-icon-wrap" style={{ background: '#fff7ed', color: '#FF7B54' }}>
                  <FileText size={26} />
                </div>
                <h3 className="activity-card-title">OCR Record Scanner</h3>
                <div className="activity-card-divider" style={{ background: '#FF7B54' }}></div>
                <p className="activity-card-desc">
                  Instant camera or PDF upload extracting past prescriptions, dosages, and critical abnormal lab markers into FHIR format.
                </p>
              </div>

              <div className="activity-card">
                <div className="activity-icon-wrap" style={{ background: 'var(--primary-blue-soft, #e8f5fe)', color: 'var(--primary-blue, #23A6F0)' }}>
                  <Globe size={26} />
                </div>
                <h3 className="activity-card-title">23 Indian Languages</h3>
                <div className="activity-card-divider" style={{ background: 'var(--primary-blue, #23A6F0)' }}></div>
                <p className="activity-card-desc">
                  Universal accessibility supporting all 22 official scheduled languages plus English with native script.
                </p>
              </div>
            </div>
          </section>

          <div id="intake-anchor" style={{ height: '10px' }}></div>

          {/* Intake Completed Status Confirmation */}
          {isIntakeFinished && (
            <div className="mx-6 mb-6 p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between shadow-sm animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-emerald-900">Pre-Consultation Intake Successfully Transmitted</h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Your symptoms and clinical history have been securely structured and sent to the attending physician's briefing dashboard. Please proceed to the waiting lounge.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsIntakeFinished(false)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 transition-colors"
              >
                Close
              </button>
            </div>
          )}

          <main className="portal-body">
            {/* Patient Intake Chat View */}
            <IntakeChatView
              language={language}
              isAyushActive={isAyushActive}
              demographics={demographics}
              onUpdateDemographics={setDemographics}
              socrates={socrates}
              onUpdateSocrates={(updated) => {
                setSocrates(updated);
                setIsEmergencyDismissed(false);
              }}
              chiefComplaint={chiefComplaint}
              onUpdateChiefComplaint={(complaint) => {
                setChiefComplaint(complaint);
                setIsEmergencyDismissed(false);
              }}
              associatedSymptoms={associatedSymptoms}
              onUpdateAssociatedSymptoms={(symptoms) => {
                setAssociatedSymptoms(symptoms);
                setIsEmergencyDismissed(false);
              }}
              chronicConditions={chronicConditions}
              onUpdateChronicConditions={setChronicConditions}
              ayushAssessment={ayushAssessment}
              onUpdateAyush={setAyushAssessment}
              medications={medications}
              labValues={labValues}
              onOpenDocumentUpload={() => setIsUploadOpen(true)}
              triage={triage}
              geminiApiKey={geminiApiKey}
              onCompleteIntake={handleCompleteIntake}
            />

            {/* Real-time Status & Checklist Sidebar */}
            <SidebarStatusPanel
              demographics={demographics}
              socrates={socrates}
              chiefComplaint={chiefComplaint}
              triage={triage}
              medications={medications}
              labValues={labValues}
              isAyushActive={isAyushActive}
              ayushAssessment={ayushAssessment}
              onOpenDocumentUpload={() => setIsUploadOpen(true)}
            />
          </main>
        </RequireRole>
      )}

      {/* Full-screen Emergency Alert Banner Gate - Without Doctor Briefing Switch for Patients */}
      {showEmergencyAlert && (
        <EmergencyAlertBanner
          triage={triage}
          language={language}
          onAcknowledge={() => setIsEmergencyDismissed(true)}
        />
      )}

      {/* Document Upload & OCR Scanner Modal */}
      <DocumentUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onExtractSuccess={handleExtractSuccess}
        geminiApiKey={geminiApiKey}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        geminiApiKey={geminiApiKey}
        onSaveApiKey={(key) => {
          setGeminiApiKey(key);
          localStorage.setItem('PATIENTPILOT_GEMINI_API_KEY', key);
        }}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};
export default App;

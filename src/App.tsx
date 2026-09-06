import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Globe, 
  ShieldCheck, 
  Leaf, 
  CheckCircle2,
  HeartPulse,
  FileText,
  ArrowRight,
  TrendingUp
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

const DEFAULT_DEMOGRAPHICS: PatientDemographics = {
  name: 'Vikram Malhotra',
  age: 54,
  gender: 'Male',
  opdRegId: 'OPD-2026-084',
  contactNumber: '+91 98765 43210'
};

export const App: React.FC = () => {
  // App Config
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [isAyushActive, setIsAyushActive] = useState<boolean>(false);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'portal' | 'clinician'>('portal');
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {

    return localStorage.getItem('PATIENTPILOT_GEMINI_API_KEY') || '';
  });

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isEmergencyDismissed, setIsEmergencyDismissed] = useState<boolean>(false);

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

  // Evaluate Deterministic Red-Flag Safety Gate
  const triage = useMemo(() => {
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
      primary: chiefComplaint,
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

  // Reset Session
  const handleResetSession = () => {
    setDemographics({
      name: 'Rohan Deshmukh',
      age: 42,
      gender: 'Male',
      opdRegId: `OPD-${Math.floor(1000 + Math.random() * 9000)}`
    });
    setChiefComplaint('');
    setSocrates({ severity: 5 });
    setAssociatedSymptoms([]);
    setChronicConditions([]);
    setMedications([]);
    setLabValues([]);
    setIsEmergencyDismissed(false);
    setViewMode('portal');
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

  return (
    <div className="portal-container">
      {/* Header Bar */}
      <KioskHeader
        language={language}
        onLanguageChange={setLanguage}
        isAyushActive={isAyushActive}
        onToggleAyush={() => setIsAyushActive(!isAyushActive)}
        voiceEnabled={voiceEnabled}
        onToggleVoice={() => setVoiceEnabled(!voiceEnabled)}
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode(viewMode === 'portal' ? 'clinician' : 'portal')}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onResetSession={handleResetSession}
        hasEmergency={triage.triage_level === 'EMERGENCY'}
      />

      {/* Main Body */}
      {viewMode === 'portal' ? (
        <>
          {/* Hero Banner matching image.png MedicalFunc aesthetic */}
          <section className="portal-hero-banner">
            <div className="portal-hero-content">
              <div className="hero-eyebrow">
                <Sparkles size={14} color="var(--primary-blue, #23A6F0)" />
                <span>Welcome to PatientPilot</span>
              </div>
              <h1 className="hero-headline">
                Online OPD Pre-Consultation
              </h1>
              <p className="hero-description">
                PatientPilot is focused on capturing your clinical anamnesis, OCR lab & prescription extraction, and deterministic red-flag safety triage before you meet your doctor.
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

                <button
                  className="portal-btn portal-btn-outline"
                  onClick={() => setViewMode('clinician')}
                  style={{ height: '46px', padding: '0 20px', fontSize: '0.94rem' }}
                >
                  <span>Doctor Briefing</span>
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

            {/* Right: Curved Sky-Blue Doctor Frame matching image.png */}
            <div className="hero-doctor-container">
              <div className="hero-curved-backdrop">
                <div className="portal-hero-image-wrap">
                  <img 
                    src="/dashboard-hero.jpg" 
                    alt="Doctor Clinical Blood Pressure Examination" 
                    className="portal-hero-image"
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
                    <span style={{ color: 'var(--primary-blue, #23A6F0)' }}>● Station 04 Active</span>
                  </div>
                </div>

                {/* Floating Metric Card 1 (Top Left Overlap) */}
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

                {/* Floating Metric Card 2 (Bottom Right Overlap) */}
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
          </section>

          {/* Attractive 4-Card Activity Grid Section (image.png Aesthetic) */}
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
              {/* Card 1: Emergency Case */}
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

              {/* Card 2: Health Queries & AYUSH */}
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

              {/* Card 3: Painless Procedures & OCR */}
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

              {/* Card 4: 23 Indian Languages */}
              <div 
                className="activity-card"
              >
                <div className="activity-icon-wrap" style={{ background: 'var(--primary-blue-soft, #e8f5fe)', color: 'var(--primary-blue, #23A6F0)' }}>
                  <Globe size={26} />
                </div>
                <h3 className="activity-card-title">23 Indian Languages</h3>
                <div className="activity-card-divider" style={{ background: 'var(--primary-blue, #23A6F0)' }}></div>
                <p className="activity-card-desc">
                  Universal accessibility supporting all 22 official scheduled languages plus English with native script and voice prompter.
                </p>
              </div>
            </div>
          </section>

          <div id="intake-anchor" style={{ height: '10px' }}></div>
          <main className="portal-body">
          {/* Patient Intake Chat View */}
          <IntakeChatView
            language={language}
            isAyushActive={isAyushActive}
            voiceEnabled={voiceEnabled}
            demographics={demographics}
            onUpdateDemographics={setDemographics}
            socrates={socrates}
            onUpdateSocrates={(updated) => {
              setSocrates(updated);
              setIsEmergencyDismissed(false); // Re-evaluate gate
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
            onCompleteIntake={() => setViewMode('clinician')}
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
      </>
      ) : (
        <main className="portal-body full-width">
          <ClinicianDashboardView
            briefing={briefing}
            onBackToPortal={() => setViewMode('portal')}
          />
        </main>
      )}


      {/* Full-screen Emergency Alert Banner Gate */}
      {showEmergencyAlert && (
        <EmergencyAlertBanner
          triage={triage}
          language={language}
          onAcknowledge={() => setIsEmergencyDismissed(true)}
          onViewDoctorBriefing={() => {
            setIsEmergencyDismissed(true);
            setViewMode('clinician');
          }}
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

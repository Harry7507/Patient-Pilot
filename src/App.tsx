import React, { useState, useMemo } from 'react';
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
  const [viewMode, setViewMode] = useState<'kiosk' | 'clinician'>('kiosk');
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
    setViewMode('kiosk');
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
    <div className="kiosk-container">
      {/* Header Bar */}
      <KioskHeader
        language={language}
        onLanguageChange={setLanguage}
        isAyushActive={isAyushActive}
        onToggleAyush={() => setIsAyushActive(!isAyushActive)}
        voiceEnabled={voiceEnabled}
        onToggleVoice={() => setVoiceEnabled(!voiceEnabled)}
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode(viewMode === 'kiosk' ? 'clinician' : 'kiosk')}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onResetSession={handleResetSession}
        hasEmergency={triage.triage_level === 'EMERGENCY'}
      />

      {/* Main Body */}
      {viewMode === 'kiosk' ? (
        <main className="kiosk-body">
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
      ) : (
        <main className="kiosk-body full-width">
          <ClinicianDashboardView
            briefing={briefing}
            onBackToKiosk={() => setViewMode('kiosk')}
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

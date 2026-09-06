import React, { useState } from 'react';
import { 
  Mic, 
  MicOff, 
  Send, 
  FileUp, 
  HeartPulse, 
  Wind, 
  Thermometer, 
  Brain, 
  Activity, 
  ZapOff, 
  UserCheck, 
  PlusCircle,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  LanguageCode, 
  PatientDemographics, 
  SocratesHistory, 
  ExtractedMedication, 
  ExtractedLabValue,
  DashavidhaPariksha,
  TriageResult
} from '../types/clinical';
import { 
  COMMON_COMPLAINTS, 
  CHRONIC_CONDITIONS_LIST, 
  getAdaptiveSocratesSteps, 
  getIntakeStepPrompt,
  getIntakeStepSubtitle,
  IntakeStep 
} from '../services/intakeEngine';
import { DASHAVIDHA_QUESTIONS, getAyushQuestion, getAyushOptionLabel } from '../services/ayushEngine';
import { getLocalizedText, KIOSK_TRANSLATIONS } from '../services/localizationService';
import { speechService } from '../services/speechService';
import confetti from 'canvas-confetti';


interface IntakeChatViewProps {
  language: LanguageCode;
  isAyushActive: boolean;
  voiceEnabled?: boolean;
  demographics: PatientDemographics;
  onUpdateDemographics: (demographics: PatientDemographics) => void;
  socrates: SocratesHistory;
  onUpdateSocrates: (socrates: SocratesHistory) => void;
  chiefComplaint: string;
  onUpdateChiefComplaint: (complaint: string) => void;
  associatedSymptoms: string[];
  onUpdateAssociatedSymptoms: (symptoms: string[]) => void;
  chronicConditions: string[];
  onUpdateChronicConditions: (conditions: string[]) => void;
  ayushAssessment: DashavidhaPariksha;
  onUpdateAyush: (ayush: DashavidhaPariksha) => void;
  medications: ExtractedMedication[];
  labValues: ExtractedLabValue[];
  onOpenDocumentUpload: () => void;
  triage: TriageResult;
  onCompleteIntake: () => void;
}

export const IntakeChatView: React.FC<IntakeChatViewProps> = ({
  language,
  isAyushActive,
  voiceEnabled,
  demographics,
  onUpdateDemographics,
  socrates,
  onUpdateSocrates,
  chiefComplaint,
  onUpdateChiefComplaint,
  associatedSymptoms,
  onUpdateAssociatedSymptoms,
  chronicConditions,
  onUpdateChronicConditions,
  ayushAssessment,
  onUpdateAyush,
  medications,
  labValues,
  onOpenDocumentUpload,
  triage,
  onCompleteIntake
}) => {
  // Phase management
  // 'demographics' -> 'chief_complaint' -> 'socrates' -> 'chronic' -> 'ayush' (if active) -> 'review'
  const [phase, setPhase] = useState<'demographics' | 'chief_complaint' | 'socrates' | 'chronic' | 'ayush' | 'review'>('demographics');
  const [socratesStepIndex, setSocratesStepIndex] = useState<number>(0);
  const [ayushStepIndex, setAyushStepIndex] = useState<number>(0);

  // User input states
  const [textInput, setTextInput] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [severityValue, setSeverityValue] = useState<number>(socrates.severity || 5);

  const adaptiveSteps = getAdaptiveSocratesSteps(chiefComplaint);

  // Voice recognition handler
  const handleToggleVoiceInput = () => {
    if (isListening) {
      speechService.stopListening();
      setIsListening(false);
    } else {
      setIsListening(true);
      speechService.startListening(
        language,
        (transcript) => {
          setIsListening(false);
          setTextInput(transcript);
        },
        (error) => {
          setIsListening(false);
          console.warn('Voice recognition message:', error);
        },
        () => {
          setIsListening(false);
        }
      );
    }
  };

  // Select complaint
  const handleSelectComplaint = (complaintText: string) => {
    onUpdateChiefComplaint(complaintText);
    setPhase('socrates');
    setSocratesStepIndex(0);
  };

  // Answer Socrates Step
  const handleAnswerSocrates = (value: string, field?: keyof SocratesHistory) => {
    if (field) {
      if (field === 'associations') {
        const current = [...associatedSymptoms];
        const updated = current.includes(value) ? current.filter(x => x !== value) : [...current, value];
        onUpdateAssociatedSymptoms(updated);
        onUpdateSocrates({ ...socrates, associations: updated });
        return;
      } else if (field === 'severity') {
        onUpdateSocrates({ ...socrates, severity: parseInt(value, 10) || 5 });
      } else {
        onUpdateSocrates({ ...socrates, [field]: value });
      }
    }

    // Advance to next SOCRATES step or chronic phase
    if (socratesStepIndex < adaptiveSteps.length - 1) {
      setSocratesStepIndex(socratesStepIndex + 1);
    } else {
      setPhase('chronic');
    }
  };

  // Submit custom text
  const handleSubmitText = () => {
    if (!textInput.trim()) return;

    if (phase === 'chief_complaint') {
      handleSelectComplaint(textInput);
    } else if (phase === 'socrates') {
      const step = adaptiveSteps[socratesStepIndex];
      handleAnswerSocrates(textInput, step?.socratesField);
    } else if (phase === 'chronic') {
      onUpdateChronicConditions([...chronicConditions, textInput]);
    }
    setTextInput('');
  };

  // Toggle chronic condition
  const handleToggleChronic = (condId: string, label: string) => {
    if (condId === 'none') {
      onUpdateChronicConditions(['None']);
      return;
    }
    const current = chronicConditions.filter(c => c !== 'None');
    if (current.includes(label)) {
      onUpdateChronicConditions(current.filter(c => c !== label));
    } else {
      onUpdateChronicConditions([...current, label]);
    }
  };

  // AYUSH answer
  const handleAnswerAyush = (fieldId: keyof DashavidhaPariksha, value: string) => {
    onUpdateAyush({
      ...ayushAssessment,
      [fieldId]: value
    });

    if (ayushStepIndex < DASHAVIDHA_QUESTIONS.length - 1) {
      setAyushStepIndex(ayushStepIndex + 1);
    } else {
      setPhase('review');
    }
  };

  // Complete Intake Trigger
  const handleFinish = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
    onCompleteIntake();
  };

  return (
    <div className="glass-card" style={{ height: '100%' }}>
      <div className="intake-question-card">
        {/* Progress header bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div className="question-badge">
            <Sparkles size={14} />
            <span>
              {phase === 'demographics' && 'Step 1: Patient Identity'}
              {phase === 'chief_complaint' && 'Step 2: Chief Complaint'}
              {phase === 'socrates' && `Step 3: Clinical SOCRATES (${socratesStepIndex + 1}/${adaptiveSteps.length})`}
              {phase === 'chronic' && 'Step 4: Past Medical History'}
              {phase === 'ayush' && `Step 5: AYUSH Dashavidha Pariksha (${ayushStepIndex + 1}/${DASHAVIDHA_QUESTIONS.length})`}
              {phase === 'review' && 'Intake Complete: Ready for Clinician'}
            </span>
          </div>

          <button 
            onClick={onOpenDocumentUpload}
            className="kiosk-btn"
            style={{ 
              height: '38px', 
              fontSize: '0.82rem', 
              borderColor: 'rgba(13, 148, 136, 0.25)',
              background: '#f0fdfa',
              color: '#044e54',
              fontWeight: 600
            }}
          >
            <FileUp size={16} color="#0d9488" />
            <span>Upload Records ({medications.length} meds, {labValues.length} labs)</span>
          </button>
        </div>

        {/* ================= PHASE 1: DEMOGRAPHICS ================= */}
        {phase === 'demographics' && (
          <div>
            <h2 className="question-title">
              {getLocalizedText(KIOSK_TRANSLATIONS.demographicsTitle, language)}
            </h2>
            <p className="question-subtitle">
              {getLocalizedText(KIOSK_TRANSLATIONS.demographicsSubtitle, language)}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Patient Full Name
                </label>
                <input 
                  type="text" 
                  value={demographics.name}
                  onChange={(e) => onUpdateDemographics({ ...demographics, name: e.target.value })}
                  className="kiosk-text-input" 
                  style={{ width: '100%', height: '52px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Age (Years)
                </label>
                <input 
                  type="number" 
                  value={demographics.age}
                  onChange={(e) => onUpdateDemographics({ ...demographics, age: e.target.value })}
                  className="kiosk-text-input" 
                  style={{ width: '100%', height: '52px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Gender
                </label>
                <select 
                  value={demographics.gender}
                  onChange={(e) => onUpdateDemographics({ ...demographics, gender: e.target.value as any })}
                  className="kiosk-text-input"
                  style={{ width: '100%', height: '52px', background: 'var(--bg-surface-elevated)' }}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  OPD Registration ID / Token
                </label>
                <input 
                  type="text" 
                  value={demographics.opdRegId}
                  onChange={(e) => onUpdateDemographics({ ...demographics, opdRegId: e.target.value })}
                  className="kiosk-text-input" 
                  style={{ width: '100%', height: '52px', fontFamily: 'var(--font-mono)' }}
                />
              </div>
            </div>

            <button 
              className="kiosk-btn kiosk-btn-primary"
              style={{ minWidth: '220px', height: '56px', fontSize: '1.05rem', borderRadius: '16px' }}
              onClick={() => setPhase('chief_complaint')}
            >
              <span>{getLocalizedText(KIOSK_TRANSLATIONS.beginIntake, language)}</span>
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* ================= PHASE 2: CHIEF COMPLAINT ================= */}
        {phase === 'chief_complaint' && (
          <div>
            <h2 className="question-title">
              {getLocalizedText(KIOSK_TRANSLATIONS.chiefComplaintTitle, language)}
            </h2>
            <p className="question-subtitle">
              {getLocalizedText(KIOSK_TRANSLATIONS.chiefComplaintSubtitle, language)}
            </p>

            <div className="options-grid">
              {COMMON_COMPLAINTS.map((c) => {
                const labelText = getLocalizedText(c.label, language, c.label.en);
                return (
                  <button
                    key={c.id}
                    onClick={() => handleSelectComplaint(labelText)}
                    className={`touch-option-btn ${c.emergencyPotential ? 'red-flag-chip' : ''}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {c.id === 'chest_pain' && <HeartPulse size={24} color="#ef4444" />}
                      {c.id === 'breathlessness' && <Wind size={24} color="#38bdf8" />}
                      {c.id === 'fever' && <Thermometer size={24} color="#f59e0b" />}
                      {c.id === 'headache' && <Brain size={24} color="#a855f7" />}
                      {c.id === 'abdominal_pain' && <Activity size={24} color="#ec4899" />}
                      {c.id === 'weakness_dizziness' && <ZapOff size={24} color="#eab308" />}
                      {c.id === 'cough_cold' && <UserCheck size={24} color="#10b981" />}
                      {c.id === 'other' && <PlusCircle size={24} color="#60a5fa" />}
                      <span>{labelText}</span>
                    </div>
                    <ChevronRight size={18} color="var(--text-muted)" />
                  </button>
                );
              })}
            </div>
          </div>
        )}


        {/* ================= PHASE 3: ADAPTIVE SOCRATES ================= */}
        {phase === 'socrates' && adaptiveSteps[socratesStepIndex] && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: '#f472b6', fontWeight: 600 }}>
                Complaint: {chiefComplaint}
              </span>
            </div>

            <h2 className="question-title">
              {getIntakeStepPrompt(adaptiveSteps[socratesStepIndex], language)}
            </h2>
            {adaptiveSteps[socratesStepIndex].subtitle && (
              <p className="question-subtitle">
                {getIntakeStepSubtitle(adaptiveSteps[socratesStepIndex], language)}
              </p>
            )}

            {/* Severity Slider View */}
            {adaptiveSteps[socratesStepIndex].inputType === 'slider' ? (
              <div style={{ padding: '16px 0', maxWidth: '600px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>Severity Score:</span>
                  <span style={{ 
                    fontSize: '2rem', 
                    fontWeight: 800, 
                    fontFamily: 'var(--font-mono)',
                    color: severityValue >= 8 ? '#ef4444' : severityValue >= 5 ? '#f59e0b' : '#38bdf8'
                  }}>
                    {severityValue} / 10
                  </span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  value={severityValue}
                  onChange={(e) => setSeverityValue(parseInt(e.target.value, 10))}
                  className="severity-slider"
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span>1 (Mild)</span>
                  <span>5 (Moderate)</span>
                  <span>10 (Worst Possible)</span>
                </div>

                <div style={{ marginTop: '24px' }}>
                  <button
                    className="kiosk-btn kiosk-btn-primary"
                    style={{ height: '52px', padding: '0 28px', fontSize: '1rem', borderRadius: '14px' }}
                    onClick={() => handleAnswerSocrates(severityValue.toString(), 'severity')}
                  >
                    Confirm Severity ({severityValue}/10)
                  </button>
                </div>
              </div>
            ) : adaptiveSteps[socratesStepIndex].inputType === 'multi-chip' ? (
              <div>
                <div className="options-grid">
                  {adaptiveSteps[socratesStepIndex].options?.map((opt, i) => {
                    const isSelected = associatedSymptoms.includes(opt.value);
                    const optLabel = getLocalizedText(opt.label, language, opt.label.en);
                    return (
                      <button
                        key={i}
                        onClick={() => handleAnswerSocrates(opt.value, 'associations')}
                        className={`touch-option-btn ${isSelected ? 'selected' : ''} ${opt.isRedFlagTrigger ? 'red-flag-chip' : ''}`}
                      >
                        <span>{optLabel}</span>
                        {isSelected ? <CheckCircle2 size={20} color="#f472b6" /> : <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #475569' }} />}
                      </button>
                    );
                  })}
                </div>
                <button
                  className="kiosk-btn kiosk-btn-primary"
                  style={{ height: '52px', padding: '0 28px', fontSize: '1rem', borderRadius: '14px', marginTop: '10px' }}
                  onClick={() => {
                    if (socratesStepIndex < adaptiveSteps.length - 1) {
                      setSocratesStepIndex(socratesStepIndex + 1);
                    } else {
                      setPhase('chronic');
                    }
                  }}
                >
                  Continue Next <ChevronRight size={18} />
                </button>
              </div>
            ) : (
              <div className="options-grid">
                {adaptiveSteps[socratesStepIndex].options?.map((opt, i) => {
                  const optLabel = getLocalizedText(opt.label, language, opt.label.en);
                  return (
                    <button
                      key={i}
                      onClick={() => handleAnswerSocrates(opt.value, adaptiveSteps[socratesStepIndex].socratesField)}
                      className={`touch-option-btn ${opt.isRedFlagTrigger ? 'red-flag-chip' : ''}`}
                    >
                      <span>{optLabel}</span>
                      <ChevronRight size={18} color="var(--text-muted)" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= PHASE 4: CHRONIC CONDITIONS ================= */}
        {phase === 'chronic' && (
          <div>
            <h2 className="question-title">
              {getLocalizedText(KIOSK_TRANSLATIONS.chronicTitle, language)}
            </h2>
            <p className="question-subtitle">
              {getLocalizedText(KIOSK_TRANSLATIONS.chronicSubtitle, language)}
            </p>

            <div className="options-grid">
              {CHRONIC_CONDITIONS_LIST.map((cond) => {
                const isSelected = chronicConditions.includes(cond.label.en);
                const condLabel = getLocalizedText(cond.label, language, cond.label.en);
                return (
                  <button
                    key={cond.id}
                    onClick={() => handleToggleChronic(cond.id, cond.label.en)}
                    className={`touch-option-btn ${isSelected ? 'selected' : ''}`}
                  >
                    <span>{condLabel}</span>
                    {isSelected ? <CheckCircle2 size={20} color="#f472b6" /> : <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #475569' }} />}
                  </button>
                );
              })}
            </div>

            <button
              className="kiosk-btn kiosk-btn-primary"
              style={{ height: '54px', padding: '0 32px', fontSize: '1.05rem', borderRadius: '16px', marginTop: '14px' }}
              onClick={() => {
                if (isAyushActive) {
                  setPhase('ayush');
                  setAyushStepIndex(0);
                } else {
                  setPhase('review');
                }
              }}
            >
              <span>{isAyushActive ? 'Continue to AYUSH Assessment' : 'Review & Finalize Intake'}</span>
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* ================= PHASE 5: AYUSH DASHAVIDHA PARIKSHA ================= */}
        {phase === 'ayush' && DASHAVIDHA_QUESTIONS[ayushStepIndex] && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#34d399', fontSize: '0.85rem', fontWeight: 600 }}>
              <Sparkles size={16} />
              <span>AYUSH Holistic Intake: {DASHAVIDHA_QUESTIONS[ayushStepIndex].sanskritTerm}</span>
            </div>

            <h2 className="question-title">
              {getAyushQuestion(DASHAVIDHA_QUESTIONS[ayushStepIndex], language)}
            </h2>
            <p className="question-subtitle">
              Evaluating individual constitution for Ayurvedic pre-consultation.
            </p>

            <div className="options-grid">
              {DASHAVIDHA_QUESTIONS[ayushStepIndex].options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswerAyush(DASHAVIDHA_QUESTIONS[ayushStepIndex].id, opt.value)}
                  className="touch-option-btn"
                  style={{ borderColor: 'rgba(5, 150, 105, 0.3)' }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{getAyushOptionLabel(opt, language)}</div>
                    <div style={{ fontSize: '0.78rem', color: '#6ee7b7', marginTop: '3px' }}>{opt.clinicalTag}</div>
                  </div>
                  <ChevronRight size={18} color="#34d399" />
                </button>
              ))}
            </div>
          </div>
        )}


        {/* ================= PHASE 6: REVIEW & READY ================= */}
        {phase === 'review' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ 
              width: '74px', 
              height: '74px', 
              borderRadius: '50%', 
              background: 'rgba(16, 185, 129, 0.15)', 
              border: '2px solid #10b981', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#10b981',
              margin: '0 auto 16px'
            }}>
              <CheckCircle2 size={42} />
            </div>

            <h2 className="question-title">
              {language === 'hi' 
                ? 'प्रारंभिक जांच पूर्ण हुई' 
                : language === 'bn' 
                ? 'প্রাথমিক মূল্যায়ন সম্পন্ন হয়েছে' 
                : language === 'te'
                ? 'ప్రాథమిక విచారణ పూర్తయింది'
                : language === 'ta'
                ? 'ஆரம்ப பரிசோதனை முடிந்தது'
                : language === 'mr'
                ? 'प्राथमिक तपासणी पूर्ण झाली'
                : 'Pre-Consultation Intake Completed'}
            </h2>
            <p className="question-subtitle" style={{ maxWidth: '600px', margin: '0 auto 28px' }}>
              {language === 'hi'
                ? 'आपकी जानकारी सुरक्षित रूप से संकलित कर ली गई है। आपका विवरण डॉक्टर के पास भेज दिया गया है।'
                : language === 'bn'
                ? 'আপনার তথ্য নিরাপদে রেকর্ড করা হয়েছে। চিকিৎসকের জন্য ব্রিফিং তৈরি করা হয়েছে।'
                : language === 'te'
                ? 'మీ ఆరోగ్య వివరాలు భద్రపరచబడ్డాయి మరియు వైద్యునికి పంపబడ్డాయి.'
                : language === 'ta'
                ? 'உங்கள் தகவல்கள் பாதுகாப்பாக பதிவு செய்யப்பட்டு மருத்துவரிடம் அனுப்பப்பட்டுள்ளன.'
                : language === 'mr'
                ? 'तुमची माहिती सुरक्षितपणे नोंदवली गेली आहे आणि डॉक्टरांकडे पाठवली आहे.'
                : 'Your symptoms, medications, and clinical history have been structured for the attending physician.'}
            </p>


            <div style={{ 
              background: 'var(--bg-surface-elevated)', 
              borderRadius: '16px', 
              padding: '20px', 
              maxWidth: '650px', 
              margin: '0 auto 28px',
              textAlign: 'left',
              border: '1px solid var(--border-glass)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Chief Complaint:</span>
                <span style={{ fontWeight: 700 }}>{chiefComplaint}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Triage Status:</span>
                <span style={{ fontWeight: 800, color: triage.triage_level === 'EMERGENCY' ? '#f87171' : triage.triage_level === 'HIGH_PRIORITY' ? '#fbbf24' : '#34d399' }}>
                  {triage.triage_level}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Reconciled Medications:</span>
                <span>{medications.length} active drugs detected</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>AYUSH Assessment:</span>
                <span>{isAyushActive ? 'Dashavidha Pariksha Recorded' : 'Standard Allopathic Mode'}</span>
              </div>
            </div>

            <button
              className="kiosk-btn kiosk-btn-primary"
              style={{ height: '58px', padding: '0 36px', fontSize: '1.15rem', borderRadius: '18px' }}
              onClick={handleFinish}
            >
              <span>Submit Pre-Consultation to Doctor</span>
              <ChevronRight size={22} />
            </button>
          </div>
        )}

        {/* Voice and Text Input Bar at Bottom */}
        <div className="kiosk-input-bar">
          <button 
            className={`kiosk-mic-btn ${isListening ? 'listening' : ''}`}
            onClick={handleToggleVoiceInput}
            title={isListening ? 'Tap to Stop Listening' : 'Tap and Speak Your Answer'}
          >
            {isListening ? <MicOff size={26} /> : <Mic size={26} />}
          </button>

          <input 
            type="text" 
            placeholder={
              isListening 
                ? 'Listening to your voice...' 
                : language === 'hi' 
                ? 'अपनी आवाज से बोलें या यहां टाइप करें...' 
                : language === 'bn' 
                ? 'মুখে বলুন অথবা এখানে লিখুন...' 
                : language === 'te'
                ? 'మీ స్వరంతో మాట్లాడండి లేదా ఇక్కడ టైప్ చేయండి...'
                : language === 'ta'
                ? 'உங்கள் குரலில் பேசவும் அல்லது இங்கே தட்டச்சு செய்யவும்...'
                : language === 'mr'
                ? 'आवाजाने बोला किंवा येथे टाइप करा...'
                : language === 'gu'
                ? 'તમારા અવાજે બોલો અથવા અહીં લખો...'
                : 'Speak into the mic or type any specific symptom/answer...'
            }

            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitText(); }}
            className="kiosk-text-input"
          />

          <button 
            className="kiosk-btn kiosk-btn-primary"
            style={{ width: '58px', height: '58px', padding: 0, justifyContent: 'center', borderRadius: '18px' }}
            onClick={handleSubmitText}
          >
            <Send size={22} />
          </button>
        </div>
      </div>
    </div>
  );
};

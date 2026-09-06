import React, { useState, useEffect } from 'react';
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
  AlertCircle,
  Loader2,
  Volume2,
  User,
  Calendar,
  Users
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
import { analyzePatientInputWithAI } from '../services/aiIntakeService';
import confetti from 'canvas-confetti';

export interface ChatMessage {
  id: string;
  sender: 'patient' | 'assistant';
  text: string;
  localizedText?: string;
  timestamp: string;
  isVoice?: boolean;
  extractedEntities?: {
    complaint?: string;
    socratesDelta?: Partial<SocratesHistory>;
    symptoms?: string[];
    conditions?: string[];
    demographics?: Partial<PatientDemographics>;
    isEmergency?: boolean;
    emergencyReason?: string;
  };
  suggestedOptions?: string[];
}

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
  geminiApiKey?: string;
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
  geminiApiKey,
  onCompleteIntake
}) => {
  // Phase management
  // 'demographics' -> 'chief_complaint' -> 'socrates' -> 'chronic' -> 'ayush' (if active) -> 'review'
  const [phase, setPhase] = useState<'demographics' | 'chief_complaint' | 'socrates' | 'chronic' | 'ayush' | 'review'>('demographics');
  const [socratesStepIndex, setSocratesStepIndex] = useState<number>(0);
  const [ayushStepIndex, setAyushStepIndex] = useState<number>(0);

  // User input & AI states
  const [textInput, setTextInput] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isAIThinking, setIsAIThinking] = useState<boolean>(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [severityValue, setSeverityValue] = useState<number>(socrates.severity || 5);

  const adaptiveSteps = getAdaptiveSocratesSteps(chiefComplaint);

  // Initialize initial clinical AI greeting
  useEffect(() => {
    if (chatMessages.length === 0) {
      const initialGreeting: ChatMessage = {
        id: 'init_welcome',
        sender: 'assistant',
        text: 'Welcome to PatientPilot OPD Intake. You can speak into the microphone or type any symptom, discomfort, or question in your own words. How are you feeling today?',
        localizedText: language === 'hi' 
          ? 'पेशेंटपायलट ओपीडी में आपका स्वागत है। आप माइक्रोफ़ोन से बोल सकते हैं या अपने लक्षण यहां टाइप कर सकते हैं। आज आप कैसा महसूस कर रहे हैं?'
          : undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedOptions: ['Severe Chest Pain', 'Shortness of Breath', 'High Fever & Chills', 'Severe Headache']
      };
      setChatMessages([initialGreeting]);
    }
  }, [language]);

  // Core AI reasoning dispatcher for patient voice & text inputs
  const handleProcessInputWithAI = async (inputStr: string, isVoice = false) => {
    const trimmed = inputStr.trim();
    if (!trimmed || isAIThinking) return;

    // 1. Add patient message to feed
    const patientMsg: ChatMessage = {
      id: `patient_${Date.now()}`,
      sender: 'patient',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isVoice: isVoice
    };

    setChatMessages(prev => [...prev, patientMsg]);
    setTextInput('');
    setIsAIThinking(true);
    setVoiceNotice(null);

    try {
      const aiResult = await analyzePatientInputWithAI({
        userMessage: trimmed,
        language: language,
        currentPhase: phase,
        currentComplaint: chiefComplaint,
        currentSocrates: socrates,
        currentAssociatedSymptoms: associatedSymptoms,
        currentChronicConditions: chronicConditions,
        currentDemographics: demographics,
        geminiApiKey: geminiApiKey
      });

      // 2. Synchronize clinical state
      if (aiResult.extractedComplaint && aiResult.extractedComplaint !== chiefComplaint) {
        onUpdateChiefComplaint(aiResult.extractedComplaint);
      }

      if (aiResult.extractedSocratesDelta && Object.keys(aiResult.extractedSocratesDelta).length > 0) {
        onUpdateSocrates({
          ...socrates,
          ...aiResult.extractedSocratesDelta
        });
      }

      if (aiResult.extractedSymptoms && aiResult.extractedSymptoms.length > 0) {
        const merged = Array.from(new Set([...associatedSymptoms, ...aiResult.extractedSymptoms]));
        onUpdateAssociatedSymptoms(merged);
      }

      if (aiResult.extractedConditions && aiResult.extractedConditions.length > 0) {
        const mergedCond = Array.from(new Set([...chronicConditions, ...aiResult.extractedConditions]));
        onUpdateChronicConditions(mergedCond);
      }

      if (aiResult.extractedDemographics) {
        onUpdateDemographics({
          ...demographics,
          ...aiResult.extractedDemographics
        });
      }

      // 3. Add AI response to feed
      const assistantMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'assistant',
        text: aiResult.agentMessage,
        localizedText: aiResult.localizedMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        extractedEntities: {
          complaint: aiResult.extractedComplaint,
          socratesDelta: aiResult.extractedSocratesDelta,
          symptoms: aiResult.extractedSymptoms,
          conditions: aiResult.extractedConditions,
          demographics: aiResult.extractedDemographics,
          isEmergency: aiResult.isEmergency,
          emergencyReason: aiResult.emergencyReason
        },
        suggestedOptions: aiResult.suggestedOptions
      };

      setChatMessages(prev => [...prev, assistantMsg]);

      // 4. Progress phase smoothly if complaint was identified
      if (phase === 'demographics' && (aiResult.extractedComplaint || Object.keys(aiResult.extractedSocratesDelta).length > 0)) {
        setPhase('socrates');
      } else if (phase === 'chief_complaint' && (aiResult.extractedComplaint || Object.keys(aiResult.extractedSocratesDelta).length > 0)) {
        setPhase('socrates');
      }
    } catch (err) {
      console.error('Error processing patient AI input:', err);
    } finally {
      setIsAIThinking(false);
    }
  };

  // Voice recognition handler
  const handleToggleVoiceInput = () => {
    if (isListening) {
      speechService.stopListening();
      setIsListening(false);
      return;
    }

    setVoiceNotice(null);
    setIsListening(true);

    const started = speechService.startListening(
      language,
      (transcript) => {
        setIsListening(false);
        setTextInput(transcript);
        // Automatically process voice transcript through clinical AI!
        handleProcessInputWithAI(transcript, true);
      },
      (error) => {
        setIsListening(false);
        setVoiceNotice(error);
      },
      () => {
        setIsListening(false);
      },
      (interim) => {
        // Show live interim text in input bar
        setTextInput(interim);
      }
    );

    if (!started) {
      setIsListening(false);
    }
  };

  // Submit custom text
  const handleSubmitText = () => {
    if (!textInput.trim() || isAIThinking) return;
    handleProcessInputWithAI(textInput, false);
  };

  // Select complaint via buttons
  const handleSelectComplaint = (complaintText: string) => {
    onUpdateChiefComplaint(complaintText);
    setPhase('socrates');
    setSocratesStepIndex(0);
  };

  // Answer Socrates Step via buttons
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

  // Toggle chronic condition via buttons
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

  // AYUSH answer via buttons
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
    <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="intake-question-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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
            type="button"
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

        {/* Real-time AI Conversational Interaction Feed */}
        {chatMessages.length > 0 && (
          <div className="ai-intake-feed">
            {chatMessages.map((msg) => (
              <div 
                key={msg.id} 
                className={msg.sender === 'patient' ? 'ai-feed-bubble-user' : 'ai-feed-bubble-assistant'}
              >
                {msg.sender === 'patient' ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary-blue, #23A6F0)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {msg.isVoice ? <Mic size={12} /> : null}
                        {msg.isVoice ? 'Spoken Voice Transcript' : 'Typed Patient Message'}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{msg.timestamp}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.94rem', color: '#1e293b', fontWeight: 500, lineHeight: 1.4 }}>
                      "{msg.text}"
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="ai-agent-header">
                      <div className="ai-agent-badge">
                        <Sparkles size={13} />
                        <span>PatientPilot Clinical AI (Gemini)</span>
                      </div>
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{msg.timestamp}</span>
                    </div>

                    <p style={{ margin: '0 0 6px', fontSize: '0.94rem', color: 'var(--text-dark, #252B42)', lineHeight: 1.5, fontWeight: 500 }}>
                      {language !== 'en' && msg.localizedText ? msg.localizedText : msg.text}
                    </p>
                    {language !== 'en' && msg.localizedText && msg.text !== msg.localizedText && (
                      <p style={{ margin: '0 0 8px', fontSize: '0.80rem', color: '#64748b', fontStyle: 'italic' }}>
                        En: {msg.text}
                      </p>
                    )}

                    {/* Extracted Clinical Entity Badges */}
                    {msg.extractedEntities && (
                      <div className="ai-extracted-chips">
                        {msg.extractedEntities.complaint && (
                          <span className="ai-entity-chip highlight">
                            🎯 <strong>Complaint:</strong> {msg.extractedEntities.complaint}
                          </span>
                        )}
                        {msg.extractedEntities.socratesDelta?.site && (
                          <span className="ai-entity-chip">
                            📍 <strong>Site:</strong> {msg.extractedEntities.socratesDelta.site}
                          </span>
                        )}
                        {msg.extractedEntities.socratesDelta?.character && (
                          <span className="ai-entity-chip">
                            ⚡ <strong>Character:</strong> {msg.extractedEntities.socratesDelta.character}
                          </span>
                        )}
                        {msg.extractedEntities.socratesDelta?.radiation && (
                          <span className="ai-entity-chip">
                            🫀 <strong>Radiation:</strong> {msg.extractedEntities.socratesDelta.radiation}
                          </span>
                        )}
                        {msg.extractedEntities.socratesDelta?.onset && (
                          <span className="ai-entity-chip">
                            ⏱️ <strong>Onset:</strong> {msg.extractedEntities.socratesDelta.onset}
                          </span>
                        )}
                        {typeof msg.extractedEntities.socratesDelta?.severity === 'number' && (
                          <span className="ai-entity-chip highlight">
                            ⚠️ <strong>Severity:</strong> {msg.extractedEntities.socratesDelta.severity}/10
                          </span>
                        )}
                        {msg.extractedEntities.symptoms?.map(sym => (
                          <span key={sym} className="ai-entity-chip">
                            + {sym}
                          </span>
                        ))}
                        {msg.extractedEntities.conditions?.map(cond => (
                          <span key={cond} className="ai-entity-chip">
                            Past: {cond}
                          </span>
                        ))}
                        {msg.extractedEntities.isEmergency && (
                          <span className="ai-entity-chip" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' }}>
                            🚨 <strong>Emergency Red-Flag Triggered</strong>
                          </span>
                        )}
                      </div>
                    )}

                    {/* AI Suggested Option Chips */}
                    {msg.suggestedOptions && msg.suggestedOptions.length > 0 && (
                      <div className="ai-suggested-options">
                        {msg.suggestedOptions.map((opt, i) => (
                          <button
                            key={i}
                            type="button"
                            className="ai-option-pill"
                            onClick={() => handleProcessInputWithAI(opt, false)}
                          >
                            <span>{opt}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* AI Thinking Animation */}
        {isAIThinking && (
          <div className="ai-thinking-pill">
            <Sparkles size={15} className="animate-spin" />
            <span>PatientPilot AI is reasoning clinical parameters with Gemini...</span>
          </div>
        )}

        {/* ================= PHASE 1: DEMOGRAPHICS ================= */}
        {phase === 'demographics' && (
          <div style={{ flex: 1 }}>
            <h2 className="question-title">
              {getLocalizedText(KIOSK_TRANSLATIONS.demographicsTitle, language)}
            </h2>
            <p className="question-subtitle">
              {getLocalizedText(KIOSK_TRANSLATIONS.demographicsSubtitle, language)}
            </p>

            <div className="kiosk-demographics-card">
              <div className="kiosk-demographics-grid">
                <div className="kiosk-form-group">
                  <label htmlFor="patient-full-name" className="kiosk-field-label">
                    <User size={16} color="var(--primary-blue, #23A6F0)" />
                    <span>Full Name</span>
                  </label>
                  <input
                    id="patient-full-name"
                    type="text"
                    className="kiosk-field-input"
                    placeholder="Enter patient full name"
                    value={demographics.name}
                    onChange={(e) => onUpdateDemographics({ ...demographics, name: e.target.value })}
                  />
                </div>

                <div className="kiosk-form-group">
                  <label htmlFor="patient-age" className="kiosk-field-label">
                    <Calendar size={16} color="var(--primary-blue, #23A6F0)" />
                    <span>Age (Years)</span>
                  </label>
                  <input
                    id="patient-age"
                    type="number"
                    min={0}
                    max={130}
                    className="kiosk-field-input"
                    placeholder="e.g. 58"
                    value={demographics.age || ''}
                    onChange={(e) => onUpdateDemographics({ ...demographics, age: parseInt(e.target.value, 10) || 0 })}
                  />
                </div>

                <div className="kiosk-form-group">
                  <label className="kiosk-field-label">
                    <Users size={16} color="var(--primary-blue, #23A6F0)" />
                    <span>Gender</span>
                  </label>
                  <div className="gender-toggle-group">
                    {(['Male', 'Female', 'Other'] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        className={`gender-toggle-btn ${demographics.gender === g ? 'selected' : ''}`}
                        onClick={() => onUpdateDemographics({ ...demographics, gender: g })}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="kiosk-btn kiosk-btn-primary"
              style={{ height: '54px', padding: '0 34px', fontSize: '1.05rem' }}
              onClick={() => setPhase('chief_complaint')}
            >
              <span>{getLocalizedText(KIOSK_TRANSLATIONS.beginIntake, language)}</span>
              <ChevronRight size={19} />
            </button>
          </div>
        )}

        {/* ================= PHASE 2: CHIEF COMPLAINT ================= */}
        {phase === 'chief_complaint' && (
          <div style={{ flex: 1 }}>
            <h2 className="question-title">
              {getLocalizedText(KIOSK_TRANSLATIONS.chiefComplaintTitle, language)}
            </h2>
            <p className="question-subtitle">
              {getLocalizedText(KIOSK_TRANSLATIONS.chiefComplaintSubtitle, language)}
            </p>

            <div className="options-grid">
              {COMMON_COMPLAINTS.map((item) => {
                const localizedLabel = getLocalizedText(item.label, language);
                const englishLabel = item.label.en;
                const isSelected = chiefComplaint === englishLabel || chiefComplaint === localizedLabel;

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`kiosk-option-btn ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectComplaint(englishLabel)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ color: 'var(--primary-blue, #23A6F0)' }}>
                        {item.icon === 'HeartPulse' && <HeartPulse size={24} />}
                        {item.icon === 'Wind' && <Wind size={24} />}
                        {item.icon === 'Thermometer' && <Thermometer size={24} />}
                        {item.icon === 'Brain' && <Brain size={24} />}
                        {item.icon === 'Activity' && <Activity size={24} />}
                        {item.icon === 'ZapOff' && <ZapOff size={24} />}
                        {item.icon === 'UserCheck' && <UserCheck size={24} />}
                        {item.icon === 'PlusCircle' && <PlusCircle size={24} />}
                      </div>
                      <span>{localizedLabel}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= PHASE 3: ADAPTIVE SOCRATES ================= */}
        {phase === 'socrates' && adaptiveSteps[socratesStepIndex] && (
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-blue, #23A6F0)', textTransform: 'uppercase' }}>
                {chiefComplaint}
              </span>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-gray, #737373)' }}>
                Step {socratesStepIndex + 1} of {adaptiveSteps.length}
              </span>
            </div>

            <h2 className="question-title">
              {getIntakeStepPrompt(adaptiveSteps[socratesStepIndex], language)}
            </h2>
            <p className="question-subtitle">
              {getIntakeStepSubtitle(adaptiveSteps[socratesStepIndex], language)}
            </p>

            {/* Severity scale slider if severity step */}
            {adaptiveSteps[socratesStepIndex].socratesField === 'severity' ? (
              <div style={{ padding: '20px 0 30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-gray, #737373)' }}>Mild Discomfort</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: severityValue >= 7 ? '#E74040' : 'var(--primary-blue, #23A6F0)' }}>
                    {severityValue} / 10
                  </span>
                  <span style={{ fontSize: '0.9rem', color: '#E74040', fontWeight: 600 }}>Unbearable Emergency</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={severityValue}
                  onChange={(e) => setSeverityValue(parseInt(e.target.value, 10))}
                  style={{ width: '100%', height: '8px', cursor: 'pointer', accentColor: severityValue >= 7 ? '#E74040' : '#23A6F0' }}
                />
                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="kiosk-btn kiosk-btn-primary"
                    style={{ height: '48px', padding: '0 30px' }}
                    onClick={() => handleAnswerSocrates(severityValue.toString(), 'severity')}
                  >
                    <span>Confirm Severity ({severityValue}/10)</span>
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="options-grid">
                {(adaptiveSteps[socratesStepIndex]?.options || []).map((opt, idx) => {
                  const currentField = adaptiveSteps[socratesStepIndex]?.socratesField;
                  const localizedLabel = getLocalizedText(opt.label, language);
                  const isSelected = 
                    currentField === 'associations'
                      ? associatedSymptoms.includes(opt.value) || associatedSymptoms.includes(localizedLabel)
                      : socrates[currentField as keyof SocratesHistory] === opt.value || socrates[currentField as keyof SocratesHistory] === localizedLabel;

                  return (
                    <button
                      key={opt.value || idx}
                      type="button"
                      className={`kiosk-option-btn ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleAnswerSocrates(opt.value || localizedLabel, currentField)}
                    >
                      <span>{localizedLabel}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= PHASE 4: CHRONIC CONDITIONS ================= */}
        {phase === 'chronic' && (
          <div style={{ flex: 1 }}>
            <h2 className="question-title">
              Past Medical Conditions & History
            </h2>
            <p className="question-subtitle">
              Select any pre-existing health conditions or illnesses you have been diagnosed with.
            </p>

            <div className="options-grid">
              {CHRONIC_CONDITIONS_LIST.map((cond) => {
                const localizedLabel = getLocalizedText(cond.label, language);
                const englishLabel = cond.label.en;
                const isSelected = chronicConditions.includes(englishLabel) || chronicConditions.includes(localizedLabel);
                return (
                  <button
                    key={cond.id}
                    type="button"
                    className={`kiosk-option-btn ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleToggleChronic(cond.id, englishLabel)}
                  >
                    <span>{localizedLabel}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="kiosk-btn kiosk-btn-primary"
                style={{ height: '50px', padding: '0 32px' }}
                onClick={() => setPhase(isAyushActive ? 'ayush' : 'review')}
              >
                <span>Continue to {isAyushActive ? 'AYUSH Protocol' : 'Summary Review'}</span>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ================= PHASE 5: AYUSH DASHAVIDHA PARIKSHA ================= */}
        {phase === 'ayush' && DASHAVIDHA_QUESTIONS[ayushStepIndex] && (
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2DC071', textTransform: 'uppercase' }}>
                AYUSH Dashavidha Pariksha
              </span>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-gray, #737373)' }}>
                Factor {ayushStepIndex + 1} of {DASHAVIDHA_QUESTIONS.length}
              </span>
            </div>

            <h2 className="question-title">
              {getAyushQuestion(DASHAVIDHA_QUESTIONS[ayushStepIndex], language)}
            </h2>

            <div className="options-grid">
              {DASHAVIDHA_QUESTIONS[ayushStepIndex].options.map((opt) => {
                const currentQuestion = DASHAVIDHA_QUESTIONS[ayushStepIndex];
                const isSelected = ayushAssessment[currentQuestion.id] === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`kiosk-option-btn ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleAnswerAyush(currentQuestion.id, opt.value)}
                  >
                    <span>{getAyushOptionLabel(opt, language)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= PHASE 6: SUMMARY & SUBMISSION ================= */}
        {phase === 'review' && (
          <div style={{ flex: 1 }}>
            <h2 className="question-title">
              Intake Summary Ready for Attending Clinician
            </h2>
            <p className="question-subtitle">
              All clinical parameters have been structured and validated against deterministic safety rules.
            </p>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', marginBottom: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Patient</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>{demographics.name} ({demographics.age}y, {demographics.gender})</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Chief Complaint</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#23A6F0' }}>{chiefComplaint}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Pain Severity</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: (socrates.severity ?? 0) >= 7 ? '#E74040' : '#1e293b' }}>
                    {socrates.severity ?? 'N/A'} / 10
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Triage Level</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: triage.triage_level === 'EMERGENCY' ? '#E74040' : '#2DC071' }}>
                    {triage.triage_level}
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="kiosk-btn kiosk-btn-primary"
              style={{ height: '54px', padding: '0 36px', fontSize: '1.05rem', borderRadius: '14px' }}
              onClick={handleFinish}
            >
              <span>Submit Pre-Consultation to Doctor Briefing</span>
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* Quick Voice / Text Demo Trigger Chips */}
        <div className="quick-voice-bar">
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-gray, #737373)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={12} color="var(--primary-blue, #23A6F0)" />
            <span>AI Voice & Text Samples:</span>
          </span>
          <button
            type="button"
            className="quick-voice-chip"
            onClick={() => handleProcessInputWithAI("Doctor, I've had severe crushing chest pain since 2 hours radiating to my left arm with cold sweats", false)}
            title="Test AI Extraction: Acute Cardiac Pain"
          >
            <span>🎙️ "Severe crushing chest pain radiating to left arm"</span>
          </button>
          <button
            type="button"
            className="quick-voice-chip"
            onClick={() => handleProcessInputWithAI("High fever 103F for 3 days with severe headache and neck stiffness", false)}
            title="Test AI Extraction: Febrile & Neurological"
          >
            <span>🎙️ "High fever with neck stiffness"</span>
          </button>
          <button
            type="button"
            className="quick-voice-chip"
            onClick={() => handleProcessInputWithAI("Acute shortness of breath and wheezing, unable to breathe lying down", false)}
            title="Test AI Extraction: Acute Dyspnea"
          >
            <span>🎙️ "Acute breathlessness & wheezing"</span>
          </button>
        </div>

        {/* Voice Error Notice if mic access issues arise */}
        {voiceNotice && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#fffbeb',
            border: '1px solid #fef3c7',
            padding: '8px 14px',
            borderRadius: '10px',
            marginTop: '8px',
            fontSize: '0.80rem',
            color: '#b45309'
          }}>
            <span>{voiceNotice}</span>
            <button
              type="button"
              onClick={() => setVoiceNotice(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b45309', fontWeight: 700, marginLeft: '8px' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Voice and Text Input Bar at Bottom */}
        <div className="kiosk-input-bar">
          <button 
            type="button"
            className={`kiosk-mic-btn ${isListening ? 'listening' : ''}`}
            onClick={handleToggleVoiceInput}
            title={isListening ? 'Tap to Stop Listening' : 'Tap to Speak Voice Input into AI Assistant'}
          >
            {isListening ? <MicOff size={24} /> : <Mic size={24} />}
          </button>

          <input 
            type="text" 
            placeholder={
              isListening 
                ? 'Listening to your voice... (Speak clearly now)' 
                : isAIThinking
                ? 'PatientPilot AI is reasoning your input...'
                : language === 'hi' 
                ? 'अपनी आवाज से बोलें या यहां टाइप करें...' 
                : language === 'bn' 
                ? 'মুখে বলুন अथवा এখানে লিখুন...' 
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
            onKeyDown={(e) => { 
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmitText();
              }
            }}
            disabled={isAIThinking}
            className="kiosk-text-input"
          />

          <button 
            type="button"
            className="kiosk-btn kiosk-btn-primary"
            style={{ width: '52px', height: '52px', padding: 0, justifyContent: 'center', borderRadius: '12px' }}
            onClick={handleSubmitText}
            disabled={isAIThinking || (!textInput.trim() && !isListening)}
            title="Send to PatientPilot Clinical AI"
          >
            {isAIThinking ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

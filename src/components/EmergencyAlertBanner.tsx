import React, { useEffect } from 'react';
import { AlertOctagon, PhoneCall, ShieldAlert, ArrowRight, UserCheck } from 'lucide-react';
import { TriageResult, LanguageCode } from '../types/clinical';
import { speechService } from '../services/speechService';

interface EmergencyAlertBannerProps {
  triage: TriageResult;
  language: LanguageCode;
  onAcknowledge: () => void;
  onViewDoctorBriefing: () => void;
}

export const EmergencyAlertBanner: React.FC<EmergencyAlertBannerProps> = ({
  triage,
  language,
  onAcknowledge,
  onViewDoctorBriefing
}) => {
  useEffect(() => {
    // Audible emergency announcement for kiosk
    const emergencyPrompt: Record<LanguageCode, string> = {
      en: 'Attention: Critical red-flag symptom detected. Please do not wait in queue. An emergency healthcare staff member is being alerted.',
      hi: 'ध्यान दें: गंभीर आपातकालीन लक्षण पाया गया है। कृपया कतार में प्रतीक्षा न करें। तुरंत आपातकालीन वार्ड में जाएं।',
      bn: 'মনোযোগ দিন: জরুরি লাল লক্ষণ শনাক্ত হয়েছে। দয়া করে লাইনে অপেক্ষা করবেন না। অবিলম্বে জরুরি বিভাগে যান।'
    };
    speechService.speak(emergencyPrompt[language] || emergencyPrompt.en, language);

    return () => {
      speechService.stopSpeaking();
    };
  }, [language]);

  return (
    <div className="emergency-overlay">
      <div className="emergency-box">
        {/* Pulsing Emergency Beacon */}
        <div className="emergency-icon-ring">
          <AlertOctagon size={54} strokeWidth={2.5} />
        </div>

        <div style={{
          display: 'inline-block',
          background: 'rgba(239, 68, 68, 0.3)',
          border: '1px solid #ef4444',
          color: '#fca5a5',
          padding: '6px 18px',
          borderRadius: '999px',
          fontWeight: 800,
          fontSize: '0.85rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: '16px'
        }}>
          OPD TRIAGE PROTOCOL: CODE RED (EMERGENCY)
        </div>

        <h1 style={{ 
          fontFamily: 'var(--font-display)', 
          fontSize: '2.4rem', 
          fontWeight: 800, 
          color: '#ffffff',
          lineHeight: 1.2,
          marginBottom: '14px' 
        }}>
          {language === 'hi' 
            ? 'तत्काल चिकित्सा सहायता आवश्यक है' 
            : language === 'bn' 
            ? 'অবিলম্বে জরুরি চিকিৎসা সেবা প্রয়োজন'
            : 'Immediate Medical Attention Required'}
        </h1>

        <p style={{ fontSize: '1.2rem', color: '#fecaca', marginBottom: '24px', fontWeight: 500 }}>
          {language === 'hi'
            ? 'आपके बताए गए लक्षण उच्च प्राथमिकता वाले हैं। सामान्य कतार छोड़ें और तुरंत इमरजेंसी रूम जाएं।'
            : language === 'bn'
            ? 'আপনার বর্ণিত লক্ষণগুলি অত্যন্ত সংবেদনশীল। সাধারণ লাইন ত্যাগ করে সরাসরি এমার্জেন্সি বে-তে যান।'
            : 'Your reported symptoms meet critical safety thresholds. Routine questioning has been halted.'}
        </p>

        {/* Triggered Rules Box */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '16px',
          padding: '20px',
          textAlign: 'left',
          marginBottom: '28px'
        }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <ShieldAlert size={18} /> Deterministic Safety Rule Triggers:
          </div>
          <ul style={{ paddingLeft: '22px', fontSize: '0.95rem', color: '#fca5a5' }}>
            {triage.triggeredRules.map((rule, idx) => (
              <li key={idx} style={{ marginBottom: '6px' }}>
                <strong>{rule.ruleDescription}</strong>
                {rule.matchedCriteria.length > 0 && (
                  <span style={{ color: '#fed7aa', display: 'block', fontSize: '0.84rem' }}>
                    Criteria: {rule.matchedCriteria.join(' • ')}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.85rem', color: '#fecaca' }}>
            <strong>Action Mandated:</strong> {triage.actionRequired}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button 
            className="kiosk-btn kiosk-btn-emergency"
            style={{ height: '56px', padding: '0 28px', fontSize: '1.1rem', borderRadius: '16px' }}
            onClick={onAcknowledge}
          >
            <PhoneCall size={20} />
            <span>Notify Triage Nurse / Attendant</span>
          </button>

          <button 
            className="kiosk-btn"
            style={{ height: '56px', padding: '0 24px', fontSize: '1.05rem', borderRadius: '16px', background: 'rgba(255,255,255,0.1)' }}
            onClick={onViewDoctorBriefing}
          >
            <span>View Clinician Emergency Briefing</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { 
  Printer, 
  Copy, 
  Check, 
  AlertTriangle, 
  ShieldCheck, 
  Pill, 
  Activity, 
  FileText, 
  User, 
  Calendar, 
  Download,
  CheckCircle2,
  Stethoscope,
  Leaf
} from 'lucide-react';
import { ClinicianBriefing } from '../types/clinical';
import { evaluateAyushSummary } from '../services/ayushEngine';

interface ClinicianDashboardViewProps {
  briefing: ClinicianBriefing;
  onBackToPortal?: () => void;
  onBackToKiosk?: () => void;
}

export const ClinicianDashboardView: React.FC<ClinicianDashboardViewProps> = ({
  briefing,
  onBackToPortal,
  onBackToKiosk
}) => {
  const handleBack = onBackToPortal || onBackToKiosk || (() => {});

  const [copied, setCopied] = useState<boolean>(false);
  const [clinicianNotes, setClinicianNotes] = useState<string>(briefing.clinicianNotes || '');
  const [signedOff, setSignedOff] = useState<boolean>(false);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyEMR = () => {
    const emrText = `=== PATIENTPILOT CLINICAL INTAKE BRIEFING ===
Patient: ${briefing.patient.name} (${briefing.patient.age}y / ${briefing.patient.gender}) | OPD Token: ${briefing.patient.opdRegId}
Date/Time: ${briefing.createdAt}
Triage Level: ${briefing.triage.triage_level}
Reason: ${briefing.triage.reason}

1. CHIEF COMPLAINT:
- Primary: ${briefing.chiefComplaint.primary}
- Onset/Duration: ${briefing.chiefComplaint.duration || briefing.socrates.onset || 'Not specified'}
- Associated Symptoms: ${briefing.chiefComplaint.associatedSymptoms.join(', ') || 'None'}

2. SOCRATES BREAKDOWN:
- Site: ${briefing.socrates.site || 'N/A'}
- Onset: ${briefing.socrates.onset || 'N/A'}
- Character: ${briefing.socrates.character || 'N/A'}
- Radiation: ${briefing.socrates.radiation || 'None'}
- Associations: ${briefing.socrates.associations?.join(', ') || 'None'}
- Severity: ${briefing.socrates.severity ? `${briefing.socrates.severity}/10` : 'N/A'}
- Exacerbating/Relieving: ${briefing.socrates.exacerbatingFactors || 'None reported'}

3. MEDICAL HISTORY & CHRONIC CONDITIONS:
${briefing.chronicConditions.join(', ') || 'None reported'}

4. RECONCILED ACTIVE MEDICATIONS:
${briefing.activeMedications.length > 0 
  ? briefing.activeMedications.map(m => `- ${m.name} ${m.dosage} (${m.frequency}) [${m.indication || ''}]`).join('\n')
  : 'None extracted from documents'}

5. KEY LAB VALUES & ABNORMALITIES:
${briefing.abnormalLabs.length > 0 
  ? briefing.abnormalLabs.map(l => `- ${l.test_name}: ${l.result} ${l.reference_unit} [${l.status}] (Ref: ${l.normal_range || 'N/A'})`).join('\n')
  : 'None uploaded'}

${briefing.isAyushActive && briefing.ayushAssessment ? `6. AYUSH DASHAVIDHA PARIKSHA:
${evaluateAyushSummary(briefing.ayushAssessment)}` : ''}

7. CLINICAL SAFETY MATRIX AUDIT:
- Rule evaluation: ${briefing.triage.triggeredRules.map(r => r.ruleDescription).join('; ') || 'No red flags detected'}

DISCLAIMER: Autonomous Pre-Consultation Intake Assistant briefing. NOT a diagnostic report. Attending physician review and physical examination mandatory.
==============================================`;

    navigator.clipboard.writeText(emrText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const triageColor = briefing.triage.triage_level === 'EMERGENCY' 
    ? '#ef4444' 
    : briefing.triage.triage_level === 'HIGH_PRIORITY' 
    ? '#f59e0b' 
    : '#10b981';

  return (
    <div className="glass-card" style={{ height: '100%', overflowY: 'auto' }}>
      <div className="clinician-report-container">
        {/* Top Action Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <button className="kiosk-btn" onClick={handleBack} style={{ height: '38px', fontSize: '0.85rem' }}>
              ← Return to Patient Intake
            </button>
          </div>


          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="kiosk-btn" onClick={handleCopyEMR}>
              {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
              <span>{copied ? 'Copied EMR Text!' : 'Copy to EMR'}</span>
            </button>
            <button className="kiosk-btn kiosk-btn-primary" onClick={handlePrint}>
              <Printer size={16} />
              <span>Print Briefing</span>
            </button>
          </div>
        </div>

        {/* Report Header Card */}
        <div className="report-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f472b6', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Stethoscope size={18} />
              <span>Pre-Consultation Clinical Intake Briefing</span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, marginTop: '4px' }}>
              {briefing.patient.name}
            </h1>
            <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '6px' }}>
              <span>Age/Gender: <strong>{briefing.patient.age} Yrs / {briefing.patient.gender}</strong></span>
              <span>•</span>
              <span>OPD Token: <strong style={{ fontFamily: 'var(--font-mono)' }}>{briefing.patient.opdRegId}</strong></span>
              <span>•</span>
              <span>Timestamp: {briefing.createdAt}</span>
            </div>
          </div>

          {/* Triage Level Badge */}
          <div style={{ 
            background: briefing.triage.triage_level === 'EMERGENCY' ? 'rgba(239, 68, 68, 0.2)' : briefing.triage.triage_level === 'HIGH_PRIORITY' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
            border: `2px solid ${triageColor}`,
            borderRadius: '16px',
            padding: '14px 22px',
            textAlign: 'right',
            minWidth: '220px'
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Deterministic Triage Status
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: triageColor }}>
              {briefing.triage.triage_level}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {briefing.triage.triggeredRules.length} safety rules evaluated
            </div>
          </div>
        </div>

        {/* Deterministic Safety Reasoning Notice */}
        {briefing.triage.triggeredRules.length > 0 && (
          <div style={{ 
            background: briefing.triage.triage_level === 'EMERGENCY' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)', 
            borderLeft: `4px solid ${triageColor}`,
            padding: '14px 20px',
            borderRadius: '0 12px 12px 0',
            marginBottom: '24px'
          }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: triageColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} /> Deterministic Safety Rule Triggers:
            </div>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-main)', marginTop: '4px' }}>
              {briefing.triage.reason}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              <strong>Recommended Action:</strong> {briefing.triage.actionRequired}
            </div>
          </div>
        )}

        {/* Section 1: Chief Complaint & SOCRATES Matrix */}
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f472b6', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} /> 1. Chief Complaint & SOCRATES Pain/Symptom Matrix
          </h2>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
            gap: '12px', 
            background: 'var(--bg-surface-elevated)', 
            padding: '18px', 
            borderRadius: '14px',
            border: '1px solid var(--border-glass)'
          }}>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Chief Complaint:</span>
              <p style={{ fontWeight: 700, fontSize: '1.05rem', color: '#ffffff' }}>{briefing.chiefComplaint.primary}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Site (Location):</span>
              <p style={{ fontWeight: 600 }}>{briefing.socrates.site || 'Unspecified'}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Onset & Duration:</span>
              <p style={{ fontWeight: 600 }}>{briefing.socrates.onset || 'Not provided'}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Character / Quality:</span>
              <p style={{ fontWeight: 600 }}>{briefing.socrates.character || 'Not provided'}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Radiation:</span>
              <p style={{ fontWeight: 600, color: briefing.socrates.radiation?.includes('Arm') ? '#f87171' : 'inherit' }}>
                {briefing.socrates.radiation || 'None reported'}
              </p>
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Severity (1-10):</span>
              <p style={{ fontWeight: 700, color: (briefing.socrates.severity || 0) >= 8 ? '#f87171' : '#38bdf8' }}>
                {briefing.socrates.severity ? `${briefing.socrates.severity} / 10` : 'Not rated'}
              </p>
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Exacerbating / Relieving:</span>
              <p style={{ fontWeight: 600 }}>{briefing.socrates.exacerbatingFactors || 'None noted'}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Associated Symptoms:</span>
              <p style={{ fontWeight: 600 }}>{briefing.chiefComplaint.associatedSymptoms.join(', ') || 'None reported'}</p>
            </div>
          </div>
        </div>

        {/* Section 2: Reconciled Medications */}
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#93c5fd', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Pill size={18} /> 2. Reconciled Active Medications (From Prescriptions / Records)
          </h2>

          {briefing.activeMedications.length > 0 ? (
            <table className="medical-table">
              <thead>
                <tr>
                  <th>Medication Name</th>
                  <th>Dosage</th>
                  <th>Frequency & Timing</th>
                  <th>Route</th>
                  <th>Indication / Purpose</th>
                </tr>
              </thead>
              <tbody>
                {briefing.activeMedications.map((med, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 700, color: '#ffffff' }}>{med.name}</td>
                    <td>{med.dosage}</td>
                    <td style={{ color: '#6ee7b7' }}>{med.frequency}</td>
                    <td>{med.route || 'Oral'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{med.indication || 'Chronic management'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '14px', background: 'var(--bg-surface-elevated)', borderRadius: '10px', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              No previous medication chart uploaded. Patient reports no active regular medications.
            </div>
          )}
        </div>

        {/* Section 3: Key Lab Values */}
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#93c5fd', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} /> 3. Extracted Lab Investigations & Biomarkers
          </h2>

          {briefing.abnormalLabs.length > 0 ? (
            <table className="medical-table">
              <thead>
                <tr>
                  <th>Investigation Name</th>
                  <th>Result</th>
                  <th>Reference Range</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {briefing.abnormalLabs.map((lab, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{lab.test_name}</td>
                    <td style={{ fontWeight: 700, color: lab.status === 'CRITICAL' ? '#f87171' : 'inherit' }}>
                      {lab.result} {lab.reference_unit}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{lab.normal_range || 'Standard'}</td>
                    <td>
                      <span className={`lab-status-badge ${lab.status === 'CRITICAL' ? 'lab-status-critical' : lab.status === 'HIGH' ? 'lab-status-high' : 'lab-status-normal'}`}>
                        {lab.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '14px', background: 'var(--bg-surface-elevated)', borderRadius: '10px', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              No recent laboratory reports scanned or attached to this session.
            </div>
          )}
        </div>

        {/* Section 4: AYUSH Assessment (if active) */}
        {briefing.isAyushActive && briefing.ayushAssessment && (
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#34d399', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Leaf size={18} /> 4. AYUSH / Ayurvedic Intake (Dashavidha Pariksha)
            </h2>

            <div style={{ 
              background: 'rgba(5, 150, 105, 0.08)', 
              border: '1px solid rgba(16, 185, 129, 0.3)', 
              borderRadius: '14px', 
              padding: '18px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px'
            }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: '#6ee7b7' }}>Deha Prakriti:</span>
                <p style={{ fontWeight: 700 }}>{briefing.ayushAssessment.prakriti || 'Not assessed'}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: '#6ee7b7' }}>Agni & Ahara Shakti:</span>
                <p style={{ fontWeight: 600 }}>{briefing.ayushAssessment.agniAharaShakti || 'Not assessed'}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: '#6ee7b7' }}>Vyayama Shakti (Physical Endurance):</span>
                <p style={{ fontWeight: 600 }}>{briefing.ayushAssessment.vyayamaShakti || 'Not assessed'}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: '#6ee7b7' }}>Satmya (Dietary Compatibility):</span>
                <p style={{ fontWeight: 600 }}>{briefing.ayushAssessment.satmya || 'Not assessed'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Clinician Review & Sign-Off Block */}
        <div style={{ 
          background: 'var(--bg-surface-elevated)', 
          borderRadius: '16px', 
          padding: '24px', 
          border: '1.5px solid var(--border-glass)',
          marginTop: '32px'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '10px' }}>
            Clinician In-Person Assessment & Sign-off
          </h3>
          <textarea
            placeholder="Doctor's clinical notes, physical examination findings, provisional diagnosis, and prescription plan..."
            value={clinicianNotes}
            onChange={(e) => setClinicianNotes(e.target.value)}
            style={{
              width: '100%',
              minHeight: '80px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-glass)',
              borderRadius: '12px',
              padding: '12px 16px',
              color: 'var(--text-main)',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.9rem',
              resize: 'vertical',
              outline: 'none',
              marginBottom: '16px'
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Attending Physician Signature: _______________________ (Reg No: ____________)
            </div>
            <button
              className={`kiosk-btn ${signedOff ? 'kiosk-btn-primary' : ''}`}
              onClick={() => setSignedOff(!signedOff)}
            >
              <CheckCircle2 size={18} color={signedOff ? '#34d399' : 'currentColor'} />
              <span>{signedOff ? 'Reviewed & Signed by Clinician' : 'Sign-Off & Authorize'}</span>
            </button>
          </div>
        </div>

        {/* Mandatory Clinical Disclaimer */}
        <div className="disclaimer-banner">
          <strong>CLINICAL AI INTAKE MANDATE:</strong> PatientPilot is an autonomous pre-consultation clinical intake and triage assistant. It is strictly not a diagnostician or treating physician. It does not alter medications or recommend treatment plans. Physical verification, clinical correlation, and diagnostic judgment by a registered medical practitioner are mandatory.
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { 
  User, 
  Activity, 
  ShieldAlert, 
  ShieldCheck, 
  Pill, 
  FileText, 
  HeartPulse,
  Leaf
} from 'lucide-react';
import { 
  PatientDemographics, 
  SocratesHistory, 
  TriageResult, 
  ExtractedMedication, 
  ExtractedLabValue,
  DashavidhaPariksha
} from '../types/clinical';

interface SidebarStatusPanelProps {
  demographics: PatientDemographics;
  socrates: SocratesHistory;
  chiefComplaint: string;
  triage: TriageResult;
  medications: ExtractedMedication[];
  labValues: ExtractedLabValue[];
  isAyushActive: boolean;
  ayushAssessment: DashavidhaPariksha;
  onOpenDocumentUpload: () => void;
}

export const SidebarStatusPanel: React.FC<SidebarStatusPanelProps> = ({
  demographics,
  socrates,
  chiefComplaint,
  triage,
  medications,
  labValues,
  isAyushActive,
  ayushAssessment,
  onOpenDocumentUpload
}) => {
  const triageClass = triage.triage_level === 'EMERGENCY'
    ? 'triage-emergency'
    : triage.triage_level === 'HIGH_PRIORITY'
    ? 'triage-high-priority'
    : 'triage-routine';

  return (
    <div 
      className="glass-card sidebar-panel" 
      style={{ 
        padding: '20px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '16px',
        alignSelf: 'start',
        height: 'fit-content',
        position: 'sticky',
        top: '20px'
      }}
    >
      {/* Patient Token Header */}
      <div className="patient-badge-card" style={{
        background: '#f8fafc',
        border: '1px solid rgba(13, 148, 136, 0.15)',
        borderRadius: '14px',
        padding: '12px 14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ 
            width: '38px', 
            height: '38px', 
            borderRadius: '10px', 
            background: 'linear-gradient(135deg, #044e54 0%, #0d9488 100%)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 2px 8px rgba(13, 148, 136, 0.25)'
          }}>
            <User size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>{demographics.name || 'Anonymous Patient'}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              {demographics.age} Yrs • {demographics.gender} • Token #{demographics.opdRegId}
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Triage Gate Badge */}
      <div 
        className={`triage-indicator-card ${triageClass}`}
        style={{
          padding: '16px 18px',
          borderRadius: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {triage.triage_level === 'EMERGENCY' ? (
              <ShieldAlert size={20} color="#ef4444" />
            ) : (
              <ShieldCheck size={20} color={triage.triage_level === 'HIGH_PRIORITY' ? '#d97706' : '#059669'} />
            )}
            <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Safety Triage Gate
            </span>
          </div>
        </div>

        <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '6px' }}>
          {triage.triage_level}
        </div>
        <div style={{ fontSize: '0.75rem', marginTop: '2px', opacity: 0.9 }}>
          {triage.reason}
        </div>
      </div>

      {/* SOCRATES Tracking Matrix Checklist */}
      <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '14px', border: '1px solid rgba(13, 148, 136, 0.15)' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#044e54', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <HeartPulse size={14} color="#0d9488" />
          <span>SOCRATES History Capture</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>Site (Location):</span>
            <span style={{ fontWeight: 600, color: socrates.site ? '#0f172a' : '#94a3b8' }}>
              {socrates.site || '—'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>Onset:</span>
            <span style={{ fontWeight: 600, color: socrates.onset ? '#0f172a' : '#94a3b8' }}>
              {socrates.onset || '—'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>Character:</span>
            <span style={{ fontWeight: 600, color: socrates.character ? '#0f172a' : '#94a3b8' }}>
              {socrates.character || '—'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>Radiation:</span>
            <span style={{ fontWeight: 600, color: socrates.radiation ? '#dc2626' : '#94a3b8' }}>
              {socrates.radiation || '—'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>Severity:</span>
            <span style={{ fontWeight: 700, color: socrates.severity ? (socrates.severity >= 8 ? '#dc2626' : '#0d9488') : '#94a3b8' }}>
              {socrates.severity ? `${socrates.severity}/10` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Uploaded Documents Quick Summary */}
      <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '14px', border: '1px solid rgba(13, 148, 136, 0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#044e54', textTransform: 'uppercase' }}>
            Extracted Records
          </span>
          <button 
            onClick={onOpenDocumentUpload}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#0d9488', 
              fontSize: '0.75rem', 
              fontWeight: 700, 
              cursor: 'pointer',
              textDecoration: 'underline' 
            }}
          >
            + Add Document
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1, background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '8px 10px', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 600 }}>Medications</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#15803d' }}>{medications.length}</div>
          </div>
          <div style={{ flex: 1, background: '#fffbeb', border: '1px solid #fde68a', padding: '8px 10px', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.72rem', color: '#92400e', fontWeight: 600 }}>Lab Markers</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#b45309' }}>{labValues.length}</div>
          </div>
        </div>
      </div>

      {/* AYUSH Mode Indicator if active */}
      {isAyushActive && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '14px', padding: '12px 14px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <Leaf size={14} /> AYUSH Dashavidha Active
          </div>
          <div style={{ fontSize: '0.74rem', color: '#166534' }}>
            {ayushAssessment.prakriti ? `Prakriti: ${ayushAssessment.prakriti}` : 'Constitutional evaluation ongoing'}
          </div>
        </div>
      )}
    </div>
  );
};

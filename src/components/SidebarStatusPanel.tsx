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
    <div className="glass-card sidebar-panel">
      {/* Patient Token Header */}
      <div className="patient-badge-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ 
            width: '36px', 
            height: '36px', 
            borderRadius: '10px', 
            background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.2), rgba(14, 165, 233, 0.2))', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#f472b6'
          }}>
            <User size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{demographics.name || 'Anonymous Patient'}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {demographics.age} Yrs • {demographics.gender} • Token #{demographics.opdRegId}
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Triage Gate Badge */}
      <div className={`triage-indicator-card ${triageClass}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {triage.triage_level === 'EMERGENCY' ? (
              <ShieldAlert size={20} color="#ef4444" />
            ) : (
              <ShieldCheck size={20} color={triage.triage_level === 'HIGH_PRIORITY' ? '#f59e0b' : '#10b981'} />
            )}
            <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
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
      <div style={{ background: 'var(--bg-surface-elevated)', borderRadius: '14px', padding: '14px', border: '1px solid var(--border-glass)' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f472b6', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <HeartPulse size={14} />
          <span>SOCRATES History Capture</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', fontSize: '0.8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Site (Location):</span>
            <span style={{ fontWeight: 600, color: socrates.site ? '#f8fafc' : 'var(--text-muted)' }}>
              {socrates.site || '—'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Onset:</span>
            <span style={{ fontWeight: 600, color: socrates.onset ? '#f8fafc' : 'var(--text-muted)' }}>
              {socrates.onset || '—'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Character:</span>
            <span style={{ fontWeight: 600, color: socrates.character ? '#f8fafc' : 'var(--text-muted)' }}>
              {socrates.character || '—'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Radiation:</span>
            <span style={{ fontWeight: 600, color: socrates.radiation ? '#f87171' : 'var(--text-muted)' }}>
              {socrates.radiation || '—'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Severity:</span>
            <span style={{ fontWeight: 700, color: socrates.severity ? (socrates.severity >= 8 ? '#f87171' : '#38bdf8') : 'var(--text-muted)' }}>
              {socrates.severity ? `${socrates.severity}/10` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Uploaded Documents Quick Summary */}
      <div style={{ background: 'var(--bg-surface-elevated)', borderRadius: '14px', padding: '14px', border: '1px solid var(--border-glass)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>
            Extracted Records
          </span>
          <button 
            onClick={onOpenDocumentUpload}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#f472b6', 
              fontSize: '0.75rem', 
              fontWeight: 600, 
              cursor: 'pointer',
              textDecoration: 'underline' 
            }}
          >
            + Add Document
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '8px 10px', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.72rem', color: '#6ee7b7' }}>Medications</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399' }}>{medications.length}</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '8px 10px', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.72rem', color: '#fde68a' }}>Lab Markers</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fbbf24' }}>{labValues.length}</div>
          </div>
        </div>
      </div>

      {/* AYUSH Mode Indicator if active */}
      {isAyushActive && (
        <div style={{ background: 'rgba(5, 150, 105, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '14px', padding: '12px 14px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <Leaf size={14} /> AYUSH Dashavidha Active
          </div>
          <div style={{ fontSize: '0.74rem', color: '#a7f3d0' }}>
            {ayushAssessment.prakriti ? `Prakriti: ${ayushAssessment.prakriti}` : 'Constitutional evaluation ongoing'}
          </div>
        </div>
      )}
    </div>
  );
};

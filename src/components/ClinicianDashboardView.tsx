import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  CheckCircle2,
  Stethoscope,
  Leaf,
  Search,
  RefreshCw,
  Clock,
  UserCheck,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { ClinicianBriefing } from '../types/clinical';
import { evaluateAyushSummary } from '../services/ayushEngine';
import { apiClient } from '../services/apiClient';

interface QueueItem {
  id: string;
  intake_session_id: string;
  patient_name: string;
  opd_reg_id: string;
  triage_level: string;
  chief_complaint?: string;
  clinician_notes?: string;
  reviewed_at?: string;
  created_at?: string;
}

interface ClinicianDashboardViewProps {
  briefing?: ClinicianBriefing;
}

function mapBackendToBriefing(raw: any): ClinicianBriefing {
  return {
    id: String(raw.id),
    createdAt: raw.created_at ? new Date(raw.created_at).toLocaleString() : (raw.createdAt || new Date().toLocaleString()),
    patient: {
      name: raw.patient?.name || raw.patient_name || 'Unknown Patient',
      age: raw.patient?.age || 0,
      gender: raw.patient?.gender || 'Other',
      opdRegId: raw.patient?.opdRegId || raw.patient?.opd_reg_id || raw.opd_reg_id || 'OPD-N/A',
      contactNumber: raw.patient?.contactNumber || raw.patient?.contact_number,
      vitals: raw.patient?.vitals
    },
    chiefComplaint: {
      primary: raw.chief_complaint?.primary || raw.chiefComplaint?.primary || raw.chief_complaint || 'General Consultation',
      onset: raw.chief_complaint?.onset || raw.chiefComplaint?.onset || raw.socrates?.onset || 'Subacute',
      duration: raw.chief_complaint?.duration || raw.chiefComplaint?.duration || raw.socrates?.timeDuration || '1-2 days',
      associatedSymptoms: raw.chief_complaint?.associatedSymptoms || raw.chiefComplaint?.associatedSymptoms || []
    },
    socrates: raw.socrates || {},
    chronicConditions: raw.chronic_conditions || raw.chronicConditions || [],
    activeMedications: (raw.active_medications || raw.activeMedications || []).map((m: any) => ({
      name: m.name,
      dosage: m.dosage,
      frequency: m.frequency,
      route: m.route || 'Oral',
      duration: m.duration || 'Ongoing',
      indication: m.indication || ''
    })),
    abnormalLabs: (raw.abnormal_labs || raw.abnormalLabs || []).map((l: any) => ({
      test_name: l.test_name,
      result: l.result,
      reference_unit: l.reference_unit || '',
      normal_range: l.normal_range || 'N/A',
      status: l.status || 'NORMAL'
    })),
    ayushAssessment: raw.ayush_assessment || raw.ayushAssessment,
    triage: {
      triage_level: raw.triage?.triage_level || raw.triage_level || 'ROUTINE',
      triggeredRules: raw.triage?.triggeredRules || raw.triage?.triggered_rules || [],
      reason: raw.triage?.reason || 'Routine pre-consultation review',
      actionRequired: raw.triage?.actionRequired || raw.triage?.action_required || 'Standard consultation',
      evaluatedAt: raw.triage?.evaluatedAt || raw.triage?.evaluated_at || new Date().toISOString()
    },
    isAyushActive: Boolean(raw.is_ayush_active ?? raw.isAyushActive),
    clinicianNotes: raw.clinician_notes || raw.clinicianNotes || '',
    fhirJson: raw.fhir_json || raw.fhirJson
  };
}

export const ClinicianDashboardView: React.FC<ClinicianDashboardViewProps> = ({
  briefing: initialBriefing
}) => {
  // Queue & Selection State
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loadingQueue, setLoadingQueue] = useState<boolean>(true);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [selectedBriefingId, setSelectedBriefingId] = useState<string | null>(null);
  const [triageFilter, setTriageFilter] = useState<'ALL' | 'EMERGENCY' | 'HIGH_PRIORITY' | 'ROUTINE'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active Briefing Detail State
  const [activeBriefing, setActiveBriefing] = useState<ClinicianBriefing | null>(initialBriefing || null);
  const [loadingBriefing, setLoadingBriefing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [clinicianNotes, setClinicianNotes] = useState<string>(initialBriefing?.clinicianNotes || '');
  const [signedOff, setSignedOff] = useState<boolean>(false);
  const [isSavingSignoff, setIsSavingSignoff] = useState<boolean>(false);
  const [signoffMessage, setSignoffMessage] = useState<string | null>(null);

  // Fetch queue from backend
  const fetchQueue = useCallback(async (filter?: string) => {
    try {
      setLoadingQueue(true);
      setQueueError(null);
      const data = await apiClient.getDoctorBriefings(filter === 'ALL' ? undefined : filter);
      setQueue(data || []);

      // If we don't have an active selection yet, or the current selected is not in the new list, pick the first
      if (data && data.length > 0) {
        setSelectedBriefingId(prev => {
          if (prev && data.some(item => item.id === prev)) {
            return prev;
          }
          return data[0].id;
        });
      }
    } catch (err: any) {
      console.error('Failed to load doctor briefings queue:', err);
      setQueueError(err.message || 'Could not load OPD queue');
    } finally {
      setLoadingQueue(false);
    }
  }, []);

  // Initial queue load
  useEffect(() => {
    fetchQueue(triageFilter);
  }, [fetchQueue, triageFilter]);

  // Load active briefing details when selectedBriefingId changes
  useEffect(() => {
    if (!selectedBriefingId) return;

    let isMounted = true;
    const loadDetail = async () => {
      try {
        setLoadingBriefing(true);
        const data = await apiClient.getDoctorBriefing(selectedBriefingId);
        if (isMounted && data) {
          const mapped = mapBackendToBriefing(data);
          setActiveBriefing(mapped);
          setClinicianNotes(mapped.clinicianNotes || '');
          setSignedOff(Boolean(data.reviewed_at));
        }
      } catch (err: any) {
        console.error('Failed to load briefing details:', err);
      } finally {
        if (isMounted) setLoadingBriefing(false);
      }
    };

    loadDetail();
    return () => { isMounted = false; };
  }, [selectedBriefingId]);

  // Copy EMR handler
  const handleCopyEMR = () => {
    if (!activeBriefing) return;

    const emrText = `=== PATIENTPILOT CLINICAL INTAKE BRIEFING ===
Patient: ${activeBriefing.patient.name} (${activeBriefing.patient.age}y / ${activeBriefing.patient.gender}) | OPD Token: ${activeBriefing.patient.opdRegId}
Date/Time: ${activeBriefing.createdAt}
Triage Level: ${activeBriefing.triage.triage_level}
Reason: ${activeBriefing.triage.reason}

1. CHIEF COMPLAINT:
- Primary: ${activeBriefing.chiefComplaint.primary}
- Onset/Duration: ${activeBriefing.chiefComplaint.duration || activeBriefing.socrates.onset || 'Not specified'}
- Associated Symptoms: ${activeBriefing.chiefComplaint.associatedSymptoms.join(', ') || 'None'}

2. SOCRATES BREAKDOWN:
- Site: ${activeBriefing.socrates.site || 'N/A'}
- Onset: ${activeBriefing.socrates.onset || 'N/A'}
- Character: ${activeBriefing.socrates.character || 'N/A'}
- Radiation: ${activeBriefing.socrates.radiation || 'None'}
- Associations: ${activeBriefing.socrates.associations?.join(', ') || 'None'}
- Severity: ${activeBriefing.socrates.severity ? `${activeBriefing.socrates.severity}/10` : 'N/A'}
- Exacerbating/Relieving: ${activeBriefing.socrates.exacerbatingFactors || 'None reported'}

3. MEDICAL HISTORY & CHRONIC CONDITIONS:
${activeBriefing.chronicConditions.join(', ') || 'None reported'}

4. RECONCILED ACTIVE MEDICATIONS:
${activeBriefing.activeMedications.length > 0 
  ? activeBriefing.activeMedications.map(m => `- ${m.name} ${m.dosage} (${m.frequency}) [${m.indication || ''}]`).join('\n')
  : 'None extracted from documents'}

5. KEY LAB VALUES & ABNORMALITIES:
${activeBriefing.abnormalLabs.length > 0 
  ? activeBriefing.abnormalLabs.map(l => `- ${l.test_name}: ${l.result} ${l.reference_unit} [${l.status}] (Ref: ${l.normal_range || 'N/A'})`).join('\n')
  : 'None uploaded'}

${activeBriefing.isAyushActive && activeBriefing.ayushAssessment ? `6. AYUSH DASHAVIDHA PARIKSHA:
${evaluateAyushSummary(activeBriefing.ayushAssessment)}` : ''}

7. CLINICAL SAFETY MATRIX AUDIT:
- Rule evaluation: ${activeBriefing.triage.triggeredRules.map(r => r.ruleDescription).join('; ') || 'No red flags detected'}

8. CLINICIAN NOTES & SIGN-OFF:
${clinicianNotes || 'None recorded'}

DISCLAIMER: Autonomous Pre-Consultation Intake Assistant briefing. NOT a diagnostic report. Attending physician review and physical examination mandatory.
==============================================`;

    navigator.clipboard.writeText(emrText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Sign-off and persist to backend
  const handleSignOff = async () => {
    if (!activeBriefing) return;
    try {
      setIsSavingSignoff(true);
      setSignoffMessage(null);
      await apiClient.updateDoctorBriefing(activeBriefing.id, clinicianNotes);
      setSignedOff(true);
      setSignoffMessage('Authorized & signed in database EMR');

      // Update queue item reviewed status locally
      setQueue(prev => prev.map(item => {
        if (item.id === activeBriefing.id) {
          return {
            ...item,
            clinician_notes: clinicianNotes,
            reviewed_at: new Date().toISOString()
          };
        }
        return item;
      }));

      setTimeout(() => setSignoffMessage(null), 3000);
    } catch (err: any) {
      console.error('Failed to sign off briefing:', err);
      setSignoffMessage(err.message || 'Failed to authorize briefing');
    } finally {
      setIsSavingSignoff(false);
    }
  };

  // Filter queue by search query
  const filteredQueue = useMemo(() => {
    if (!searchQuery.trim()) return queue;
    const q = searchQuery.toLowerCase();
    return queue.filter(item => 
      item.patient_name.toLowerCase().includes(q) ||
      item.opd_reg_id.toLowerCase().includes(q) ||
      (item.chief_complaint && item.chief_complaint.toLowerCase().includes(q))
    );
  }, [queue, searchQuery]);

  // Triage count metrics
  const emergencyCount = useMemo(() => queue.filter(q => q.triage_level === 'EMERGENCY').length, [queue]);
  const urgentCount = useMemo(() => queue.filter(q => q.triage_level === 'HIGH_PRIORITY').length, [queue]);
  const routineCount = useMemo(() => queue.filter(q => q.triage_level === 'ROUTINE').length, [queue]);

  const triageColor = activeBriefing?.triage.triage_level === 'EMERGENCY' 
    ? '#ef4444' 
    : activeBriefing?.triage.triage_level === 'HIGH_PRIORITY' 
    ? '#f59e0b' 
    : '#10b981';

  return (
    <div className="w-full h-full flex flex-col lg:flex-row gap-5 p-2 lg:p-4 overflow-hidden" style={{ minHeight: '85vh' }}>
      {/* ========================================================================= */}
      {/* LEFT COLUMN: OPD Live Queue & Patient Selection Panel                     */}
      {/* ========================================================================= */}
      <aside className="w-full lg:w-96 flex-shrink-0 flex flex-col rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden" style={{ maxHeight: '90vh' }}>
        {/* Queue Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-100 text-primary-blue flex items-center justify-center font-bold">
                <Stethoscope size={18} />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">OPD Patient Queue</h2>
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Station 04 Live</span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => fetchQueue(triageFilter)}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-primary-blue hover:border-primary-blue transition-colors"
              title="Refresh Queue"
            >
              <RefreshCw size={15} className={loadingQueue ? 'animate-spin text-primary-blue' : ''} />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Search by name, OPD token..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-primary-blue focus:ring-1 focus:ring-primary-blue/20 transition-all text-slate-700"
            />
          </div>

          {/* Triage Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setTriageFilter('ALL')}
              className={`px-2.5 py-1 rounded-full font-bold whitespace-nowrap transition-all ${
                triageFilter === 'ALL'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              All ({queue.length})
            </button>
            <button
              onClick={() => setTriageFilter('EMERGENCY')}
              className={`px-2.5 py-1 rounded-full font-bold whitespace-nowrap transition-all ${
                triageFilter === 'EMERGENCY'
                  ? 'bg-red-600 text-white shadow-sm shadow-red-200'
                  : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
              }`}
            >
              🚨 Emergency ({emergencyCount})
            </button>
            <button
              onClick={() => setTriageFilter('HIGH_PRIORITY')}
              className={`px-2.5 py-1 rounded-full font-bold whitespace-nowrap transition-all ${
                triageFilter === 'HIGH_PRIORITY'
                  ? 'bg-amber-600 text-white shadow-sm shadow-amber-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              ⚠️ Urgent ({urgentCount})
            </button>
            <button
              onClick={() => setTriageFilter('ROUTINE')}
              className={`px-2.5 py-1 rounded-full font-bold whitespace-nowrap transition-all ${
                triageFilter === 'ROUTINE'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              ✅ Routine ({routineCount})
            </button>
          </div>
        </div>

        {/* Patient Queue Cards List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {loadingQueue && queue.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <RefreshCw size={20} className="animate-spin text-primary-blue" />
              <span>Fetching incoming OPD patients...</span>
            </div>
          ) : filteredQueue.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <User size={24} className="mx-auto mb-2 text-slate-300" />
              <span>No patients match this filter.</span>
            </div>
          ) : (
            filteredQueue.map((item) => {
              const isSelected = item.id === selectedBriefingId;
              const isEmergency = item.triage_level === 'EMERGENCY';
              const isUrgent = item.triage_level === 'HIGH_PRIORITY';
              const isReviewed = Boolean(item.reviewed_at);

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedBriefingId(item.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer relative group ${
                    isSelected
                      ? 'bg-sky-50/80 border-primary-blue ring-2 ring-primary-blue/30 shadow-md'
                      : 'bg-white border-slate-200/80 hover:border-sky-300 hover:bg-slate-50/60 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-primary-blue transition-colors">
                        {item.patient_name}
                      </h3>
                      <div className="text-[11px] font-mono font-semibold text-slate-500">
                        {item.opd_reg_id}
                      </div>
                    </div>

                    {/* Triage Badge */}
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      isEmergency
                        ? 'bg-red-100 text-red-700 border border-red-300 animate-pulse'
                        : isUrgent
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}>
                      {item.triage_level}
                    </span>
                  </div>

                  {/* Chief Complaint Preview */}
                  {item.chief_complaint && (
                    <p className="text-xs text-slate-600 line-clamp-2 mb-2 font-medium">
                      {item.chief_complaint}
                    </p>
                  )}

                  {/* Footer status */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                    </span>

                    {isReviewed ? (
                      <span className="flex items-center gap-1 text-emerald-600 font-bold">
                        <CheckCircle2 size={12} />
                        <span>Reviewed</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-600 font-medium">
                        <span>Awaiting Review</span>
                        <ChevronRight size={12} />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* RIGHT COLUMN: Full Pre-Consultation Clinical Intake Briefing Dossier      */}
      {/* ========================================================================= */}
      <main className="flex-1 flex flex-col rounded-2xl bg-white border border-slate-200 shadow-sm overflow-y-auto" style={{ maxHeight: '90vh' }}>
        {loadingBriefing ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 gap-3">
            <RefreshCw size={28} className="animate-spin text-primary-blue" />
            <p className="text-sm font-semibold">Loading structured clinical briefing...</p>
          </div>
        ) : !activeBriefing ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 gap-3">
            <Stethoscope size={36} className="text-slate-300" />
            <p className="text-base font-bold text-slate-600">No Patient Selected</p>
            <p className="text-xs text-slate-400">Select an intake session from the OPD patient queue on the left.</p>
          </div>
        ) : (
          <div className="clinician-report-container" style={{ padding: '28px 32px' }}>
            {/* Top Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Pre-Consultation Clinical Intake Briefing</span>
              </div>

              <div className="flex items-center gap-2.5">
                <button 
                  className="kiosk-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-sm"
                  onClick={handleCopyEMR}
                >
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  <span>{copied ? 'Copied EMR Text!' : 'Copy to EMR'}</span>
                </button>
                <button 
                  className="kiosk-btn kiosk-btn-primary flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-primary-blue text-white hover:bg-primary-blue/90 transition-colors shadow-sm shadow-sky-200"
                  onClick={handlePrint}
                >
                  <Printer size={14} />
                  <span>Print Briefing</span>
                </button>
              </div>
            </div>

            {/* Report Header Card */}
            <div className="report-header flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 mb-6 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2 text-pink-600 text-xs font-extrabold uppercase tracking-wider mb-1">
                  <Stethoscope size={16} />
                  <span>Autonomous Pre-Consultation Intake</span>
                </div>
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {activeBriefing.patient.name}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1.5">
                  <span>Age/Gender: <strong className="text-slate-800">{activeBriefing.patient.age} Yrs / {activeBriefing.patient.gender}</strong></span>
                  <span>•</span>
                  <span>OPD Token: <strong className="font-mono text-slate-800">{activeBriefing.patient.opdRegId}</strong></span>
                  <span>•</span>
                  <span>Timestamp: <strong className="text-slate-800">{activeBriefing.createdAt}</strong></span>
                </div>
              </div>

              {/* Triage Level Badge */}
              <div 
                className="rounded-xl p-3.5 text-right min-w-[200px] border-2"
                style={{
                  backgroundColor: activeBriefing.triage.triage_level === 'EMERGENCY' ? '#fef2f2' : activeBriefing.triage.triage_level === 'HIGH_PRIORITY' ? '#fffbeb' : '#f0fdf4',
                  borderColor: triageColor
                }}
              >
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Deterministic Triage Status
                </div>
                <div className="text-xl font-extrabold tracking-wide" style={{ color: triageColor }}>
                  {activeBriefing.triage.triage_level}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {activeBriefing.triage.triggeredRules.length} safety rules evaluated
                </div>
              </div>
            </div>

            {/* Deterministic Safety Reasoning Notice */}
            {activeBriefing.triage.triggeredRules.length > 0 && (
              <div 
                className="rounded-xl p-4 mb-6 border-l-4"
                style={{
                  backgroundColor: activeBriefing.triage.triage_level === 'EMERGENCY' ? '#fef2f2' : '#fffbeb',
                  borderLeftColor: triageColor,
                  borderRight: '1px solid rgba(0,0,0,0.05)',
                  borderTop: '1px solid rgba(0,0,0,0.05)',
                  borderBottom: '1px solid rgba(0,0,0,0.05)',
                }}
              >
                <div className="font-bold text-sm flex items-center gap-2" style={{ color: triageColor }}>
                  <AlertTriangle size={16} />
                  <span>Deterministic Safety Rule Triggers:</span>
                </div>
                <div className="text-xs font-semibold text-slate-800 mt-1">
                  {activeBriefing.triage.reason}
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  <strong>Recommended Clinical Action:</strong> {activeBriefing.triage.actionRequired}
                </div>
              </div>
            )}

            {/* Section 1: Chief Complaint & SOCRATES Matrix */}
            <div className="mb-7">
              <h2 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2 uppercase tracking-wider">
                <Activity size={16} className="text-pink-600" />
                <span>1. Chief Complaint & SOCRATES Pain/Symptom Matrix</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                <div className="sm:col-span-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Chief Complaint:</span>
                  <p className="font-bold text-sm text-slate-900 mt-0.5">{activeBriefing.chiefComplaint.primary}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Site (Location):</span>
                  <p className="font-semibold text-xs text-slate-800 mt-0.5">{activeBriefing.socrates.site || 'Unspecified'}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Onset & Duration:</span>
                  <p className="font-semibold text-xs text-slate-800 mt-0.5">{activeBriefing.socrates.onset || activeBriefing.chiefComplaint.duration || 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Character / Quality:</span>
                  <p className="font-semibold text-xs text-slate-800 mt-0.5">{activeBriefing.socrates.character || 'Not provided'}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Radiation:</span>
                  <p className={`font-semibold text-xs mt-0.5 ${activeBriefing.socrates.radiation?.includes('Arm') ? 'text-red-600 font-bold' : 'text-slate-800'}`}>
                    {activeBriefing.socrates.radiation || 'None reported'}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Severity (1-10):</span>
                  <p className={`font-bold text-xs mt-0.5 ${(activeBriefing.socrates.severity || 0) >= 8 ? 'text-red-600' : 'text-sky-600'}`}>
                    {activeBriefing.socrates.severity ? `${activeBriefing.socrates.severity} / 10` : 'Not rated'}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Exacerbating / Relieving:</span>
                  <p className="font-semibold text-xs text-slate-800 mt-0.5">{activeBriefing.socrates.exacerbatingFactors || 'None noted'}</p>
                </div>
                <div className="sm:col-span-2 lg:col-span-4">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Associated Symptoms:</span>
                  <p className="font-semibold text-xs text-slate-800 mt-0.5">
                    {activeBriefing.chiefComplaint.associatedSymptoms.length > 0
                      ? activeBriefing.chiefComplaint.associatedSymptoms.join(', ')
                      : 'None reported'}
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2: Chronic Conditions & Medical History */}
            <div className="mb-7">
              <h2 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2 uppercase tracking-wider">
                <UserCheck size={16} className="text-sky-600" />
                <span>2. Medical History & Chronic Conditions</span>
              </h2>

              <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
                {activeBriefing.chronicConditions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {activeBriefing.chronicConditions.map((cond, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 shadow-2xs">
                        {cond}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 font-medium">No chronic conditions declared by patient.</p>
                )}
              </div>
            </div>

            {/* Section 3: Reconciled Medications */}
            <div className="mb-7">
              <h2 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2 uppercase tracking-wider">
                <Pill size={16} className="text-sky-600" />
                <span>3. Reconciled Active Medications (From Prescriptions / Records)</span>
              </h2>

              {activeBriefing.activeMedications.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Medication Name</th>
                        <th className="p-2.5">Dosage</th>
                        <th className="p-2.5">Frequency & Timing</th>
                        <th className="p-2.5">Route</th>
                        <th className="p-2.5">Indication / Purpose</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeBriefing.activeMedications.map((med, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2.5 font-bold text-slate-900">{med.name}</td>
                          <td className="p-2.5 text-slate-700">{med.dosage}</td>
                          <td className="p-2.5 font-semibold text-emerald-700">{med.frequency}</td>
                          <td className="p-2.5 text-slate-600">{med.route || 'Oral'}</td>
                          <td className="p-2.5 text-slate-500">{med.indication || 'Chronic management'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 font-medium">
                  No active prescription medications recorded or extracted.
                </div>
              )}
            </div>

            {/* Section 4: Key Lab Values */}
            <div className="mb-7">
              <h2 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2 uppercase tracking-wider">
                <Activity size={16} className="text-purple-600" />
                <span>4. Extracted Lab Investigations & Biomarkers</span>
              </h2>

              {activeBriefing.abnormalLabs.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Investigation Name</th>
                        <th className="p-2.5">Result</th>
                        <th className="p-2.5">Reference Range</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeBriefing.abnormalLabs.map((lab, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2.5 font-semibold text-slate-800">{lab.test_name}</td>
                          <td className={`p-2.5 font-bold ${lab.status === 'CRITICAL' ? 'text-red-600' : 'text-slate-900'}`}>
                            {lab.result} {lab.reference_unit}
                          </td>
                          <td className="p-2.5 text-slate-500">{lab.normal_range || 'Standard'}</td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              lab.status === 'CRITICAL'
                                ? 'bg-red-100 text-red-700 border border-red-300'
                                : lab.status === 'HIGH'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            }`}>
                              {lab.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 font-medium">
                  No laboratory reports scanned or attached to this intake session.
                </div>
              )}
            </div>

            {/* Section 5: AYUSH Assessment (if active) */}
            {activeBriefing.isAyushActive && activeBriefing.ayushAssessment && (
              <div className="mb-7">
                <h2 className="text-sm font-extrabold text-emerald-700 mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <Leaf size={16} />
                  <span>5. AYUSH / Ayurvedic Intake (Dashavidha Pariksha)</span>
                </h2>

                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-700 uppercase">Deha Prakriti:</span>
                    <p className="font-bold text-xs text-emerald-950 mt-0.5">{activeBriefing.ayushAssessment.prakriti || 'Not assessed'}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-emerald-700 uppercase">Agni & Ahara Shakti:</span>
                    <p className="font-semibold text-xs text-emerald-950 mt-0.5">{activeBriefing.ayushAssessment.agniAharaShakti || 'Not assessed'}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-emerald-700 uppercase">Vyayama Shakti:</span>
                    <p className="font-semibold text-xs text-emerald-950 mt-0.5">{activeBriefing.ayushAssessment.vyayamaShakti || 'Not assessed'}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-emerald-700 uppercase">Satmya (Dietary Compatibility):</span>
                    <p className="font-semibold text-xs text-emerald-950 mt-0.5">{activeBriefing.ayushAssessment.satmya || 'Not assessed'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Clinician Review & Sign-Off Block */}
            <div className="bg-slate-50/90 rounded-2xl p-5 border-2 border-slate-200/90 shadow-sm mt-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck size={18} className="text-primary-blue" />
                  <span>Attending Clinician In-Person Assessment & Sign-Off</span>
                </h3>

                {signoffMessage && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md animate-fadeIn">
                    ✓ {signoffMessage}
                  </span>
                )}
              </div>

              <textarea
                placeholder="Attending physician clinical examination notes, provisional diagnosis, and prescription authorization plan..."
                value={clinicianNotes}
                onChange={(e) => setClinicianNotes(e.target.value)}
                className="w-full min-h-[90px] p-3 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20 transition-all resize-y mb-4"
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200">
                <div className="text-[11px] text-slate-500 font-mono">
                  Attending Physician Electronic Signature & Registration Audit Active
                </div>

                <button
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm ${
                    signedOff
                      ? 'bg-emerald-600 text-white shadow-emerald-200 hover:bg-emerald-700'
                      : 'bg-primary-blue text-white shadow-sky-200 hover:bg-primary-blue/90'
                  }`}
                  onClick={handleSignOff}
                  disabled={isSavingSignoff}
                >
                  {isSavingSignoff ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  <span>
                    {isSavingSignoff 
                      ? 'Saving to EMR...' 
                      : signedOff 
                      ? 'Reviewed & Authorized in EMR' 
                      : 'Sign-Off & Authorize'}
                  </span>
                </button>
              </div>
            </div>

            {/* Mandatory Clinical Disclaimer */}
            <div className="disclaimer-banner mt-6 p-3 rounded-xl bg-slate-100 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
              <strong>CLINICAL AI INTAKE MANDATE:</strong> PatientPilot is an autonomous pre-consultation clinical intake and triage assistant. It is strictly not a diagnostician or treating physician. It does not alter medications or recommend treatment plans. Physical verification, clinical correlation, and diagnostic judgment by a registered medical practitioner are mandatory under NMC guidelines.
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ClinicianDashboardView;

// Clinical types for PatientPilot OPD Portal Intake & Triage Agent

export type TriageLevel = 'EMERGENCY' | 'HIGH_PRIORITY' | 'ROUTINE';

export type LanguageCode =
  | 'en'   // English
  | 'hi'   // Hindi (हिन्दी)
  | 'bn'   // Bengali (বাংলা)
  | 'te'   // Telugu (తెలుగు)
  | 'mr'   // Marathi (मराठी)
  | 'ta'   // Tamil (தமிழ்)
  | 'ur'   // Urdu (اردو)
  | 'gu'   // Gujarati (ગુજરાતી)
  | 'kn'   // Kannada (ಕನ್ನಡ)
  | 'ml'   // Malayalam (മലയാളം)
  | 'or'   // Odia (ଓଡ଼ିଆ)
  | 'pa'   // Punjabi (ਪੰਜਾਬੀ)
  | 'as'   // Assamese (অসমীয়া)
  | 'mai'  // Maithili (मैथिली)
  | 'sat'  // Santali (ᱥᱟᱱᱛᱟᱲᱤ)
  | 'ks'   // Kashmiri (کٲشُر)
  | 'ne'   // Nepali (नेपाली)
  | 'kok'  // Konkani (कोंकणी)
  | 'sd'   // Sindhi (سنڌي)
  | 'doi'  // Dogri (डोगरी)
  | 'mni'  // Manipuri (মৈতৈলোন্)
  | 'brx'  // Bodo (बड़ो)
  | 'sa';  // Sanskrit (संस्कृतम्)


export interface PatientDemographics {
  name: string;
  age: number | string;
  gender: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  opdRegId: string;
  contactNumber?: string;
  vitals?: {
    bp?: string;
    pulse?: string;
    temperature?: string;
    spO2?: string;
  };
}

export interface SocratesHistory {
  site?: string;
  onset?: string;
  character?: string;
  radiation?: string;
  associations?: string[];
  timeDuration?: string;
  exacerbatingFactors?: string;
  relievingFactors?: string;
  severity?: number; // 1 - 10
}

export interface ExtractedMedication {
  name: string;
  dosage: string;
  frequency: string; // e.g., OD, BD, TDS, QID, PRN
  route?: string;
  duration?: string;
  indication?: string;
}

export interface ExtractedLabValue {
  test_name: string;
  result: string;
  reference_unit: string;
  normal_range?: string;
  status: 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL';
}

export interface DocumentExtraction {
  documentType: 'Prescription' | 'Lab Report' | 'Discharge Summary' | 'Other';
  fileName: string;
  extractedAt: string;
  medications: ExtractedMedication[];
  keyLabValues: ExtractedLabValue[];
  diagnosesOrPastProcedures: string[];
  rawSummary?: string;
}

export interface DashavidhaPariksha {
  prakriti?: 'Vata' | 'Pitta' | 'Kapha' | 'Vata-Pitta' | 'Pitta-Kapha' | 'Vata-Kapha' | 'Tridosha';
  agniAharaShakti?: 'Mandagni (Low/Sluggish)' | 'Tikshnagni (Sharp/Hyper)' | 'Vishamagni (Irregular)' | 'Samagni (Balanced)';
  vyayamaShakti?: 'Pravara (High Endurance)' | 'Madhyama (Moderate)' | 'Avara (Low/Easily Fatigued)';
  satmya?: string; // Dietary adaptability & habituation
  vaya?: 'Bala (Childhood)' | 'Madhyama (Youth/Adulthood)' | 'Vriddha (Elderly)';
  notes?: string;
}

export interface SafetyRuleTrigger {
  ruleId: string;
  ruleDescription: string;
  matchedCriteria: string[];
  level: TriageLevel;
}

export interface TriageResult {
  triage_level: TriageLevel;
  triggeredRules: SafetyRuleTrigger[];
  reason: string;
  actionRequired: string;
  evaluatedAt: string;
}

export interface ClinicianBriefing {
  id: string;
  createdAt: string;
  patient: PatientDemographics;
  chiefComplaint: {
    primary: string;
    onset: string;
    duration: string;
    associatedSymptoms: string[];
  };
  socrates: SocratesHistory;
  chronicConditions: string[];
  activeMedications: ExtractedMedication[];
  abnormalLabs: ExtractedLabValue[];
  ayushAssessment?: DashavidhaPariksha;
  triage: TriageResult;
  isAyushActive: boolean;
  clinicianNotes?: string;
  fhirJson?: any;
}

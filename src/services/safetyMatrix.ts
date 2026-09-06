// Deterministic Red-Flag Safety Matrix for PatientPilot
// Strict safety boundary enforcement as specified in AGENT SPECIFICATION

import { TriageLevel, TriageResult, SafetyRuleTrigger, SocratesHistory } from '../types/clinical';

export interface SymptomEvaluationInput {
  chiefComplaint: string;
  socrates: SocratesHistory;
  associatedSymptoms: string[];
  vitalSigns?: {
    bp?: string;
    pulse?: string;
    temperature?: string;
    spO2?: string;
  };
}

export function evaluateDeterministicSafety(input: SymptomEvaluationInput): TriageResult {
  const triggeredRules: SafetyRuleTrigger[] = [];
  const textPool = [
    input.chiefComplaint,
    input.socrates.site || '',
    input.socrates.character || '',
    input.socrates.radiation || '',
    input.socrates.onset || '',
    input.socrates.timeDuration || '',
    ...(input.associatedSymptoms || []),
  ].join(' ').toLowerCase();

  // Helper matching
  const has = (terms: string[]) => terms.some(term => textPool.includes(term.toLowerCase()));

  // 1. CARDIAC RED FLAG:
  // IF (chest_pain AND (dyspnea OR radiation_to_arm_or_jaw)) -> EMERGENCY
  const hasChestPain = has([
    'chest pain', 'chest tightness', 'chest pressure', 'heavy chest', 
    'angina', 'crushing chest', 'heart pain', 'chhati me dard', 'chhati dard', 'buke betha'
  ]);
  const hasDyspnea = has([
    'dyspnea', 'shortness of breath', 'breathlessness', 'difficulty breathing', 
    'gasping', 'cant breathe', 'saans lene me taklif', 'dom bondho'
  ]);
  const hasRadiation = has([
    'left arm', 'arm', 'jaw', 'neck', 'shoulder', 'back', 'radiation to arm', 'radiation to jaw'
  ]);

  if (hasChestPain && (hasDyspnea || hasRadiation)) {
    triggeredRules.push({
      ruleId: 'RULE_ACS_01',
      ruleDescription: 'Suspected Acute Coronary Syndrome (Chest pain with dyspnea and/or radiation)',
      matchedCriteria: [
        'Chest Pain / Tightness',
        hasDyspnea ? 'Dyspnea / Breathlessness' : '',
        hasRadiation ? 'Radiation to arm/jaw/shoulder' : ''
      ].filter(Boolean),
      level: 'EMERGENCY'
    });
  }

  // 2. NEUROLOGICAL ACUTE DEFICIT (STROKE / FAST):
  // ELIF (sudden_weakness OR facial_droop OR slurred_speech) -> EMERGENCY
  const hasSuddenWeakness = has([
    'sudden weakness', 'unilateral weakness', 'arm weakness', 'leg weakness', 
    'one side weak', 'loss of power', 'paralysis', 'kamzori sudden', 'adho ongo'
  ]);
  const hasFacialDroop = has([
    'facial droop', 'face drooping', 'crooked smile', 'face numbness', 'droop'
  ]);
  const hasSlurredSpeech = has([
    'slurred speech', 'slurring', 'unable to speak', 'difficulty speaking', 
    'bolne me taklif', 'kotha bolte na para', 'aphasia'
  ]);

  if (hasSuddenWeakness || hasFacialDroop || hasSlurredSpeech) {
    triggeredRules.push({
      ruleId: 'RULE_STROKE_02',
      ruleDescription: 'Suspected Acute Neurological Deficit (Sudden weakness, facial droop, or slurred speech)',
      matchedCriteria: [
        hasSuddenWeakness ? 'Sudden Unilateral Weakness' : '',
        hasFacialDroop ? 'Facial Drooping' : '',
        hasSlurredSpeech ? 'Slurred or Lost Speech' : ''
      ].filter(Boolean),
      level: 'EMERGENCY'
    });
  }

  // 3. AIRWAY / RESPIRATORY STRIDOR & CHOKING:
  const hasAirwayCompromise = has([
    'stridor', 'choking', 'throat closing', 'gasping for air', 'cyanosis', 'blue lips', 'severe wheeze'
  ]);
  if (hasAirwayCompromise) {
    triggeredRules.push({
      ruleId: 'RULE_AIRWAY_03',
      ruleDescription: 'Acute Stridor / Severe Airway Obstruction',
      matchedCriteria: ['Stridor or Acute Choking / Cyanosis'],
      level: 'EMERGENCY'
    });
  }

  // 4. SUDDEN SEVERE "THUNDERCLAP" HEADACHE:
  const hasThunderclapHeadache = has([
    'thunderclap', 'worst headache of life', 'sudden severe headache', 'explosive headache', 'sudden intense head pain'
  ]);
  if (hasThunderclapHeadache) {
    triggeredRules.push({
      ruleId: 'RULE_SAH_04',
      ruleDescription: 'Suspected Subarachnoid Hemorrhage (Sudden severe "thunderclap" headache)',
      matchedCriteria: ['Worst sudden onset headache'],
      level: 'EMERGENCY'
    });
  }

  // 5. MENINGEAL / CNS INFECTION RED FLAG:
  // ELIF (high_fever AND neck_stiffness) -> HIGH_PRIORITY
  const hasHighFever = has([
    'high fever', 'severe fever', '103', '104', 'shivering fever', 'high grade fever', 'tez bukhar', 'jor'
  ]);
  const hasNeckStiffness = has([
    'neck stiffness', 'stiff neck', 'cannot bend neck', 'gardan akdan', 'neck rigid', 'neck with stiffness', 'stiffness'
  ]);

  if (hasHighFever && hasNeckStiffness) {
    triggeredRules.push({
      ruleId: 'RULE_MENINGISM_05',
      ruleDescription: 'Suspected Meningeal Irritation (High fever with neck stiffness)',
      matchedCriteria: ['High-Grade Fever', 'Nuchal Rigidity / Stiff Neck'],
      level: 'HIGH_PRIORITY'
    });
  }

  // 6. SEVERE PAIN WITH HIGH ACUITY (e.g. pain scale 9-10 with acute onset)
  if (input.socrates.severity && input.socrates.severity >= 9 && !triggeredRules.some(r => r.level === 'EMERGENCY')) {
    triggeredRules.push({
      ruleId: 'RULE_ACUTE_PAIN_06',
      ruleDescription: 'Intractable Acute Pain (Rated 9/10 or 10/10)',
      matchedCriteria: [`Severity score ${input.socrates.severity}/10`],
      level: 'HIGH_PRIORITY'
    });
  }

  // Determine highest priority level
  let finalLevel: TriageLevel = 'ROUTINE';
  if (triggeredRules.some(r => r.level === 'EMERGENCY')) {
    finalLevel = 'EMERGENCY';
  } else if (triggeredRules.some(r => r.level === 'HIGH_PRIORITY')) {
    finalLevel = 'HIGH_PRIORITY';
  }

  // Actions and Reasons
  let reason = 'Routine intake evaluated. Standard OPD consultation recommended.';
  let actionRequired = 'Proceed through standard queue for doctor consultation.';

  if (finalLevel === 'EMERGENCY') {
    reason = `Critical Red-Flag Identified: ${triggeredRules.filter(r => r.level === 'EMERGENCY').map(r => r.ruleDescription).join('; ')}`;
    actionRequired = 'IMMEDIATE CLINICAL ESCALATION REQUIRED. Transfer patient immediately to Resuscitation / Emergency Triage Room. Alert on-duty physician & nurse immediately.';
  } else if (finalLevel === 'HIGH_PRIORITY') {
    reason = `High-Priority Clinical Marker Identified: ${triggeredRules.map(r => r.ruleDescription).join('; ')}`;
    actionRequired = 'Fast-track OPD queue. Escort patient to priority evaluation bay within 15 minutes.';
  }

  return {
    triage_level: finalLevel,
    triggeredRules,
    reason,
    actionRequired,
    evaluatedAt: new Date().toISOString()
  };
}

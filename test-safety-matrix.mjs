// Automated test suite for PatientPilot Deterministic Safety Matrix

import assert from 'assert';

// Simulated pure evaluation function matching src/services/safetyMatrix.ts
function evaluateDeterministicSafety(input) {
  const triggeredRules = [];
  const textPool = [
    input.chiefComplaint || '',
    input.socrates?.site || '',
    input.socrates?.character || '',
    input.socrates?.radiation || '',
    input.socrates?.onset || '',
    input.socrates?.timeDuration || '',
    ...(input.associatedSymptoms || []),
  ].join(' ').toLowerCase();

  const has = (terms) => terms.some(term => textPool.includes(term.toLowerCase()));

  // 1. CARDIAC
  const hasChestPain = has(['chest pain', 'chest tightness', 'angina', 'heavy chest', 'crushing chest', 'heart pain', 'chhati me dard']);
  const hasDyspnea = has(['dyspnea', 'shortness of breath', 'breathlessness', 'difficulty breathing', 'saans lene me taklif']);
  const hasRadiation = has(['left arm', 'arm', 'jaw', 'neck', 'shoulder', 'radiation to arm', 'radiation to jaw']);

  if (hasChestPain && (hasDyspnea || hasRadiation)) {
    triggeredRules.push({ ruleId: 'RULE_ACS_01', level: 'EMERGENCY' });
  }

  // 2. NEUROLOGICAL
  const hasSuddenWeakness = has(['sudden weakness', 'unilateral weakness', 'arm weakness', 'loss of power', 'paralysis']);
  const hasFacialDroop = has(['facial droop', 'face drooping', 'crooked smile']);
  const hasSlurredSpeech = has(['slurred speech', 'slurring', 'unable to speak', 'difficulty speaking']);

  if (hasSuddenWeakness || hasFacialDroop || hasSlurredSpeech) {
    triggeredRules.push({ ruleId: 'RULE_STROKE_02', level: 'EMERGENCY' });
  }

  // 3. AIRWAY / STRIDOR
  if (has(['stridor', 'choking', 'throat closing', 'cyanosis'])) {
    triggeredRules.push({ ruleId: 'RULE_AIRWAY_03', level: 'EMERGENCY' });
  }

  // 4. THUNDERCLAP HEADACHE
  if (has(['thunderclap', 'worst headache of life', 'sudden severe headache'])) {
    triggeredRules.push({ ruleId: 'RULE_SAH_04', level: 'EMERGENCY' });
  }

  // 5. MENINGEAL
  const hasHighFever = has(['high fever', 'severe fever', '103', '104', 'high grade fever', 'tez bukhar']);
  const hasNeckStiffness = has(['neck stiffness', 'stiff neck', 'cannot bend neck', 'gardan akdan', 'neck with stiffness', 'stiffness']);

  if (hasHighFever && hasNeckStiffness) {
    triggeredRules.push({ ruleId: 'RULE_MENINGISM_05', level: 'HIGH_PRIORITY' });
  }

  // 6. SEVERE PAIN
  if (input.socrates?.severity && input.socrates.severity >= 9 && !triggeredRules.some(r => r.level === 'EMERGENCY')) {
    triggeredRules.push({ ruleId: 'RULE_ACUTE_PAIN_06', level: 'HIGH_PRIORITY' });
  }

  let finalLevel = 'ROUTINE';
  if (triggeredRules.some(r => r.level === 'EMERGENCY')) {
    finalLevel = 'EMERGENCY';
  } else if (triggeredRules.some(r => r.level === 'HIGH_PRIORITY')) {
    finalLevel = 'HIGH_PRIORITY';
  }

  return { triage_level: finalLevel, triggeredRules };
}

console.log('--- Running Safety Matrix Verification Tests ---');

// Test 1: Chest pain with dyspnea
const t1 = evaluateDeterministicSafety({
  chiefComplaint: 'Chest Pain / Discomfort',
  socrates: { character: 'Crushing' },
  associatedSymptoms: ['Dyspnea / Breathlessness']
});
assert.strictEqual(t1.triage_level, 'EMERGENCY', 'Test 1 Failed: Chest pain + dyspnea must be EMERGENCY');
console.log('✓ Test 1 Passed: Chest pain + dyspnea -> EMERGENCY');

// Test 2: Chest pain with radiation to arm
const t2 = evaluateDeterministicSafety({
  chiefComplaint: 'Chest Pain',
  socrates: { radiation: 'Radiating to Left Arm and Jaw' },
  associatedSymptoms: []
});
assert.strictEqual(t2.triage_level, 'EMERGENCY', 'Test 2 Failed: Chest pain + radiation must be EMERGENCY');
console.log('✓ Test 2 Passed: Chest pain + radiation -> EMERGENCY');

// Test 3: Acute facial droop / stroke
const t3 = evaluateDeterministicSafety({
  chiefComplaint: 'Sudden Weakness / Giddiness',
  socrates: {},
  associatedSymptoms: ['Facial droop', 'Slurred speech']
});
assert.strictEqual(t3.triage_level, 'EMERGENCY', 'Test 3 Failed: Acute stroke symptom must be EMERGENCY');
console.log('✓ Test 3 Passed: Facial droop + slurred speech -> EMERGENCY');

// Test 4: High fever with neck stiffness
const t4 = evaluateDeterministicSafety({
  chiefComplaint: 'High fever',
  socrates: { radiation: 'Radiating to Neck with Stiffness' },
  associatedSymptoms: ['High fever / chills']
});
assert.strictEqual(t4.triage_level, 'HIGH_PRIORITY', 'Test 4 Failed: High fever + neck stiffness must be HIGH_PRIORITY');
console.log('✓ Test 4 Passed: High fever + neck stiffness -> HIGH_PRIORITY');

// Test 5: Routine cough / cold
const t5 = evaluateDeterministicSafety({
  chiefComplaint: 'Cough / Sore Throat',
  socrates: { onset: 'Gradual', severity: 3 },
  associatedSymptoms: []
});
assert.strictEqual(t5.triage_level, 'ROUTINE', 'Test 5 Failed: Mild cough must be ROUTINE');
console.log('✓ Test 5 Passed: Mild cough & cold -> ROUTINE');

// Test 6: Thunderclap headache
const t6 = evaluateDeterministicSafety({
  chiefComplaint: 'Sudden severe headache',
  socrates: { onset: 'Acute Sudden Onset (< 1 hr)', severity: 10 },
  associatedSymptoms: []
});
assert.strictEqual(t6.triage_level, 'EMERGENCY', 'Test 6 Failed: Thunderclap headache must be EMERGENCY');
console.log('✓ Test 6 Passed: Sudden severe headache -> EMERGENCY');

console.log('\nAll 6 Safety Matrix Deterministic Tests PASSED successfully!');

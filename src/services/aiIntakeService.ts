// AI Clinical Intake Service
// Integrates Google GenAI (Gemini 2.5 Flash) with backend FastAPI proxy fallback
// and intelligent deterministic clinical entity extraction for voice & text inputs.

import { GoogleGenAI } from '@google/genai';
import { 
  LanguageCode, 
  SocratesHistory, 
  PatientDemographics, 
  TriageResult 
} from '../types/clinical';
import { evaluateDeterministicSafety } from './safetyMatrix';
import { apiClient } from './apiClient';

export interface AIIntakeExtractionResult {
  agentMessage: string;
  localizedMessage: string;
  language: LanguageCode;
  extractedComplaint?: string;
  extractedSocratesDelta: Partial<SocratesHistory>;
  extractedSymptoms: string[];
  extractedConditions: string[];
  extractedDemographics?: Partial<PatientDemographics>;
  suggestedOptions: string[];
  isEmergency: boolean;
  emergencyReason?: string;
  nextRecommendedPhase?: 'demographics' | 'chief_complaint' | 'socrates' | 'chronic' | 'ayush' | 'review';
}

export interface AIIntakeRequestParams {
  userMessage: string;
  language: LanguageCode;
  currentPhase: string;
  currentComplaint: string;
  currentSocrates: SocratesHistory;
  currentAssociatedSymptoms: string[];
  currentChronicConditions: string[];
  currentDemographics: PatientDemographics;
  geminiApiKey?: string;
}

/**
 * Main AI reasoning coordinator for patient voice & text inputs.
 */
export async function analyzePatientInputWithAI(
  params: AIIntakeRequestParams
): Promise<AIIntakeExtractionResult> {
  const {
    userMessage,
    language,
    currentPhase,
    currentComplaint,
    currentSocrates,
    currentAssociatedSymptoms,
    currentChronicConditions,
    currentDemographics,
    geminiApiKey
  } = params;

  // 1. Evaluate deterministic red-flag safety matrix immediately
  const safetyCheck = evaluateDeterministicSafety({
    chiefComplaint: currentComplaint || userMessage,
    socrates: currentSocrates,
    associatedSymptoms: [...currentAssociatedSymptoms, userMessage]
  });
  const isEmergency = safetyCheck.triage_level === 'EMERGENCY';

  // 2. Resolve Gemini API key from props, vite env, or localStorage
  const resolvedApiKey = (
    geminiApiKey ||
    ((import.meta as any).env?.VITE_GEMINI_API_KEY) ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('PATIENTPILOT_GEMINI_API_KEY')) ||
    ''
  ).trim();

  // 3. Attempt Gemini API reasoning if key is available
  if (resolvedApiKey) {
    try {
      const geminiResult = await executeGeminiAI(resolvedApiKey, params, safetyCheck);
      if (geminiResult) {
        return geminiResult;
      }
    } catch (err) {
      console.warn('Gemini direct API call failed, attempting backend or local fallback:', err);
    }
  }

  // 4. Attempt backend FastAPI /api/v1/intake/chat endpoint
  try {
    const backendRes = await apiClient.chatIntake({
      user_message: userMessage,
      language: language,
      current_step_id: currentPhase,
      extracted_socrates: currentSocrates
    });

    if (backendRes && backendRes.agent_message) {
      // Parse local entity delta to enrich backend response
      const localDelta = extractClinicalEntitiesLocally(userMessage, currentComplaint);
      return {
        agentMessage: backendRes.agent_message,
        localizedMessage: backendRes.localized_message || backendRes.agent_message,
        language: language,
        extractedComplaint: localDelta.extractedComplaint,
        extractedSocratesDelta: {
          ...(backendRes.extracted_socrates_delta || {}),
          ...localDelta.extractedSocratesDelta
        },
        extractedSymptoms: localDelta.extractedSymptoms,
        extractedConditions: localDelta.extractedConditions,
        extractedDemographics: localDelta.extractedDemographics,
        suggestedOptions: backendRes.suggested_options?.length 
          ? backendRes.suggested_options 
          : localDelta.suggestedOptions,
        isEmergency: backendRes.is_emergency || isEmergency,
        emergencyReason: isEmergency ? (safetyCheck.triggeredRules[0]?.ruleDescription || 'Critical Red-Flag') : undefined,
        nextRecommendedPhase: localDelta.nextRecommendedPhase
      };
    }
  } catch (err) {
    console.warn('Backend chatIntake failed or offline, using local clinical NLP fallback:', err);
  }

  // 5. High-precision Deterministic Clinical NLP Fallback
  return generateDeterministicLocalAIResponse(params, safetyCheck);
}

/**
 * Calls Google GenAI (Gemini 2.5 Flash) with structured clinical entity extraction schema.
 */
async function executeGeminiAI(
  apiKey: string,
  params: AIIntakeRequestParams,
  safetyCheck: TriageResult
): Promise<AIIntakeExtractionResult | null> {
  const ai = new GoogleGenAI({ apiKey });
  const { userMessage, language, currentPhase, currentComplaint, currentSocrates } = params;

  const prompt = `You are the PatientPilot Clinical AI Triage Physician at an OPD hospital kiosk.
A patient has communicated the following input in natural language (Voice transcript or typed):
"${userMessage}"

Context:
- Current Intake Phase: ${currentPhase}
- Current Stated Complaint: ${currentComplaint || 'None yet'}
- Patient Selected Language: ${language}
- Current SOCRATES State: ${JSON.stringify(currentSocrates)}

Your clinical objective:
1. Provide an empathetic, clear, doctor-grade acknowledgment and ask the next most important clinical follow-up question.
2. Provide the response in English ('agentMessage') AND accurately localized into the patient's language ('localizedMessage').
3. Extract any newly identified clinical entities from the message:
   - Chief complaint (e.g. Chest Pain, Shortness of Breath, Severe Headache, Fever, Abdominal Pain)
   - SOCRATES parameters:
     - site: anatomical location
     - onset: duration or suddenness (e.g. Acute < 2 hours, 3 days ago)
     - character: sensation (e.g. Crushing heavy pressure, Sharp stabbing, Dull throbbing)
     - radiation: spread to other areas (e.g. Left arm, Jaw, Back)
     - associations: list of concurrent symptoms (e.g. Sweating, Nausea, Breathlessness)
     - severity: integer 1-10 if mentioned or implied
   - Any past chronic diseases mentioned (e.g. Hypertension, Diabetes, Asthma)
   - Any patient demographics mentioned (e.g. name, age, gender)
4. Provide 3-4 concise, high-value quick-select options chips for the kiosk touch screen.

Respond ONLY with a valid JSON object matching this schema without markdown code blocks or backticks:
{
  "agentMessage": "string",
  "localizedMessage": "string",
  "extractedComplaint": "string or null",
  "extractedSocratesDelta": {
    "site": "string or null",
    "onset": "string or null",
    "character": "string or null",
    "radiation": "string or null",
    "associations": ["string"],
    "severity": 1-10 or null
  },
  "extractedSymptoms": ["string"],
  "extractedConditions": ["string"],
  "extractedDemographics": {
    "name": "string or null",
    "age": number or null,
    "gender": "Male | Female | Other or null"
  },
  "suggestedOptions": ["option 1", "option 2", "option 3", "option 4"],
  "isEmergency": boolean,
  "nextRecommendedPhase": "socrates | chronic | review"
}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      temperature: 0.1
    }
  });

  const responseText = response.text || '';
  const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleanJson);

  // Merge with deterministic safety check
  const isEmergency = safetyCheck.triage_level === 'EMERGENCY' || parsed.isEmergency === true;

  return {
    agentMessage: parsed.agentMessage || 'Thank you for providing your symptoms. Let us proceed with your evaluation.',
    localizedMessage: parsed.localizedMessage || parsed.agentMessage,
    language: language,
    extractedComplaint: parsed.extractedComplaint || undefined,
    extractedSocratesDelta: {
      ...(parsed.extractedSocratesDelta?.site ? { site: parsed.extractedSocratesDelta.site } : {}),
      ...(parsed.extractedSocratesDelta?.onset ? { onset: parsed.extractedSocratesDelta.onset } : {}),
      ...(parsed.extractedSocratesDelta?.character ? { character: parsed.extractedSocratesDelta.character } : {}),
      ...(parsed.extractedSocratesDelta?.radiation ? { radiation: parsed.extractedSocratesDelta.radiation } : {}),
      ...(parsed.extractedSocratesDelta?.associations?.length ? { associations: parsed.extractedSocratesDelta.associations } : {}),
      ...(typeof parsed.extractedSocratesDelta?.severity === 'number' ? { severity: parsed.extractedSocratesDelta.severity } : {})
    },
    extractedSymptoms: parsed.extractedSymptoms || [],
    extractedConditions: parsed.extractedConditions || [],
    extractedDemographics: parsed.extractedDemographics?.name || parsed.extractedDemographics?.age ? {
      ...(parsed.extractedDemographics.name ? { name: parsed.extractedDemographics.name } : {}),
      ...(parsed.extractedDemographics.age ? { age: Number(parsed.extractedDemographics.age) } : {}),
      ...(parsed.extractedDemographics.gender ? { gender: parsed.extractedDemographics.gender } : {})
    } : undefined,
    suggestedOptions: parsed.suggestedOptions?.length ? parsed.suggestedOptions : ['Yes, exactly', 'No, different', 'Unsure'],
    isEmergency: isEmergency,
    emergencyReason: isEmergency ? (safetyCheck.triggeredRules[0]?.ruleDescription || 'Critical Symptoms Detected') : undefined,
    nextRecommendedPhase: parsed.nextRecommendedPhase || 'socrates'
  };
}

/**
 * Intelligent local clinical entity extractor using keyword analysis and regex patterns.
 */
function extractClinicalEntitiesLocally(
  text: string,
  existingComplaint: string
): {
  extractedComplaint?: string;
  extractedSocratesDelta: Partial<SocratesHistory>;
  extractedSymptoms: string[];
  extractedConditions: string[];
  extractedDemographics?: Partial<PatientDemographics>;
  suggestedOptions: string[];
  nextRecommendedPhase?: 'socrates' | 'chronic' | 'review';
} {
  const lower = text.toLowerCase();
  const delta: Partial<SocratesHistory> = {};
  const symptoms: string[] = [];
  const conditions: string[] = [];
  let complaint: string | undefined = undefined;
  let demographics: Partial<PatientDemographics> | undefined = undefined;

  // 1. Complaint Identification
  if (lower.includes('chest pain') || lower.includes('heart pain') || lower.includes('chhati') || lower.includes('seene') || lower.includes('सीने में दर्द') || lower.includes('छाती')) {
    complaint = 'Chest Pain / Discomfort';
    delta.site = 'Central Chest (Retrosternal)';
  } else if (lower.includes('breath') || lower.includes('dyspnea') || lower.includes('saans') || lower.includes('सांस लेने में तकलीफ') || lower.includes('सांस फूलना')) {
    complaint = 'Shortness of Breath (Dyspnea)';
    delta.site = 'Respiratory Tract & Lungs';
  } else if (lower.includes('headache') || lower.includes('migraine') || lower.includes('sar dard') || lower.includes('sir dard') || lower.includes('सिर दर्द')) {
    complaint = 'Severe Acute Headache';
    delta.site = 'Frontal & Temporal Cranial';
  } else if (lower.includes('fever') || lower.includes('bukhar') || lower.includes('bukhaar') || lower.includes('chills') || lower.includes('बुखार')) {
    complaint = 'High Fever with Chills';
    delta.site = 'Systemic Febrile';
  } else if (lower.includes('stomach') || lower.includes('abdomen') || lower.includes('belly') || lower.includes('pet dard') || lower.includes('पेट दर्द')) {
    complaint = 'Acute Abdominal Pain';
    delta.site = 'Epigastric / Abdominal';
  } else if (lower.includes('cough') || lower.includes('khansi') || lower.includes('khaansi') || lower.includes('खांसी')) {
    complaint = 'Persistent Productive Cough';
    delta.site = 'Respiratory Tract & Lungs';
  }

  // 2. Character Extraction
  if (lower.includes('crushing') || lower.includes('heavy') || lower.includes('pressure') || lower.includes('tightness') || lower.includes('दबाव') || lower.includes('bojh')) {
    delta.character = 'Crushing Heavy Pressure';
  } else if (lower.includes('sharp') || lower.includes('stabbing') || lower.includes('चुभन') || lower.includes('chubhan')) {
    delta.character = 'Sharp Stabbing';
  } else if (lower.includes('burning') || lower.includes('acid') || lower.includes('जलन') || lower.includes('jalan')) {
    delta.character = 'Burning Acidity';
  } else if (lower.includes('dull') || lower.includes('aching') || lower.includes('meetha dard')) {
    delta.character = 'Dull Continuous Ache';
  } else if (lower.includes('throbbing') || lower.includes('pulsing')) {
    delta.character = 'Throbbing Pulsatile';
  }

  // 3. Radiation Extraction
  if (lower.includes('left arm') || lower.includes('left shoulder') || lower.includes('baye hath') || lower.includes('baayein hath') || lower.includes('बाएं हाथ')) {
    delta.radiation = 'Radiates to Left Arm / Shoulder';
  } else if (lower.includes('jaw') || lower.includes('teeth') || lower.includes('jabda') || lower.includes('जबड़ा')) {
    delta.radiation = 'Radiates to Lower Jaw & Neck';
  } else if (lower.includes('back') || lower.includes('scapula') || lower.includes('peeth') || lower.includes('पीठ')) {
    delta.radiation = 'Radiates straight through to Back';
  }

  // 4. Onset & Timing
  if (lower.includes('sudden') || lower.includes('acute') || lower.includes('achanak') || lower.includes('अचानक')) {
    delta.onset = 'Acute Sudden Onset (< 1 hr)';
  } else if (lower.includes('morning') || lower.includes('2 hour') || lower.includes('ghante') || lower.includes('दो घंटे')) {
    delta.onset = 'Within past 2 - 4 hours';
  } else if (lower.includes('days') || lower.includes('din se') || lower.includes('din') || lower.includes('दिन से') || lower.includes('week')) {
    delta.onset = 'Subacute (Days to Weeks)';
  }

  // 5. Associated Symptoms
  if (lower.includes('sweat') || lower.includes('perspiration') || lower.includes('pasina') || lower.includes('पसीना')) {
    symptoms.push('Diaphoresis (Profuse Cold Sweating)');
  }
  if (lower.includes('nausea') || lower.includes('vomit') || lower.includes('ulti') || lower.includes('उल्टी') || lower.includes('मतली')) {
    symptoms.push('Nausea / Vomiting');
  }
  if (lower.includes('dizzy') || lower.includes('lightheaded') || lower.includes('chakkar') || lower.includes('चक्कर')) {
    symptoms.push('Dizziness / Presyncope');
  }
  if (lower.includes('palpitation') || lower.includes('racing heart') || lower.includes('dhadkan') || lower.includes('धड़कन')) {
    symptoms.push('Cardiac Palpitations');
  }
  if (lower.includes('throat') || lower.includes('gala') || lower.includes('gale')) {
    symptoms.push('Sore Throat / Pharyngitis');
  }
  if (lower.includes('khansi') || lower.includes('cough') || lower.includes('खांसी')) {
    symptoms.push('Productive Cough');
  }
  if (symptoms.length > 0) {
    delta.associations = symptoms;
  }

  // 6. Severity Detection (1-10)
  const severityMatch = lower.match(/(?:severity|pain|scale)\s*(?:of|is|level|:)?\s*(\d{1,2})/i) ||
                        lower.match(/(\d{1,2})\s*(?:\/|out of)\s*10/i);
  if (severityMatch && severityMatch[1]) {
    const val = parseInt(severityMatch[1], 10);
    if (val >= 1 && val <= 10) delta.severity = val;
  } else if (lower.includes('unbearable') || lower.includes('worst pain') || lower.includes('extreme') || lower.includes('asahniya')) {
    delta.severity = 9;
  } else if (lower.includes('severe') || lower.includes('tez') || lower.includes('bahut tez') || lower.includes('बहुत तेज')) {
    delta.severity = 8;
  } else if (lower.includes('moderate') || lower.includes('medium')) {
    delta.severity = 5;
  } else if (lower.includes('mild') || lower.includes('slight') || lower.includes('halka') || lower.includes('हल्का')) {
    delta.severity = 3;
  }

  // 7. Chronic Conditions Detection
  if (lower.includes('bp') || lower.includes('hypertension') || lower.includes('blood pressure')) {
    conditions.push('High Blood Pressure (Hypertension)');
  }
  if (lower.includes('sugar') || lower.includes('diabetes') || lower.includes('मधुमेह')) {
    conditions.push('Type 2 Diabetes Mellitus');
  }
  if (lower.includes('asthma') || lower.includes('dama') || lower.includes('दमा')) {
    conditions.push('Bronchial Asthma');
  }
  if (lower.includes('thyroid')) {
    conditions.push('Hypothyroidism');
  }

  // 8. Demographics detection
  const nameMatch = text.match(/(?:my name is|i am|i'm|मेरा नाम)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  const ageMatch = text.match(/(?:age|aged|years old|साल का|साल की)\s*(\d{1,3})/i) ||
                   text.match(/(\d{1,3})\s*(?:years old|साल)/i);
  if (nameMatch || ageMatch) {
    demographics = {
      ...(nameMatch ? { name: nameMatch[1].trim() } : {}),
      ...(ageMatch ? { age: parseInt(ageMatch[1], 10) } : {})
    };
  }

  // Determine suggested next options
  const suggestedOptions: string[] = [];
  if (complaint || existingComplaint) {
    if (!delta.severity) suggestedOptions.push('Severity: 8/10 (Severe)', 'Severity: 5/10 (Moderate)');
    if (!delta.radiation) suggestedOptions.push('Radiates to Left Arm', 'No radiation');
    if (!delta.character) suggestedOptions.push('Crushing heavy pressure', 'Sharp stabbing pain');
  } else {
    suggestedOptions.push('Chest Pain / Discomfort', 'Shortness of Breath', 'Severe Headache', 'High Fever');
  }

  return {
    extractedComplaint: complaint,
    extractedSocratesDelta: delta,
    extractedSymptoms: symptoms,
    extractedConditions: conditions,
    extractedDemographics: demographics,
    suggestedOptions,
    nextRecommendedPhase: complaint ? 'socrates' : undefined
  };
}

/**
 * Generates local empathetic AI responses formatted across all supported Indian languages.
 */
function generateDeterministicLocalAIResponse(
  params: AIIntakeRequestParams,
  safetyCheck: TriageResult
): AIIntakeExtractionResult {
  const { userMessage, language, currentComplaint } = params;
  const localDelta = extractClinicalEntitiesLocally(userMessage, currentComplaint);
  const isEmergency = safetyCheck.triage_level === 'EMERGENCY';

  let agentEn = '';
  let agentLoc = '';

  if (isEmergency) {
    agentEn = `CRITICAL ALERT: The symptoms you described indicate potential medical emergency triage criteria (${safetyCheck.triggeredRules[0]?.ruleDescription || 'Cardiovascular / Red-Flag'}). Healthcare staff have been notified. Please sit down and remain calm.`;
    agentLoc = language === 'hi'
      ? `आपातकालीन चेतावनी: आपके बताए गए लक्षण तुरंत चिकित्सा सहायता की आवश्यकता दर्शाते हैं (${safetyCheck.triggeredRules[0]?.ruleDescription || 'आपातकालीन रेड-फ्लैग'})। कृपया शांत रहें, स्टाफ को सूचित कर दिया गया है।`
      : agentEn;
  } else if (localDelta.extractedComplaint) {
    agentEn = `I have recorded your chief complaint as "${localDelta.extractedComplaint}". To assist your doctor, could you describe the exact feeling and whether it radiates to other parts of your body?`;
    agentLoc = language === 'hi'
      ? `मैंने आपकी मुख्य शिकायत "${localDelta.extractedComplaint}" दर्ज कर ली है। आपके डॉक्टर की सहायता के लिए, क्या आप बता सकते हैं कि यह दर्द कैसा महसूस होता है और क्या यह कहीं और भी फैलता है?`
      : agentEn;
  } else {
    agentEn = `Thank you for sharing your symptoms. I have analyzed your input. Could you tell me more about how long you have experienced this and how severe it feels on a scale of 1 to 10?`;
    agentLoc = language === 'hi'
      ? `आपके लक्षण साझा करने के लिए धन्यवाद। मैंने आपकी जानकारी दर्ज कर ली है। क्या आप बता सकते हैं कि यह समस्या कितने समय से है और 1 से 10 के पैमाने पर यह कितनी तीव्र है?`
      : agentEn;
  }

  return {
    agentMessage: agentEn,
    localizedMessage: agentLoc,
    language: language,
    extractedComplaint: localDelta.extractedComplaint,
    extractedSocratesDelta: localDelta.extractedSocratesDelta,
    extractedSymptoms: localDelta.extractedSymptoms,
    extractedConditions: localDelta.extractedConditions,
    extractedDemographics: localDelta.extractedDemographics,
    suggestedOptions: localDelta.suggestedOptions,
    isEmergency: isEmergency,
    emergencyReason: isEmergency ? safetyCheck.triggeredRules[0]?.ruleDescription : undefined,
    nextRecommendedPhase: localDelta.nextRecommendedPhase || 'socrates'
  };
}

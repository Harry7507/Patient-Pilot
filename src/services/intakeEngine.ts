// Adaptive SOCRATES Intake Question Engine for PatientPilot

import { LanguageCode, SocratesHistory, PatientDemographics } from '../types/clinical';

export interface IntakeStep {
  id: string;
  category: 'demographics' | 'complaint' | 'socrates' | 'history' | 'ayush' | 'complete';
  socratesField?: keyof SocratesHistory;
  prompt: Record<LanguageCode, string>;
  subtitle?: Record<LanguageCode, string>;
  options?: {
    label: Record<LanguageCode, string>;
    value: string;
    isRedFlagTrigger?: boolean;
    associatedEntities?: string[];
  }[];
  inputType: 'chips' | 'text' | 'number' | 'slider' | 'multi-chip' | 'demographics-form';
}

export const COMMON_COMPLAINTS = [
  {
    id: 'chest_pain',
    label: { en: 'Chest Pain / Discomfort', hi: 'सीने में दर्द या भारीपन', bn: 'বুকে ব্যথা বা অস্বস্তি' },
    icon: 'HeartPulse',
    emergencyPotential: true,
  },
  {
    id: 'breathlessness',
    label: { en: 'Shortness of Breath', hi: 'सांस लेने में तकलीफ', bn: 'শ্বাসকষ্ট' },
    icon: 'Wind',
    emergencyPotential: true,
  },
  {
    id: 'fever',
    label: { en: 'Fever / Chills', hi: 'तेज बुखार और कंपकंपी', bn: 'জ্বর এবং কাঁপুনি' },
    icon: 'Thermometer',
    emergencyPotential: false,
  },
  {
    id: 'headache',
    label: { en: 'Severe Headache', hi: 'सिर में तेज दर्द', bn: 'তীব্র মাথাব্যথা' },
    icon: 'Brain',
    emergencyPotential: true,
  },
  {
    id: 'abdominal_pain',
    label: { en: 'Stomach / Abdominal Pain', hi: 'पेट में दर्द या मरोड़', bn: 'পেটে তীব্র ব্যথা' },
    icon: 'Activity',
    emergencyPotential: false,
  },
  {
    id: 'weakness_dizziness',
    label: { en: 'Sudden Weakness / Giddiness', hi: 'अचानक कमजोरी या चक्कर', bn: 'হঠাৎ দুর্বলতা বা মাথা ঘোরা' },
    icon: 'ZapOff',
    emergencyPotential: true,
  },
  {
    id: 'cough_cold',
    label: { en: 'Cough / Sore Throat', hi: 'खांसी और गले में खराश', bn: 'কাশি এবং গলা ব্যথা' },
    icon: 'UserCheck',
    emergencyPotential: false,
  },
  {
    id: 'other',
    label: { en: 'Other Health Concern', hi: 'अन्य स्वास्थ्य समस्या', bn: 'অন্যান্য সমস্যা' },
    icon: 'PlusCircle',
    emergencyPotential: false,
  }
];

export const CHRONIC_CONDITIONS_LIST = [
  { id: 'htn', label: { en: 'High Blood Pressure (Hypertension)', hi: 'उच्च रक्तचाप (High BP)', bn: 'উচ্চ রক্তচাপ (High BP)' } },
  { id: 'dm', label: { en: 'Diabetes (Sugar)', hi: 'मधुमेह (शुगर)', bn: 'ডায়াবেটিস (সুগার)' } },
  { id: 'asthma', label: { en: 'Asthma / Breathing Problems', hi: 'अस्थमा / सांस की बीमारी', bn: 'হাঁপানি / শ্বাসের সমস্যা' } },
  { id: 'cad', label: { en: 'Heart Disease / Prior Stent', hi: 'हृदय रोग / स्टेंट', bn: 'হৃদরোগ / পূর্বে স্টেন্ট' } },
  { id: 'ckd', label: { en: 'Kidney Disease', hi: 'किडनी की बीमारी', bn: 'কিডনির সমস্যা' } },
  { id: 'thyroid', label: { en: 'Thyroid Disorder', hi: 'थायरॉयड विकार', bn: 'থাইরয়েড সমস্যা' } },
  { id: 'none', label: { en: 'No Prior Chronic Conditions', hi: 'कोई पुरानी बीमारी नहीं', bn: 'কোনো পূর্ববর্তী রোগ নেই' } }
];

export function getAdaptiveSocratesSteps(complaintId: string): IntakeStep[] {
  // Base steps tailored based on chief complaint
  const isChest = complaintId.includes('chest') || complaintId.includes('heart');
  const isHead = complaintId.includes('head') || complaintId.includes('brain');
  const isBreath = complaintId.includes('breath');

  const steps: IntakeStep[] = [];

  // Step 1: Specific Site / Location
  steps.push({
    id: 'socrates_site',
    category: 'socrates',
    socratesField: 'site',
    prompt: {
      en: 'Where exactly is the discomfort or pain located?',
      hi: 'यह दर्द या परेशानी शरीर में ठीक किस जगह महसूस हो रही है?',
      bn: 'এই ব্যথা বা অস্বস্তি ঠিক কোন জায়গায় অনুভূত হচ্ছে?'
    },
    inputType: 'chips',
    options: isChest ? [
      { label: { en: 'Center of Chest (Behind breastbone)', hi: 'सीने के बिल्कुल बीच में', bn: 'বুকের ঠিক মাঝখানে' }, value: 'Central Chest (Retrosternal)' },
      { label: { en: 'Left side of Chest', hi: 'सीने की बाईं तरफ', bn: 'বুকের বাঁ পাশে' }, value: 'Left Precordial Chest' },
      { label: { en: 'Upper Abdomen / Epigastric', hi: 'पेट के ऊपरी हिस्से में', bn: 'পেটের ওপরের অংশে' }, value: 'Epigastric Area' },
      { label: { en: 'Diffuse / Spread across chest', hi: 'पूरे सीने में फैला हुआ', bn: 'সারা বুকে বিস্তৃত' }, value: 'Diffuse Chest Discomfort' }
    ] : isHead ? [
      { label: { en: 'Frontal (Forehead)', hi: 'माथे के सामने', bn: 'কপালের সামনের দিকে' }, value: 'Frontal Forehead' },
      { label: { en: 'One side (Unilateral / Temple)', hi: 'सिर के एक तरफ (कनपटी)', bn: 'মাথার একপাশে' }, value: 'Unilateral Hemicranial' },
      { label: { en: 'Back of Head and Neck', hi: 'सिर के पीछे और गर्दन में', bn: 'মাথার পেছনে ও ঘাড়ে' }, value: 'Occipital and Nuchal' },
      { label: { en: 'Entire Head (Diffuse)', hi: 'पूरे सिर में भारीपन', bn: 'সম্পূর্ণ মাথায়' }, value: 'Generalized Holocranial' }
    ] : [
      { label: { en: 'Specific Localized Spot', hi: 'किसी एक निश्चित स्थान पर', bn: 'একটি নির্দিষ্ট স্থানে' }, value: 'Localized Spot' },
      { label: { en: 'Spread over wide area', hi: 'काफी बड़े क्षेत्र में फैला हुआ', bn: 'বিস্তৃত জায়গায়' }, value: 'Generalized Area' },
      { label: { en: 'Joints / Muscles', hi: 'जोड़ों या मांसपेशियों में', bn: 'জয়েন্ট বা মাংসপেশিতে' }, value: 'Musculoskeletal' }
    ]
  });

  // Step 2: Onset & Duration
  steps.push({
    id: 'socrates_onset',
    category: 'socrates',
    socratesField: 'onset',
    prompt: {
      en: 'When did this begin and how suddenly did it start?',
      hi: 'यह तकलीफ कब शुरू हुई और क्या यह अचानक शुरू हुई?',
      bn: 'এই সমস্যা কখন শুরু হয়েছে এবং এটি কি হঠাৎ শুরু হয়েছে?'
    },
    inputType: 'chips',
    options: [
      { 
        label: { en: 'Sudden, like a lightning strike (< 1 hour ago)', hi: 'अचानक, बिजली के झटके की तरह (1 घंटे से कम)', bn: 'হঠাৎ তীব্রভাবে (< ১ ঘণ্টা আগে)' }, 
        value: 'Acute Sudden Onset (< 1 hr)',
        isRedFlagTrigger: true
      },
      { 
        label: { en: 'Started today morning / few hours ago', hi: 'आज सुबह या कुछ घंटे पहले शुरू हुआ', bn: 'আজ সকালে বা কয়েক ঘণ্টা আগে' }, 
        value: 'Subacute (Few hours ago)' 
      },
      { 
        label: { en: 'Gradually developing over 2 - 3 days', hi: 'पिछले 2-3 दिनों से धीरे-धीरे बढ़ रहा है', bn: 'গত ২-৩ দিন ধরে ধীরে ধীরে বাড়ছে' }, 
        value: '2 to 3 days duration' 
      },
      { 
        label: { en: 'Ongoing for weeks / Chronic issue', hi: 'हफ्तों से लगातार बना हुआ है', bn: 'কয়েক সপ্তাহ ধরে চলছে' }, 
        value: 'Chronic / Weeks long' 
      }
    ]
  });

  // Step 3: Character / Sensation
  steps.push({
    id: 'socrates_character',
    category: 'socrates',
    socratesField: 'character',
    prompt: {
      en: 'What does the sensation or discomfort feel like?',
      hi: 'यह दर्द या बेचैनी किस प्रकार की महसूस होती है?',
      bn: 'ব্যথা বা অস্বস্তির ধরন কেমন?'
    },
    inputType: 'chips',
    options: isChest ? [
      { label: { en: 'Heavy pressure / Crushing weight / Squeezing', hi: 'सीने पर भारी दबाव, निचोड़ने जैसा दर्द', bn: 'বুকের ওপর ভারী চাপ / পিষে ফেলার মতো' }, value: 'Crushing Heavy Pressure' },
      { label: { en: 'Sharp, stabbing with deep breaths', hi: 'सांस लेने पर चुभने वाला तेज दर्द', bn: 'শ্বাস নিলে তীব্র তীক্ষ্ণ ব্যথা' }, value: 'Pleuritic Sharp Stabbing' },
      { label: { en: 'Burning sensation / Acidity-like', hi: 'जलन जैसा दर्द (एसिडिटी जैसा)', bn: 'জ্বলন জাতীয় অনুভূতি' }, value: 'Burning Discomfort' },
      { label: { en: 'Dull, constant ache', hi: 'हल्का-हल्का लगातार बना रहने वाला दर्द', bn: 'ধীরগতির অবিরাম ব্যথা' }, value: 'Dull Continuous Ache' }
    ] : [
      { label: { en: 'Throbbing / Pulsating', hi: 'धक-धक करने वाला टीस भरा दर्द', bn: 'দপ-দপ করা তীব্র ব্যথা' }, value: 'Throbbing Pulsatile' },
      { label: { en: 'Sharp / Stabbing', hi: 'तेज सुई चुभने जैसा', bn: 'তীক্ষ্ণ সুই ফোটার মতো' }, value: 'Sharp Stabbing' },
      { label: { en: 'Dull ache / Heaviness', hi: 'हल्का भारीपन व दर्द', bn: 'ভারী ভাব এবং চাপা ব্যথা' }, value: 'Dull Ache' },
      { label: { en: 'Cramping / Colicky', hi: 'मरोड़ या ऐंठन', bn: 'খিঁচুনি বা মোচড়' }, value: 'Cramping / Colicky' }
    ]
  });

  // Step 4: Radiation (Crucial for Red Flag Safety Matrix)
  steps.push({
    id: 'socrates_radiation',
    category: 'socrates',
    socratesField: 'radiation',
    prompt: {
      en: 'Does this discomfort spread or travel to any other part?',
      hi: 'क्या यह दर्द किसी दूसरे अंग की तरफ फैलता है?',
      bn: 'এই ব্যথা কি শরীরের অন্য কোনো অংশে ছড়িয়ে পড়ে?'
    },
    inputType: 'chips',
    options: isChest ? [
      { 
        label: { en: 'Spreading to Left Arm, Shoulder, or Jaw', hi: 'बाईं बांह, कंधे या जबड़े में फैल रहा है', bn: 'বাঁ হাত, কাঁধ বা চোয়ালে ছড়িয়ে পড়ছে' }, 
        value: 'Radiating to Left Arm and Jaw',
        isRedFlagTrigger: true
      },
      { 
        label: { en: 'Spreading straight through to the Back', hi: 'सीधे पीठ की तरफ जा रहा है', bn: 'সোজা পিঠের দিকে যাচ্ছে' }, 
        value: 'Radiating to Interscapular Back' 
      },
      { 
        label: { en: 'Spreading up to Throat / Neck', hi: 'गले की तरफ ऊपर बढ़ रहा है', bn: 'গলার দিকে উঠছে' }, 
        value: 'Radiating to Neck' 
      },
      { 
        label: { en: 'No radiation (Stays in one spot)', hi: 'कहीं नहीं फैलता, एक ही जगह है', bn: 'কোথাও ছড়ায় না, একই জায়গায় থাকে' }, 
        value: 'No Radiation' 
      }
    ] : isHead ? [
      { 
        label: { en: 'Spreading down into the neck (stiff neck)', hi: 'गर्दन में अकड़न के साथ नीचे फैल रहा है', bn: 'ঘাড়ে শক্তভাব সহ নিচে নামছে' }, 
        value: 'Radiating to Neck with Stiffness',
        isRedFlagTrigger: true
      },
      { label: { en: 'Spreading behind the eyes', hi: 'आंखों के पीछे महसूस हो रहा है', bn: 'চোখের পেছনে অনুভূত হচ্ছে' }, value: 'Radiating Retro-orbital' },
      { label: { en: 'Stays localized to head', hi: 'केवल सिर में ही रहता है', bn: 'কেবল মাথায় থাকে' }, value: 'No Radiation' }
    ] : [
      { label: { en: 'Spreads down arms or legs', hi: 'हाथों या पैरों की तरफ जाता है', bn: 'হাত বা পায়ের দিকে যায়' }, value: 'Radiating to Extremities' },
      { label: { en: 'Spreads to groin or lower back', hi: 'कमर या जांघों की तरफ फैलता है', bn: 'কোমর বা কুঁচকির দিকে' }, value: 'Radiating to Back/Groin' },
      { label: { en: 'Does not spread anywhere', hi: 'कहीं नहीं फैलता', bn: 'কোথাও ছড়ায় না' }, value: 'No Radiation' }
    ]
  });

  // Step 5: Associated Symptoms (Red Flag evaluation triggers)
  steps.push({
    id: 'socrates_associations',
    category: 'socrates',
    socratesField: 'associations',
    prompt: {
      en: 'Are you experiencing any of these accompanying symptoms right now?',
      hi: 'क्या आपको इस समय इनमें से कोई अन्य लक्षण भी महसूस हो रहे हैं?',
      bn: 'আপনি কি এই মুহূর্তে নিচের কোনো অতিরিক্ত লক্ষণ অনুভব করছেন?'
    },
    inputType: 'multi-chip',
    options: [
      { 
        label: { en: 'Shortness of breath / Dyspnea', hi: 'सांस फूलना या घबराहट', bn: 'শ্বাসকষ্ট বা অস্বস্তি' }, 
        value: 'Dyspnea / Breathlessness',
        isRedFlagTrigger: true
      },
      { 
        label: { en: 'Cold profuse sweating', hi: 'अचानक ठंडा पसीना आना', bn: 'ঠান্ডা ঘাম বের হওয়া' }, 
        value: 'Cold Diaphoresis / Sweating',
        isRedFlagTrigger: true
      },
      { 
        label: { en: 'Sudden weakness or numbness', hi: 'हाथ-पैर में कमजोरी या सुन्नपन', bn: 'হঠাৎ দুর্বলতা বা অসাড়তা' }, 
        value: 'Sudden Weakness / Numbness',
        isRedFlagTrigger: true
      },
      { 
        label: { en: 'Slurred speech / Confusion', hi: 'बोलने में लड़खड़ाहट या उलझन', bn: 'কথা জড়িয়ে যাওয়া বা বিভ্রান্তি' }, 
        value: 'Slurred Speech / Confusion',
        isRedFlagTrigger: true
      },
      { 
        label: { en: 'High Fever with Shivering', hi: 'तेज बुखार और कंपकंपी', bn: 'কাঁপুনি দিয়ে তীব্র জ্বর' }, 
        value: 'High Fever / Chills' 
      },
      { 
        label: { en: 'Nausea or vomiting', hi: 'उल्टी या मितली का मन', bn: 'বমি ভাব বা বমি' }, 
        value: 'Nausea / Emesis' 
      },
      { 
        label: { en: 'None of the above', hi: 'इनमें से कोई नहीं', bn: 'উপরের কোনটিই নয়' }, 
        value: 'No Associated Red Flags' 
      }
    ]
  });

  // Step 6: Severity Rating (1 to 10 scale)
  steps.push({
    id: 'socrates_severity',
    category: 'socrates',
    socratesField: 'severity',
    prompt: {
      en: 'On a scale from 1 to 10, how severe is your discomfort right now?',
      hi: '1 से 10 के पैमाने पर, अभी आपकी तकलीफ कितनी तीव्र है?',
      bn: '১ থেকে ১০ এর স্কেলে, এই মুহূর্তে আপনার কষ্ট কতটা তীব্র?'
    },
    subtitle: {
      en: '1 is very mild, 5 is moderate, and 10 is unbearable severe pain.',
      hi: '1 बहुत हल्का, 5 मध्यम, और 10 असहनीय तेज दर्द है।',
      bn: '১ খুব মৃদু, ৫ মাঝারি এবং ১০ অসহনীয় তীব্র ব্যথা।'
    },
    inputType: 'slider',
    options: [
      { label: { en: '1-3: Mild discomfort', hi: '1-3: हल्का दर्द', bn: '১-৩: মৃদু অস্বস্তি' }, value: '2' },
      { label: { en: '4-6: Moderate, bothering work', hi: '4-6: मध्यम, काम में रुकावट', bn: '৪-৬: মাঝারি ব্যথা' }, value: '5' },
      { label: { en: '7-8: Severe, hard to bear', hi: '7-8: बहुत तेज दर्द', bn: '৭-৮: তীব্র অসহ্য ব্যথা' }, value: '8' },
      { label: { en: '9-10: Worst possible / Unbearable', hi: '9-10: असहनीय अत्यधिक कष्ट', bn: '৯-১০: চরম অসহনীয়' }, value: '10', isRedFlagTrigger: true }
    ]
  });

  // Step 7: Exacerbating / Relieving Factors
  steps.push({
    id: 'socrates_exacerbating',
    category: 'socrates',
    socratesField: 'exacerbatingFactors',
    prompt: {
      en: 'Does anything make this discomfort noticeably worse or better?',
      hi: 'क्या किसी खास चीज से यह दर्द बढ़ता या कम होता है?',
      bn: 'কোনো কিছু কি এই ব্যথাকে উল্লেখযোগ্যভাবে বাড়ায় বা কমায়?'
    },
    inputType: 'chips',
    options: [
      { label: { en: 'Worse with walking or physical exertion', hi: 'चलने-फिरने या मेहनत से बढ़ता है', bn: 'হাঁটাহাঁটি বা পরিশ্রমে বাড়ে' }, value: 'Worse with physical exertion' },
      { label: { en: 'Worse after eating meals', hi: 'खाना खाने के बाद बढ़ता है', bn: 'খাবার খাওয়ার পর বাড়ে' }, value: 'Worse postprandially (after food)' },
      { label: { en: 'Better with rest or sitting quietly', hi: 'आराम करने या बैठने से राहत मिलती है', bn: 'বিশ্রাম নিলে উপশম হয়' }, value: 'Relieved by rest' },
      { label: { en: 'Continuous, no change with position', hi: 'लगातार एक जैसा बना रहता है', bn: 'একটানা একই রকম থাকে' }, value: 'Constant, unaffected by posture' }
    ]
  });

  return steps;
}

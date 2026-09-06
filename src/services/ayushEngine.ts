// AYUSH / Ayurveda Dashavidha Pariksha Assessment Module

import { DashavidhaPariksha, LanguageCode } from '../types/clinical';
import { getLocalizedText } from './localizationService';

export interface AyushQuestion {
  id: keyof DashavidhaPariksha;
  factorName: string;
  sanskritTerm: string;
  question: Partial<Record<LanguageCode, string>> & { en: string };
  options: {
    label: Partial<Record<LanguageCode, string>> & { en: string };
    value: string;
    clinicalTag: string;
  }[];
}

export function getAyushQuestion(q: AyushQuestion, lang: LanguageCode): string {
  return getLocalizedText(q.question, lang, q.question.en);
}

export function getAyushOptionLabel(opt: { label: Partial<Record<LanguageCode, string>> & { en: string } }, lang: LanguageCode): string {
  return getLocalizedText(opt.label, lang, opt.label.en);
}


export const DASHAVIDHA_QUESTIONS: AyushQuestion[] = [
  {
    id: 'prakriti',
    factorName: 'Physical & Metabolic Constitution',
    sanskritTerm: 'Deha Prakriti',
    question: {
      en: 'How would you describe your general physical build and response to weather?',
      hi: 'आप अपनी शारीरिक बनावट और मौसम के प्रति संवेदनशीलता को कैसे वर्णित करेंगे?',
      bn: 'আপনার শারীরিক গঠন এবং আবহাওয়ার প্রতি সংবেদনশীলতা কেমন?'
    },
    options: [
      {
        label: {
          en: 'Lean build, dry skin, sensitive to cold/wind',
          hi: 'दुबला शरीर, सूखी त्वचा, ठंड और हवा से परेशानी',
          bn: 'পাতলা শরীর, শুষ্ক ত্বক, ঠান্ডা এবং বাতাসে সংবেদনশীল'
        },
        value: 'Vata',
        clinicalTag: 'Vata Dominant'
      },
      {
        label: {
          en: 'Medium build, warm body, sensitive to heat, sharp hunger',
          hi: 'मध्यम शरीर, गर्म त्वचा, गर्मी से परेशानी, तीव्र भूख',
          bn: 'মাঝারি গঠন, উষ্ণ ত্বক, গরমে কষ্ট, তীব্র ক্ষুধা'
        },
        value: 'Pitta',
        clinicalTag: 'Pitta Dominant'
      },
      {
        label: {
          en: 'Solid/broad build, smooth skin, slow metabolism, calm',
          hi: 'मजबूत/भारी शरीर, चिकनी त्वचा, धीमी पाचन शक्ति, शांत स्वभाव',
          bn: 'ভারী গঠন, মসৃণ ত্বক, ধীর বিপাক, শান্ত প্রকৃতি'
        },
        value: 'Kapha',
        clinicalTag: 'Kapha Dominant'
      },
      {
        label: {
          en: 'Mixed characteristics (Combination)',
          hi: 'मिश्रित लक्षण (दोहरा स्वभाव)',
          bn: 'মিশ্র বৈশিষ্ট্য'
        },
        value: 'Vata-Pitta',
        clinicalTag: 'Dwandwaja (Dual Dosha)'
      }
    ]
  },
  {
    id: 'agniAharaShakti',
    factorName: 'Digestive Capacity & Appetite',
    sanskritTerm: 'Agni & Ahara Shakti',
    question: {
      en: 'How is your daily digestion and appetite regularity?',
      hi: 'आपकी पाचन शक्ति और भूख कैसी रहती है?',
      bn: 'আপনার হজম ক্ষমতা এবং ক্ষুধার অবস্থা কেমন?'
    },
    options: [
      {
        label: {
          en: 'Sluggish / Heavy feeling after small meals',
          hi: 'धीमा / कम खाने पर भी भारीपन और सुस्ती',
          bn: 'ধীর / অল্প খেলেও পেটে ভারী ভাব'
        },
        value: 'Mandagni (Low/Sluggish)',
        clinicalTag: 'Mandagni'
      },
      {
        label: {
          en: 'Very sharp / Frequent hunger, acidity or heartburn',
          hi: 'अत्यधिक तीव्र भूख, जल्दी-जल्दी एसिडिटी या जलन',
          bn: 'খুব তীব্র ক্ষুধা, ঘন ঘন অ্যাসিডিটি বা বুক জ্বালা'
        },
        value: 'Tikshnagni (Sharp/Hyper)',
        clinicalTag: 'Tikshnagni'
      },
      {
        label: {
          en: 'Irregular / Some days hungry, some days completely lost appetite',
          hi: 'अनियमित / कभी बहुत भूख कभी बिल्कुल नहीं',
          bn: 'অনিয়মিত / কোনো দিন খুব ক্ষুধা, কোনো দিন একদম নেই'
        },
        value: 'Vishamagni (Irregular)',
        clinicalTag: 'Vishamagni'
      },
      {
        label: {
          en: 'Healthy & Regular / Digestion on time without discomfort',
          hi: 'स्वस्थ और संतुलित / समय पर सहज पाचन',
          bn: 'সুস্থ এবং নিয়মিত / সময়মত স্বচ্ছন্দ হজম'
        },
        value: 'Samagni (Balanced)',
        clinicalTag: 'Samagni'
      }
    ]
  },
  {
    id: 'vyayamaShakti',
    factorName: 'Physical Endurance & Energy',
    sanskritTerm: 'Vyayama Shakti',
    question: {
      en: 'What is your physical stamina and exertion capacity?',
      hi: 'आपकी शारीरिक सहनशक्ति और मेहनत करने की क्षमता कैसी है?',
      bn: 'আপনার শারীরিক সহনশীলতা এবং পরিশ্রম করার ক্ষমতা কেমন?'
    },
    options: [
      {
        label: {
          en: 'Low / Easily exhausted with light physical activity',
          hi: 'कम / थोड़ा सा काम करने पर भी तुरंत थकान',
          bn: 'কম / সামান্য পরিশ্রমে খুব দ্রুত ক্লান্ত হয়ে পড়া'
        },
        value: 'Avara (Low/Easily Fatigued)',
        clinicalTag: 'Avara Vyayama Shakti'
      },
      {
        label: {
          en: 'Moderate / Can manage routine daily work comfortably',
          hi: 'मध्यम / दैनिक दिनचर्या का काम सामान्य रूप से कर पाते हैं',
          bn: 'মাঝারি / দৈনন্দিন কাজ স্বাভাবিকভাবে সম্পন্ন করতে পারেন'
        },
        value: 'Madhyama (Moderate)',
        clinicalTag: 'Madhyama Vyayama Shakti'
      },
      {
        label: {
          en: 'High / High stamina, can do heavy exercise or physical labor',
          hi: 'उत्कृष्ट / उच्च सहनशक्ति, भारी श्रम व व्यायाम सहज रूप से',
          bn: 'উচ্চ / ভালো স্ট্যামিনা, ভারী ব্যায়াম বা পরিশ্রম সহজে সম্ভব'
        },
        value: 'Pravara (High Endurance)',
        clinicalTag: 'Pravara Vyayama Shakti'
      }
    ]
  },
  {
    id: 'satmya',
    factorName: 'Dietary Habituation & Tolerance',
    sanskritTerm: 'Satmya (Dietary Compatibility)',
    question: {
      en: 'What kind of foods or tastes suit your system best?',
      hi: 'किस प्रकार का भोजन आपके शरीर के अनुकूल है?',
      bn: 'কোন ধরণের খাবার আপনার শরীরে সবচেয়ে উপযুক্ত?'
    },
    options: [
      {
        label: {
          en: 'Warm, cooked, soothing foods (Oily/Ghee suits well)',
          hi: 'गर्म, ताजा पका हुआ सादा भोजन (घी-तेल अनुकूल)',
          bn: 'গরম, রান্না করা পুষ্টিকর খাবার'
        },
        value: 'Snigdha-Ushna Satmya (Warm/Nourishing)',
        clinicalTag: 'Snigdha-Ushna'
      },
      {
        label: {
          en: 'Cooling, light, fresh vegetables & fruits',
          hi: 'शीतल, हल्का भोजन और ताजे फल-सब्जियां',
          bn: 'ঠান্ডা, হালকা খাবার ও তাজা শাকসবজি'
        },
        value: 'Sheeta-Laghu Satmya (Cooling/Light)',
        clinicalTag: 'Sheeta-Laghu'
      },
      {
        label: {
          en: 'All tastes easily tolerated (Sarva-Rasa Satmya)',
          hi: 'सभी रस व सामान्य आहार आसानी से अनुकूल',
          bn: 'সব ধরণের সাধারণ খাবার সহজেই সহ্য হয়'
        },
        value: 'Sarva-Rasa Satmya (Broad Tolerance)',
        clinicalTag: 'Sarva-Rasa'
      }
    ]
  }
];

export function evaluateAyushSummary(factors: DashavidhaPariksha): string {
  const parts: string[] = [];
  if (factors.prakriti) parts.push(`Constitutional Tendency: ${factors.prakriti}`);
  if (factors.agniAharaShakti) parts.push(`Digestive Fire (Agni): ${factors.agniAharaShakti}`);
  if (factors.vyayamaShakti) parts.push(`Physical Strength: ${factors.vyayamaShakti}`);
  if (factors.satmya) parts.push(`Habituation (Satmya): ${factors.satmya}`);
  if (factors.vaya) parts.push(`Life Stage (Vaya): ${factors.vaya}`);
  return parts.join(' | ') || 'No AYUSH assessment recorded';
}

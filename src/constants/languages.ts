// Comprehensive list of all 22 scheduled languages in the Eighth Schedule of the Constitution of India + English (23 total)
import { LanguageCode } from '../types/clinical';

export type LanguageZone = 'All' | 'Popular' | 'South' | 'North & Central' | 'East & North-East' | 'West';

export interface LanguageMeta {
  code: LanguageCode;
  name: string;
  nativeName: string;
  region: string;
  zone: 'South' | 'North & Central' | 'East & North-East' | 'West' | 'Pan-India';
  speechCode: string;
  isPopular?: boolean;
}

export const INDIAN_LANGUAGES: LanguageMeta[] = [
  // Pan-India & Popular Official Languages
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    region: 'Pan-India / Administrative & Medical',
    zone: 'Pan-India',
    speechCode: 'en-IN',
    isPopular: true
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    region: 'Uttar Pradesh, MP, Bihar, Delhi, Rajasthan, Haryana',
    zone: 'North & Central',
    speechCode: 'hi-IN',
    isPopular: true
  },
  {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    region: 'West Bengal, Tripura, Assam',
    zone: 'East & North-East',
    speechCode: 'bn-IN',
    isPopular: true
  },
  {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    region: 'Andhra Pradesh, Telangana',
    zone: 'South',
    speechCode: 'te-IN',
    isPopular: true
  },
  {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    region: 'Maharashtra, Goa',
    zone: 'West',
    speechCode: 'mr-IN',
    isPopular: true
  },
  {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    region: 'Tamil Nadu, Puducherry',
    zone: 'South',
    speechCode: 'ta-IN',
    isPopular: true
  },
  {
    code: 'gu',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    region: 'Gujarat, Dadra & Nagar Haveli',
    zone: 'West',
    speechCode: 'gu-IN',
    isPopular: true
  },
  {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    region: 'Karnataka',
    zone: 'South',
    speechCode: 'kn-IN',
    isPopular: true
  },
  {
    code: 'ml',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    region: 'Kerala, Lakshadweep',
    zone: 'South',
    speechCode: 'ml-IN',
    isPopular: true
  },
  {
    code: 'pa',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    region: 'Punjab, Chandigarh, Delhi',
    zone: 'North & Central',
    speechCode: 'pa-IN',
    isPopular: true
  },
  {
    code: 'ur',
    name: 'Urdu',
    nativeName: 'اردو',
    region: 'Jammu & Kashmir, Telangana, UP, Bihar, Delhi',
    zone: 'North & Central',
    speechCode: 'ur-IN',
    isPopular: true
  },
  {
    code: 'or',
    name: 'Odia',
    nativeName: 'ଓଡ଼ିଆ',
    region: 'Odisha',
    zone: 'East & North-East',
    speechCode: 'or-IN',
    isPopular: true
  },
  {
    code: 'as',
    name: 'Assamese',
    nativeName: 'অসমীয়া',
    region: 'Assam',
    zone: 'East & North-East',
    speechCode: 'as-IN'
  },
  {
    code: 'mai',
    name: 'Maithili',
    nativeName: 'मैथिली',
    region: 'Bihar, Jharkhand',
    zone: 'North & Central',
    speechCode: 'mai-IN'
  },
  {
    code: 'sat',
    name: 'Santali',
    nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ',
    region: 'Jharkhand, West Bengal, Odisha',
    zone: 'East & North-East',
    speechCode: 'sat-IN'
  },
  {
    code: 'ks',
    name: 'Kashmiri',
    nativeName: 'کٲشُر / कॉशुर',
    region: 'Jammu & Kashmir',
    zone: 'North & Central',
    speechCode: 'ks-IN'
  },
  {
    code: 'ne',
    name: 'Nepali',
    nativeName: 'नेपाली',
    region: 'Sikkim, North Bengal, Assam',
    zone: 'East & North-East',
    speechCode: 'ne-NP'
  },
  {
    code: 'kok',
    name: 'Konkani',
    nativeName: 'कोंकणी',
    region: 'Goa, Coastal Karnataka & Maharashtra',
    zone: 'West',
    speechCode: 'kok-IN'
  },
  {
    code: 'sd',
    name: 'Sindhi',
    nativeName: 'سنڌي / सिन्धी',
    region: 'Gujarat, Maharashtra, Rajasthan, MP',
    zone: 'West',
    speechCode: 'sd-IN'
  },
  {
    code: 'doi',
    name: 'Dogri',
    nativeName: 'डोगरी',
    region: 'Jammu & Kashmir, Himachal Pradesh',
    zone: 'North & Central',
    speechCode: 'doi-IN'
  },
  {
    code: 'mni',
    name: 'Manipuri (Meitei)',
    nativeName: 'মৈতৈলোন্ / Manipuri',
    region: 'Manipur',
    zone: 'East & North-East',
    speechCode: 'mni-IN'
  },
  {
    code: 'brx',
    name: 'Bodo',
    nativeName: 'बड़ो',
    region: 'Bodoland / Assam',
    zone: 'East & North-East',
    speechCode: 'brx-IN'
  },
  {
    code: 'sa',
    name: 'Sanskrit',
    nativeName: 'संस्कृतम्',
    region: 'Pan-India / Classical Ayurvedic Intake',
    zone: 'Pan-India',
    speechCode: 'sa-IN'
  }
];

export const LANGUAGE_MAP = new Map<LanguageCode, LanguageMeta>(
  INDIAN_LANGUAGES.map((lang) => [lang.code, lang])
);

export function getLanguageMeta(code: LanguageCode): LanguageMeta {
  return LANGUAGE_MAP.get(code) || INDIAN_LANGUAGES[0];
}

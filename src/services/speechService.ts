// Speech Service for Voice-Enabled OPD Portals

import { LanguageCode } from '../types/clinical';

export const LANG_MAPPING: Record<LanguageCode, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  bn: 'bn-IN',
  te: 'te-IN',
  mr: 'mr-IN',
  ta: 'ta-IN',
  ur: 'ur-IN',
  gu: 'gu-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  or: 'or-IN',
  pa: 'pa-IN',
  as: 'as-IN',
  mai: 'hi-IN', // Fallback to Hindi voice if Maithili voice pack absent
  sat: 'bn-IN', // Fallback to regional voice if Santali absent
  ks: 'ur-IN',  // Fallback to Urdu voice if Kashmiri absent
  ne: 'ne-NP',
  kok: 'mr-IN', // Fallback to Marathi/Konkani voice
  sd: 'hi-IN',  // Fallback to Hindi/Sindhi voice
  doi: 'hi-IN', // Fallback to Hindi voice
  mni: 'bn-IN', // Fallback to Bengali/Manipuri voice
  brx: 'as-IN', // Fallback to Assamese/Bodo voice
  sa: 'hi-IN',  // Sanskrit using standard Vedic pronunciation phonetics in hi-IN
};


class SpeechService {
  private synth: SpeechSynthesis | null = null;
  private recognition: any = null;
  public isListening: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      if ('speechSynthesis' in window) {
        this.synth = window.speechSynthesis;
      }
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
      }
    }
  }

  public speak(text: string, lang: LanguageCode = 'en', onEnd?: () => void) {
    if (!this.synth) return;
    this.synth.cancel(); // Stop any ongoing speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANG_MAPPING[lang] || 'en-US';
    utterance.rate = 0.95; // Slightly slower, clear for portal audio
    utterance.pitch = 1.0;

    if (onEnd) {
      utterance.onend = onEnd;
      utterance.onerror = onEnd;
    }

    this.synth.speak(utterance);
  }

  public stopSpeaking() {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  public startListening(
    lang: LanguageCode,
    onResult: (transcript: string) => void,
    onError: (error: string) => void,
    onEnd: () => void
  ): boolean {
    if (!this.recognition) {
      onError('Speech recognition not supported in this browser. Please use touch/text input.');
      return false;
    }

    try {
      this.recognition.lang = LANG_MAPPING[lang] || 'en-IN';
      this.isListening = true;

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.isListening = false;
        onResult(transcript);
      };

      this.recognition.onerror = (event: any) => {
        this.isListening = false;
        onError(event.error || 'Voice input error');
      };

      this.recognition.onend = () => {
        this.isListening = false;
        onEnd();
      };

      this.recognition.start();
      return true;
    } catch (err: any) {
      this.isListening = false;
      onError(err?.message || 'Could not initialize microphone');
      return false;
    }
  }

  public stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }
}

export const speechService = new SpeechService();

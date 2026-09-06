// Speech Service for Voice-Enabled OPD Kiosks

import { LanguageCode } from '../types/clinical';

const LANG_MAPPING: Record<LanguageCode, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  bn: 'bn-IN'
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
    utterance.rate = 0.95; // Slightly slower, clear for kiosk audio
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

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
  public isAudioOutputEnabled: boolean = false; // Audio output explicitly turned off

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      try {
        this.synth.cancel();
      } catch {
        // Ignore
      }
    }
  }

  public isSpeechRecognitionSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  public setAudioOutputEnabled(enabled: boolean) {
    this.isAudioOutputEnabled = enabled;
    if (!enabled && this.synth) {
      try {
        this.synth.cancel();
      } catch {
        // Ignore
      }
    }
  }

  public speak(text: string, lang: LanguageCode = 'en', onEnd?: () => void) {
    // Audio output is turned off
    if (!this.isAudioOutputEnabled || !this.synth) {
      if (onEnd) onEnd();
      return;
    }
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANG_MAPPING[lang] || 'en-US';
    utterance.rate = 0.95;
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
    onEnd: () => void,
    onInterim?: (interim: string) => void
  ): boolean {
    if (typeof window === 'undefined') return false;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      onError('Speech recognition is not supported in this browser. Please use text input or click a quick voice sample.');
      return false;
    }

    // Clean up any existing active recognition
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // Ignore
      }
      this.recognition = null;
    }

    try {
      const recognition = new SpeechRecognition();
      this.recognition = recognition;
      recognition.lang = LANG_MAPPING[lang] || 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = true;
      this.isListening = true;

      let finalTranscript = '';

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        if (interim && onInterim) {
          onInterim(interim);
        }
        if (finalTranscript) {
          this.isListening = false;
          onResult(finalTranscript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        this.isListening = false;
        // Don't show scary error if user aborted or no-speech occurred
        if (event.error === 'no-speech') {
          onError('No voice detected. Please tap the mic and speak clearly.');
        } else if (event.error === 'not-allowed') {
          onError('Microphone access was denied. Please allow microphone permissions in browser settings.');
        } else if (event.error !== 'aborted') {
          onError(`Voice input notice: ${event.error}`);
        }
      };

      recognition.onend = () => {
        this.isListening = false;
        onEnd();
      };

      recognition.start();
      return true;
    } catch (err: any) {
      this.isListening = false;
      onError(err?.message || 'Could not start microphone recording');
      return false;
    }
  }

  public stopListening() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore
      }
      this.isListening = false;
    }
  }
}

export const speechService = new SpeechService();

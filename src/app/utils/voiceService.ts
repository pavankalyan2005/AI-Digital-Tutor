import { Capacitor } from "@capacitor/core";
import { TextToSpeech } from "@capacitor-community/text-to-speech";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";

/**
 * Pre-processes text for Text-to-Speech.
 * Strips markdown symbols and replaces code blocks with a friendly voice summary.
 */
export function cleanTextForSpeech(text: string): string {
  if (!text) return "";

  let cleaned = text;

  // 1. Replace multi-line code blocks ```code...``` with a friendly summary
  cleaned = cleaned.replace(/```[\s\S]*?```/g, " Here is a code example, shown below. ");

  // 2. Replace inline code `code`
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");

  // 3. Remove Markdown headings (#, ##, ###)
  cleaned = cleaned.replace(/#{1,6}\s+/g, "");

  // 4. Remove Markdown bold/italics (**word**, *word*, __word__)
  cleaned = cleaned.replace(/(\*\*|__|\*|_)(.*?)\1/g, "$2");

  // 5. Remove Markdown links [text](url)
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // 6. Remove bullet point symbols
  cleaned = cleaned.replace(/^[\s]*[\*\-\+]\s+/gm, "");

  // 7. Normalize spaces
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
}

export type PlaybackRate = 0.75 | 1.0 | 1.25;

export interface VoiceServiceOptions {
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
  onTranscriptPartial?: (text: string) => void;
  onTranscriptFinal?: (text: string) => void;
  onError?: (err: string) => void;
}

class VoiceService {
  private isSpeaking = false;
  private currentSpeakingId: number | null = null;
  private playbackRate: PlaybackRate = 1.0;
  private isListening = false;
  private webUtterance: SpeechSynthesisUtterance | null = null;
  private webRecognition: any = null;

  public getRate(): PlaybackRate {
    return this.playbackRate;
  }

  public setRate(rate: PlaybackRate) {
    this.playbackRate = rate;
  }

  public getCurrentSpeakingId(): number | null {
    return this.currentSpeakingId;
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Speak a text string aloud via native TTS or Web SpeechSynthesis.
   */
  public async speak(
    messageId: number,
    rawText: string,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: any) => void
  ): Promise<void> {
    try {
      // If currently speaking the same message, stop it (toggle action)
      if (this.isSpeaking && this.currentSpeakingId === messageId) {
        await this.stopSpeaking();
        if (onEnd) onEnd();
        return;
      }

      // Stop any active speech first
      await this.stopSpeaking();

      const cleanedText = cleanTextForSpeech(rawText);
      if (!cleanedText) return;

      this.isSpeaking = true;
      this.currentSpeakingId = messageId;
      if (onStart) onStart();

      if (Capacitor.isNativePlatform()) {
        await TextToSpeech.speak({
          text: cleanedText,
          lang: "en-US",
          rate: this.playbackRate,
          pitch: 1.0,
          volume: 1.0,
        });
        this.isSpeaking = false;
        this.currentSpeakingId = null;
        if (onEnd) onEnd();
      } else {
        // Web Fallback
        if (!("speechSynthesis" in window)) {
          throw new Error("Speech synthesis not supported in this browser.");
        }

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanedText);
        utterance.rate = this.playbackRate;
        utterance.lang = "en-US";

        utterance.onend = () => {
          this.isSpeaking = false;
          this.currentSpeakingId = null;
          this.webUtterance = null;
          if (onEnd) onEnd();
        };

        utterance.onerror = (e) => {
          this.isSpeaking = false;
          this.currentSpeakingId = null;
          this.webUtterance = null;
          if (onError) onError(e);
        };

        this.webUtterance = utterance;
        window.speechSynthesis.speak(utterance);
      }
    } catch (err: any) {
      this.isSpeaking = false;
      this.currentSpeakingId = null;
      console.error("VoiceService.speak error:", err);
      if (onError) onError(err);
    }
  }

  /**
   * Stop any ongoing Text-to-Speech playback.
   */
  public async stopSpeaking(): Promise<void> {
    try {
      this.isSpeaking = false;
      this.currentSpeakingId = null;

      if (Capacitor.isNativePlatform()) {
        await TextToSpeech.stop();
      } else if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        this.webUtterance = null;
      }
    } catch (err) {
      console.warn("VoiceService.stopSpeaking error:", err);
    }
  }

  /**
   * Check and request Android/iOS Microphone runtime permissions.
   */
  public async requestMicPermission(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      try {
        const check = await SpeechRecognition.checkPermissions();
        if (check.speechRecognition === "granted") {
          return true;
        }
        const req = await SpeechRecognition.requestPermissions();
        return req.speechRecognition === "granted";
      } catch (err) {
        console.warn("SpeechRecognition permission check failed:", err);
        return false;
      }
    }
    return true; // Web browsers handle mic permission on recognition start
  }

  /**
   * Start Speech-to-Text listening for voice input.
   */
  public async startListening(
    onPartial: (text: string) => void,
    onFinal?: (text: string) => void,
    onError?: (err: string) => void,
    onStop?: () => void
  ): Promise<void> {
    try {
      const hasPermission = await this.requestMicPermission();
      if (!hasPermission) {
        if (onError) onError("Microphone permission denied.");
        return;
      }

      this.isListening = true;

      if (Capacitor.isNativePlatform()) {
        // Native Capacitor Speech Recognition
        await SpeechRecognition.removeAllListeners();

        await SpeechRecognition.addListener("partialResults", (data: { matches?: string[] }) => {
          if (data.matches && data.matches.length > 0) {
            const transcript = data.matches[0];
            onPartial(transcript);
          }
        });

        await SpeechRecognition.start({
          language: "en-US",
          maxResults: 5,
          prompt: "Say your question to AI Mentor...",
          partialResults: true,
          popup: false,
        });
      } else {
        // Web Fallback (SpeechRecognition API)
        const SpeechRecognitionWeb =
          (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognitionWeb) {
          this.isListening = false;
          if (onError) onError("Speech Recognition is not supported in this browser.");
          return;
        }

        const recognition = new SpeechRecognitionWeb();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          if (currentTranscript) {
            onPartial(currentTranscript);
          }
        };

        recognition.onerror = (e: any) => {
          console.warn("Web SpeechRecognition error:", e);
          this.isListening = false;
          if (onError) onError(e.error || "Speech recognition error.");
        };

        recognition.onend = () => {
          this.isListening = false;
          if (onStop) onStop();
        };

        this.webRecognition = recognition;
        recognition.start();
      }
    } catch (err: any) {
      this.isListening = false;
      console.error("VoiceService.startListening error:", err);
      if (onError) onError(err.message || "Failed to start voice recognition.");
    }
  }

  /**
   * Stop Speech-to-Text listening.
   */
  public async stopListening(): Promise<void> {
    try {
      this.isListening = false;
      if (Capacitor.isNativePlatform()) {
        await SpeechRecognition.stop();
        await SpeechRecognition.removeAllListeners();
      } else if (this.webRecognition) {
        this.webRecognition.stop();
        this.webRecognition = null;
      }
    } catch (err) {
      console.warn("VoiceService.stopListening error:", err);
    }
  }
}

export const voiceService = new VoiceService();

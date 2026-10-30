import { useState, useCallback, useRef, useEffect } from "react";

interface SpeechSynthesisHook {
  speak: (text: string, voiceURI?: string, rate?: number) => void;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
  unlockAudio: () => void; // Call on first user interaction
}

// Track if audio has been unlocked globally
let audioUnlocked = false;

export const useSpeechSynthesis = (): SpeechSynthesisHook => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const resumeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  // Detect iOS
  const isIOS = typeof navigator !== "undefined" && 
    /iPad|iPhone|iPod/.test(navigator.userAgent);

  // Load voices - iOS Safari loads them async
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
        console.log(`Loaded ${availableVoices.length} voices`);
      }
    };

    // Load immediately
    loadVoices();

    // Also listen for voiceschanged event (needed for iOS/Safari)
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.cancel();
      if (resumeIntervalRef.current) {
        clearInterval(resumeIntervalRef.current);
      }
    };
  }, [isSupported]);

  // iOS Safari workaround: Must trigger speech from user gesture first
  // Call this on first user tap/click to "unlock" audio
  const unlockAudio = useCallback(() => {
    if (!isSupported || audioUnlocked) return;
    
    try {
      // Cancel any pending speech
      window.speechSynthesis.cancel();
      
      // Speak a silent/empty utterance to unlock
      const silentUtterance = new SpeechSynthesisUtterance(' ');
      silentUtterance.volume = 0;
      silentUtterance.rate = 10; // Fast to complete quickly
      
      silentUtterance.onend = () => {
        audioUnlocked = true;
        console.log('Audio unlocked for speech synthesis');
      };
      
      silentUtterance.onerror = () => {
        // Still mark as attempted - don't show error to user
        audioUnlocked = true;
      };
      
      window.speechSynthesis.speak(silentUtterance);
    } catch (e) {
      // Silently mark as attempted if it fails
      audioUnlocked = true;
      console.log('Audio unlock attempt completed with fallback');
    }
  }, [isSupported]);

  // Split text into chunks by sentence for iOS resilience
  const splitIntoChunks = useCallback((text: string, maxLength: number = 150): string[] => {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks: string[] = [];
    let currentChunk = "";

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;

      if (currentChunk.length + trimmed.length <= maxLength) {
        currentChunk += (currentChunk ? " " : "") + trimmed;
      } else {
        if (currentChunk) chunks.push(currentChunk);
        // If single sentence is too long, split by clause
        if (trimmed.length > maxLength) {
          const parts = trimmed.split(/,|;/).filter(p => p.trim());
          for (const part of parts) {
            chunks.push(part.trim());
          }
        } else {
          currentChunk = trimmed;
        }
      }
    }

    if (currentChunk) chunks.push(currentChunk);
    return chunks.length > 0 ? chunks : [text];
  }, []);

  const speak = useCallback((text: string, voiceURI?: string, rate: number = 1.0) => {
    if (!isSupported) return;

    // Cancel any ongoing speech and intervals
    window.speechSynthesis.cancel();
    if (resumeIntervalRef.current) {
      clearInterval(resumeIntervalRef.current);
      resumeIntervalRef.current = null;
    }

    // Use cached voices or reload
    let availableVoices = voices;
    if (availableVoices.length === 0) {
      availableVoices = window.speechSynthesis.getVoices();
    }

    // Find the voice to use
    let selectedVoice: SpeechSynthesisVoice | undefined;
    if (voiceURI && availableVoices.length > 0) {
      selectedVoice = availableVoices.find((v) => v.voiceURI === voiceURI);
    }
    if (!selectedVoice && availableVoices.length > 0) {
      selectedVoice = availableVoices.find(
        (v) => v.lang.startsWith("en") && (v.name.includes("Female") || v.name.includes("Samantha") || v.name.includes("Karen"))
      ) || availableVoices.find((v) => v.lang.startsWith("en"));
    }

    // iOS: Split into chunks to prevent pausing after ~15 seconds
    // Desktop: Use full text (more natural)
    const chunks = isIOS ? splitIntoChunks(text, 150) : [text];
    let currentChunkIndex = 0;

    const speakNextChunk = () => {
      if (currentChunkIndex >= chunks.length) {
        setIsSpeaking(false);
        if (resumeIntervalRef.current) {
          clearInterval(resumeIntervalRef.current);
          resumeIntervalRef.current = null;
        }
        return;
      }

      const chunk = chunks[currentChunkIndex];
      const utterance = new SpeechSynthesisUtterance(chunk);
      utteranceRef.current = utterance;

      utterance.rate = rate;
      utterance.pitch = 1.1;

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onstart = () => {
        if (currentChunkIndex === 0) {
          console.log('Speech started');
          setIsSpeaking(true);
        }
      };

      utterance.onend = () => {
        currentChunkIndex++;
        if (currentChunkIndex < chunks.length) {
          // Small delay between chunks for natural flow
          setTimeout(speakNextChunk, 50);
        } else {
          console.log('Speech ended');
          setIsSpeaking(false);
          if (resumeIntervalRef.current) {
            clearInterval(resumeIntervalRef.current);
            resumeIntervalRef.current = null;
          }
        }
      };

      utterance.onerror = (e) => {
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.error('Speech error:', e.error);
        }
        setIsSpeaking(false);
        if (resumeIntervalRef.current) {
          clearInterval(resumeIntervalRef.current);
          resumeIntervalRef.current = null;
        }
      };

      try {
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.error('Speech synthesis speak failed:', e);
        setIsSpeaking(false);
        return;
      }
      // iOS Safari workaround for chunk pausing
      if (isIOS && !resumeIntervalRef.current) {
        resumeIntervalRef.current = setInterval(() => {
          if (window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          }
        }, 5000);
      }
    };

    // iOS needs a small delay after cancel
    if (isIOS) {
      setTimeout(speakNextChunk, 100);
    } else {
      speakNextChunk();
    }
  }, [isSupported, voices, isIOS, splitIntoChunks]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    if (resumeIntervalRef.current) {
      clearInterval(resumeIntervalRef.current);
      resumeIntervalRef.current = null;
    }
    setIsSpeaking(false);
  }, [isSupported]);

  return {
    speak,
    stop,
    isSpeaking,
    isSupported,
    unlockAudio,
  };
};

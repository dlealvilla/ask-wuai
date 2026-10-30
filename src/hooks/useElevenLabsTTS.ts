import { useState, useCallback, useRef } from "react";

// Global audio pool for iOS Safari workaround
// We create and prime multiple audio elements during user gesture
// so we can use them later for async playback
let audioPool: HTMLAudioElement[] = [];
let audioPoolPrimed = false;

// Prime audio pool during user gesture (must be called synchronously in click handler)
export const primeAudioPool = (): void => {
  if (audioPoolPrimed && audioPool.length > 0) {
    // Already primed, just reset the pool
    audioPool.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
      audio.src = "";
    });
    audioPool = [];
  }
  
  try {
    // Create 2 audio elements during user gesture - one for question, one for answer
    // This "locks in" the user gesture context for iOS Safari
    for (let i = 0; i < 2; i++) {
      const audio = new Audio();
      audio.volume = 0.01; // Nearly silent
      audio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            audio.pause();
            audio.currentTime = 0;
            audio.src = "";
          })
          .catch(() => {
            // Still keep it - might work later
          });
      }
      
      audioPool.push(audio);
    }
    
    audioPoolPrimed = true;
    console.log(`Audio pool primed with ${audioPool.length} elements for iOS Safari`);
  } catch (e) {
    console.log('Audio pool prime attempt completed');
  }
};

// Get a primed audio element from the pool (for reuse)
const getPrimedAudio = (): HTMLAudioElement | null => {
  if (audioPool.length > 0) {
    return audioPool.pop() || null;
  }
  return null;
};

// ElevenLabs curated child-friendly voices (official names)
export const ELEVENLABS_VOICES = [
  // Female voices
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", gender: "female" as const, description: "" },
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura", gender: "female" as const, description: "" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", gender: "female" as const, description: "" },
  // Male voices
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", gender: "male" as const, description: "" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", gender: "male" as const, description: "" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", gender: "male" as const, description: "" },
];

interface UseElevenLabsTTSReturn {
  speak: (text: string, voiceId: string, speed?: number) => Promise<void>;
  stop: () => void;
  isSpeaking: boolean;
  isLoading: boolean;
  error: string | null;
}

// Track ElevenLabs availability globally
const ELEVENLABS_AVAILABLE_KEY = "elevenlabs-available";
let elevenLabsAvailable: boolean | null = null;

// Check localStorage for availability status
const getElevenLabsAvailability = (): boolean => {
  if (elevenLabsAvailable !== null) return elevenLabsAvailable;
  const stored = localStorage.getItem(ELEVENLABS_AVAILABLE_KEY);
  if (stored !== null) {
    elevenLabsAvailable = stored === "true";
    return elevenLabsAvailable;
  }
  // Default to available until we detect a failure
  return true;
};

// Mark ElevenLabs as unavailable
const markElevenLabsUnavailable = () => {
  elevenLabsAvailable = false;
  localStorage.setItem(ELEVENLABS_AVAILABLE_KEY, "false");
  // Dispatch event so other components can react
  window.dispatchEvent(new CustomEvent("elevenlabs-unavailable"));
};

export const useElevenLabsTTS = (): UseElevenLabsTTSReturn => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsSpeaking(false);
    setIsLoading(false);
  }, []);

  const speak = useCallback(async (text: string, voiceId: string, speed: number = 1.0) => {
    // Check if ElevenLabs is available before attempting
    if (!getElevenLabsAvailability()) {
      throw new Error("ElevenLabs is unavailable");
    }

    stop();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text, voiceId, speed }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error || `Failed to generate speech: ${response.status}`;
        
        // Check for common failure reasons (credits, API key, etc.)
        if (response.status === 402 || response.status === 429 || 
            errorMsg.toLowerCase().includes("credit") ||
            errorMsg.toLowerCase().includes("quota") ||
            errorMsg.toLowerCase().includes("subscription")) {
          markElevenLabsUnavailable();
          throw new Error("ElevenLabs credits exhausted or unavailable");
        }
        
        throw new Error(errorMsg);
      }

      const data = await response.json();
      
      if (!data.audioContent) {
        throw new Error("No audio content received");
      }

      // Use data URI for playback
      const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
      
      // For iOS Safari: Try to reuse a primed audio element from the pool
      // This works because it was created during the user gesture
      let audio: HTMLAudioElement;
      const primedAudio = getPrimedAudio();
      
      if (primedAudio) {
        // Reuse the primed element - just update the source
        audio = primedAudio;
        audio.src = audioUrl;
        audio.volume = 1.0;
        audio.currentTime = 0;
        console.log('Using primed audio element from pool for iOS Safari compatibility');
      } else {
        // Fallback: create new audio element (may not work on iOS Safari in async context)
        audio = new Audio(audioUrl);
        audio.preload = "auto";
        audio.volume = 1.0;
        console.log('No primed audio available, creating new element (may fail on iOS Safari)');
      }
      
      audioRef.current = audio;

      audio.onplay = () => {
        setIsLoading(false);
        setIsSpeaking(true);
      };

      audio.onended = () => {
        setIsSpeaking(false);
        audioRef.current = null;
      };

      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        setError("Failed to play audio");
        setIsSpeaking(false);
        setIsLoading(false);
        audioRef.current = null;
        throw new Error("Audio playback failed");
      };

      // For iOS, we need to ensure audio context is unlocked
      // Try to play, and if it fails due to autoplay policy, throw error to trigger fallback
      try {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
      } catch (playError: any) {
        // iOS Safari autoplay restriction - fallback to system voice
        console.error("ElevenLabs audio play failed (likely iOS autoplay restriction):", playError);
        audioRef.current = null;
        throw new Error("Audio autoplay blocked - iOS requires user interaction");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("ElevenLabs TTS error:", errorMessage);
      
      // Mark as unavailable if it's a persistent error
      if (errorMessage.includes("unavailable") || 
          errorMessage.includes("credit") ||
          errorMessage.includes("quota")) {
        markElevenLabsUnavailable();
      }
      
      setError(errorMessage);
      setIsLoading(false);
      setIsSpeaking(false);
      throw err; // Re-throw so caller can handle fallback
    }
  }, [stop]);

  return {
    speak,
    stop,
    isSpeaking,
    isLoading,
    error,
  };
};

// Export function to check availability
export const isElevenLabsAvailable = (): boolean => {
  return getElevenLabsAvailability();
};

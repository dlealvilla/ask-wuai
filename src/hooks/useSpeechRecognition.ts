import { useState, useRef, useCallback, useEffect } from "react";

interface SpeechRecognitionHook {
  isListening: boolean;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  transcript: string;
  error: string | null;
}

// Type declarations for Web Speech API
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

export const useSpeechRecognition = (): SpeechRecognitionHook => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Detect iOS (Safari and Chrome)
  const isIOS = typeof navigator !== "undefined" && 
    /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  // Detect Chrome on iOS (CriOS) - has very limited speech recognition support
  const isIOSChrome = typeof navigator !== "undefined" && 
    /CriOS/.test(navigator.userAgent);

  // iOS Chrome doesn't properly support Web Speech API - mark as unsupported
  const isSupported = typeof window !== "undefined" && 
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) &&
    !isIOSChrome; // Disable for iOS Chrome - it doesn't work reliably

  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    const recognition = recognitionRef.current;
    
    // iOS Safari works better with non-continuous
    recognition.continuous = !isIOS;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    let finalTranscript = "";
    let silenceTimeout: NodeJS.Timeout | null = null;
    let hasSpeechStarted = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = "";
      
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + " ";
          hasSpeechStarted = true;
        } else {
          interimTranscript += result[0].transcript;
          hasSpeechStarted = true;
        }
      }

      const currentTranscript = (finalTranscript + interimTranscript).trim();
      setTranscript(currentTranscript);

      if (silenceTimeout) clearTimeout(silenceTimeout);
      
      if (hasSpeechStarted && currentTranscript) {
        const timeout = isIOS ? 2800 : 3000;
        silenceTimeout = setTimeout(() => {
          if (finalTranscript.trim() || currentTranscript.trim()) {
            recognition.stop();
          }
        }, timeout);
      }
    };

    recognition.onspeechend = () => {
      if (isIOS) {
        setTimeout(() => {
          if (recognitionRef.current) {
            recognition.stop();
          }
        }, 2500);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      
      if (event.error === "no-speech") {
        console.log("No speech detected");
      } else if (event.error === "aborted") {
        console.log("Recognition aborted");
      } else if (event.error === "not-allowed") {
        setError("Microphone access denied. Please allow microphone access.");
      } else if (event.error === "network") {
        setError("Network error. Please check your connection.");
      } else {
        setError(event.error);
      }
      
      setIsListening(false);
    };

    recognition.onend = () => {
      if (silenceTimeout) clearTimeout(silenceTimeout);
      setIsListening(false);
    };

    return () => {
      if (silenceTimeout) clearTimeout(silenceTimeout);
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      recognition.abort();
    };
  }, [isSupported, isIOS]);

  const startListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current) return;

    setError(null);
    setTranscript("");
    setIsListening(true);
    startTimeRef.current = Date.now();

    try {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // Ignore abort errors
      }
      
      const startDelay = isIOS ? 100 : 0;
      
      restartTimeoutRef.current = setTimeout(() => {
        try {
          recognitionRef.current.start();
          console.log("Speech recognition started");
        } catch (e) {
          console.error("Failed to start recognition:", e);
          setIsListening(false);
          setError("Could not start voice recognition. Please try again.");
        }
      }, startDelay);
    } catch (e) {
      console.error("Failed to start recognition:", e);
      setIsListening(false);
    }
  }, [isSupported, isIOS]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }

    try {
      recognitionRef.current.stop();
    } catch (e) {
      console.error("Failed to stop recognition:", e);
    }
    setIsListening(false);
  }, []);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    transcript,
    error,
  };
};

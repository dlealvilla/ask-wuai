import { useState, useRef, useCallback, useEffect } from "react";
import { useWebSpeech, useCustomRecorder, isIOS } from "@/utils/platform";
import { supabase } from "@/integrations/supabase/client";

export type VoiceInputState = "idle" | "listening" | "processing";

const isEmbeddedBrowserContext = () => {
  try {
    return typeof window !== "undefined" && window.self !== window.top;
  } catch {
    // Cross-origin frame access throws; treat as embedded.
    return true;
  }
};

interface UseVoiceInputOptions {
  onTranscription: (text: string) => void;
}

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

export function useVoiceInput(options: UseVoiceInputOptions) {
  const [state, setState] = useState<VoiceInputState>("idle");
  const [error, setError] = useState<string | null>(null);
  
  // Keep callback ref current to avoid stale closures
  const onTranscriptionRef = useRef(options.onTranscription);
  onTranscriptionRef.current = options.onTranscription;
  
  // Web Speech refs
  const recognitionRef = useRef<any>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Custom recorder refs (for iOS)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Determine which implementation to use
  const isSupported = useWebSpeech || useCustomRecorder;

  // Refs for timeouts that need to persist across renders
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxDurationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const finalTranscriptRef = useRef<string>("");

  // Initialize Web Speech Recognition (for non-iOS)
  useEffect(() => {
    if (!useWebSpeech) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    const recognition = recognitionRef.current;
    recognition.continuous = true; // Keep listening, rely on silence timeout
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = "";
      
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscriptRef.current += result[0].transcript + " ";
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      // Reset silence timeout on any speech activity
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);

      // 7 seconds of silence after speaking = end of question (increased from 5s)
      if (interimTranscript) {
        silenceTimeoutRef.current = setTimeout(() => {
          console.log("Silence timeout (7s) - stopping recognition");
          recognition.stop();
        }, 7000);
      }
    };

    // Native speech end detection
    recognition.onspeechend = () => {
      console.log("Speech ended detected by browser");
      // Wait 7 seconds after speech ends before stopping (increased from 5s)
      setTimeout(() => {
        try {
          recognition.stop();
        } catch (e) {
          // Already stopped
        }
      }, 7000);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      
      // Clear timeouts
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (maxDurationTimeoutRef.current) clearTimeout(maxDurationTimeoutRef.current);
      
      if (event.error === "not-allowed") {
        setError("Microphone access denied. Please allow microphone access.");
      } else if (event.error === "network") {
        setError("Network error. Please check your connection.");
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        setError(event.error);
      }
      
      setState("idle");
    };

    recognition.onend = () => {
      // Clear timeouts
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (maxDurationTimeoutRef.current) clearTimeout(maxDurationTimeoutRef.current);
      
      const transcript = finalTranscriptRef.current.trim();
      console.log("Recognition ended, transcript:", transcript);
      
      if (transcript) {
        // Immediately transition to processing and call handler
        setState("processing");
        onTranscriptionRef.current(transcript);
        // State remains "processing" - MainView's isProcessing controls the UI from here
      } else {
        setState("idle");
      }
      
      // Reset for next use
      finalTranscriptRef.current = "";
    };

    return () => {
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (maxDurationTimeoutRef.current) clearTimeout(maxDurationTimeoutRef.current);
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      recognition.abort();
    };
  }, []);

  // Start listening
  const start = useCallback(async () => {
    setError(null);
    finalTranscriptRef.current = "";
    
    if (useWebSpeech && recognitionRef.current) {
      // Web Speech API path (desktop/Android)
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // Ignore
      }
      
      // Clear any existing timeouts
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (maxDurationTimeoutRef.current) clearTimeout(maxDurationTimeoutRef.current);
      
      setState("listening");
      
      restartTimeoutRef.current = setTimeout(() => {
        try {
          recognitionRef.current.start();
          console.log("Web Speech recognition started");
          
          // Maximum duration: 8 seconds
          maxDurationTimeoutRef.current = setTimeout(() => {
            console.log("Max duration reached (8s) - stopping");
            try {
              recognitionRef.current.stop();
            } catch (e) {
              // Already stopped
            }
          }, 8000);
          
        } catch (e) {
          console.error("Failed to start recognition:", e);
          setState("idle");
          setError("Could not start voice recognition. Please try again.");
        }
      }, 50);
      
    } else if (useCustomRecorder) {
      // Custom recorder path (iOS)
      // iOS Safari blocks microphone access inside embedded iframes (like the Lovable preview).
      // Avoid triggering a system permission popup we can't satisfy.
      if (isEmbeddedBrowserContext()) {
        setError("Voice input isn't available in embedded preview on iOS. Open the app in a new tab (or the published site) and try again.");
        setState("idle");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        audioChunksRef.current = [];

        // Try to use a format that works well cross-platform
        const mimeType = MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/mp4")
            ? "audio/mp4"
            : "audio/wav";
        
        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;
        
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        
        recorder.onstop = async () => {
          setState("processing");
          
          // Release microphone
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
          }
          
          // Create blob from chunks
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          audioChunksRef.current = [];
          
          try {
            // Convert to base64
            const base64Audio = await blobToBase64(audioBlob);
            
            // Send to transcription endpoint
            const { data, error } = await supabase.functions.invoke("transcribe", {
              body: { audio: base64Audio, mimeType },
            });
            
            if (error) throw error;
            
            if (data?.text) {
              onTranscriptionRef.current(data.text);
            } else {
              setError("Could not transcribe audio. Please try again.");
            }
          } catch (e) {
            console.error("Transcription error:", e);
            setError("Failed to transcribe. Please try again.");
          } finally {
            setState("idle");
          }
        };
        
        recorder.onerror = (event) => {
          console.error("MediaRecorder error:", event);
          setError("Recording failed. Please try again.");
          setState("idle");
          
          // Release microphone
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
          }
        };
        
        recorder.start();
        setState("listening");
        console.log("Custom audio recording started (iOS)");
        
        // Maximum duration: 8 seconds for iOS recorder
        maxDurationTimeoutRef.current = setTimeout(() => {
          console.log("Max duration reached (8s) - stopping iOS recorder");
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
          }
        }, 8000);
        
      } catch (e: any) {
        console.error("Failed to start recording:", e);
        // Provide more specific error messages
        if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
          setError("Microphone access denied. Please allow microphone access in your browser settings.");
        } else if (e.name === "NotFoundError" || e.name === "DevicesNotFoundError") {
          setError("No microphone found. Please connect a microphone and try again.");
        } else if (e.name === "NotReadableError" || e.name === "TrackStartError") {
          setError("Microphone is being used by another application. Please close it and try again.");
        } else if (e.message && e.message.includes("not allowed by the user agent")) {
          setError("Microphone access is not available in this context. Please try in a regular browser tab.");
        } else {
          setError("Microphone access denied or not available. Please check your browser settings.");
        }
        setState("idle");
      }
    }
  }, []);

  // Stop listening
  const stop = useCallback(() => {
    // Clear all timeouts
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (maxDurationTimeoutRef.current) {
      clearTimeout(maxDurationTimeoutRef.current);
      maxDurationTimeoutRef.current = null;
    }
    
    if (useWebSpeech && recognitionRef.current) {
      try {
        // Stop recognition - this will trigger onend which processes the transcript
        recognitionRef.current.stop();
      } catch (e) {
        console.error("Failed to stop recognition:", e);
        // If stop fails, manually process any existing transcript
        const transcript = finalTranscriptRef.current.trim();
        if (transcript) {
          setState("processing");
          onTranscriptionRef.current(transcript);
          finalTranscriptRef.current = "";
        } else {
          setState("idle");
        }
      }
    }
    
    if (useCustomRecorder && mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    state,
    error,
    isSupported,
    start,
    stop,
  };
}

// Helper function to convert Blob to base64
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Remove the data URL prefix (e.g., "data:audio/webm;base64,")
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

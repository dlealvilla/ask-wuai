// Platform detection utilities

export const isIOS = typeof navigator !== "undefined" && 
  /iPad|iPhone|iPod/.test(navigator.userAgent);

export const isIOSChrome = typeof navigator !== "undefined" && 
  /CriOS/.test(navigator.userAgent);

export const hasWebSpeech = typeof window !== "undefined" && 
  ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

// Use Web Speech API only on non-iOS platforms that support it
export const useWebSpeech = !isIOS && hasWebSpeech;

// Use custom audio recorder + backend transcription on iOS
export const useCustomRecorder = isIOS;

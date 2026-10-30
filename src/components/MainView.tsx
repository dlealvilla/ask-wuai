import React, { useState, useEffect, useCallback, useRef } from "react";
import { RotateCcw, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { SandTimer } from "./SandTimer";
import { Button } from "@/components/ui/button";
import { MicButton } from "./MicButton";
import { QuestionBubble } from "./QuestionBubble";
import { AnswerBubble } from "./AnswerBubble";
import { MediaGallery } from "./MediaGallery";
import { TextInputModal } from "./TextInputModal";
import { SquidMascot } from "./SquidMascot";
import { WuaiLogo } from "./WuaiLogo";
import { SquidTeacher } from "./SquidTeacher";
import { QAHistorySheet } from "./QAHistorySheet";
import { AppMenu } from "./AppMenu";
import { ChildrenManager } from "./ChildrenManager";
import { useSettings } from "@/contexts/SettingsContext";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useElevenLabsTTS, ELEVENLABS_VOICES, primeAudioPool } from "@/hooks/useElevenLabsTTS";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface MediaItem {
  url: string;
  alt: string;
  source?: "photo" | "ai-generated" | "illustration";
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

// Helper to check if voice is ElevenLabs
const isElevenLabsVoice = (voiceId: string) => ELEVENLABS_VOICES.some(v => v.id === voiceId);

export const MainView: React.FC = () => {
  const { user } = useAuth();
  const { settings, addToHistory, activeChild } = useSettings();
  const { speak: speakNative, stop: stopNative, isSpeaking: isNativeSpeaking, unlockAudio } = useSpeechSynthesis();
  const {
    speak: speakElevenLabs,
    stop: stopElevenLabs,
    isSpeaking: isElevenLabsSpeaking,
    error: elevenLabsError,
  } = useElevenLabsTTS();
  
  // Unified speaking state and methods
  const isSpeaking = isNativeSpeaking || isElevenLabsSpeaking;

  useEffect(() => {
    if (elevenLabsError) toast.error(elevenLabsError);
  }, [elevenLabsError]);
  
  const speak = useCallback((text: string, voiceId?: string, rate?: number) => {
    if (voiceId && isElevenLabsVoice(voiceId)) {
      // Try ElevenLabs, but fallback to system voice on any error
      void speakElevenLabs(text, voiceId, rate).catch((e) => {
        console.error("ElevenLabs speak failed, falling back to system voice:", e);
        // Fallback to system voice
        speakNative(text, undefined, rate);
      });
      return;
    }

    speakNative(text, voiceId, rate);
  }, [speakNative, speakElevenLabs]);
  
  const stopSpeaking = useCallback(() => {
    stopNative();
    stopElevenLabs();
  }, [stopNative, stopElevenLabs]);

  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [depthLevel, setDepthLevel] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [mediaSource, setMediaSource] = useState<string>("");
  const [mediaLoading, setMediaLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [modelUsed, setModelUsed] = useState<string>("");
  
  // Track current question for cancellation
  const currentQuestionRef = useRef<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const [showTextInput, setShowTextInput] = useState(false);
  const [showChildrenManager, setShowChildrenManager] = useState(false);
  
  // Timer state
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  
  // useVoiceInput is defined after handleQuestion to avoid reference before declaration
  // (moved below fetchAnswer and handleQuestion definitions)

  // Initialize timer when settings change
  useEffect(() => {
    if (settings.timerMinutes > 0 && timerSeconds === 0 && !timerActive) {
      setTimerSeconds(settings.timerMinutes * 60);
    }
  }, [settings.timerMinutes]);

  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, timerSeconds]);

  const handleTimerToggle = () => {
    if (timerSeconds === 0 && settings.timerMinutes > 0) {
      setTimerSeconds(settings.timerMinutes * 60);
      setTimerActive(true);
    } else {
      setTimerActive(!timerActive);
    }
  };

  const handleTimerReset = () => {
    setTimerActive(false);
    setTimerSeconds(settings.timerMinutes * 60);
  };

  // Prevent back navigation and other escape methods
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, "", window.location.href);
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    // Push a state to prevent back navigation
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const fetchAnswer = useCallback(async (question: string, depth: number, history: ConversationMessage[] = []) => {
    // Cancel any previous request immediately
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    // Stop all speaking immediately
    stopSpeaking();
    
    // Set processing state immediately to show thinking animation
    setIsProcessing(true);

    try {
      // Use active child's name if available, otherwise fall back to settings
      const childNameForAnswer = (activeChild?.name || settings.childName || "").trim();
      
      // Debug logging to verify name is being sent correctly
      console.log("🔍 Child name debug:", {
        activeChild: activeChild?.name,
        settingsChildName: settings.childName,
        finalName: childNameForAnswer,
        activeChildFull: activeChild
      });
      
      const { data, error } = await supabase.functions.invoke("answer", {
        body: { 
          question, 
          ageRange: settings.ageRange, 
          depthLevel: depth,
          aiProvider: settings.aiProvider,
          conversationHistory: history,
          answerLength: settings.answerLength,
          childName: childNameForAnswer,
        },
      });

      // Check if cancelled
      if (abortControllerRef.current?.signal.aborted) return;

      if (error) throw error;

      const answer = data.answer || "Hmm, I'm not sure about that!";
      setCurrentAnswer(answer);
      setDepthLevel(data.depthLevel || depth);
      setModelUsed(data.providerUsed || settings.aiProvider);

      // Update conversation history (limit to recent 10 pairs to avoid stale context with old names)
      setConversationHistory(prev => {
        const newHistory = [
          ...prev,
          { role: "user", content: question },
          { role: "assistant", content: answer }
        ];
        // Keep only last 10 Q&A pairs (20 messages) to prevent old names from persisting
        return newHistory.slice(-20);
      });

      // Save to history with child reference
      if (depth === 1) {
        addToHistory(question, answer, activeChild?.id);
      }

      // Speak the answer if enabled
      // Unlock audio for iOS before speaking
      if (settings.voiceOutput) {
        unlockAudio(); // Ensure audio context is unlocked for iOS
        speak(answer, settings.selectedVoice, settings.voiceSpeed);
      }

      // Handle media: Progressive MECE loading
      if (settings.showMedia) {
        fetchProgressiveMedia(question, answer);
      } else {
        setMedia([]);
        setMediaSource("");
      }
    } catch (error) {
      if (abortControllerRef.current?.signal.aborted) return;
      console.error("Error fetching answer:", error);
      const errorMsg = "Oops, I got a little confused. Can you try asking again?";
      setCurrentAnswer(errorMsg);
      if (settings.voiceOutput) {
        speak(errorMsg, settings.selectedVoice, settings.voiceSpeed);
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setIsProcessing(false);
      }
    }
  }, [settings, speak, stopSpeaking, addToHistory, activeChild]);

  // Handle question from voice input - immediate transition to thinking mode
  const handleQuestion = useCallback(async (question: string) => {
    // Update ref for cancellation check
    currentQuestionRef.current = question;
    
    // Immediately transition to processing/thinking state
    setCurrentQuestion(question);
    setDepthLevel(1);
    setMedia([]);
    setMediaSource("");
    setMediaLoading(true);
    setIsProcessing(true);
    
    // OPTIMIZATION: Run articulate and answer generation in parallel for faster response
    // This saves 1-3 seconds compared to sequential execution
    const recentHistory = conversationHistory.slice(-20);
    
    // Start both API calls simultaneously
    const articulatePromise = supabase.functions.invoke("articulate", {
      body: { question, ageRange: settings.ageRange },
    }).catch((err) => {
      // Silently fail - we'll use original question
      console.log("Articulate failed (non-blocking):", err);
      return { data: null, error: err };
    });
    
    // Start answer generation immediately with original question (don't await)
    // fetchAnswer will set isProcessing state internally
    void fetchAnswer(question, 1, recentHistory);
    
    // Wait for articulate with timeout (2 seconds max)
    // If it completes quickly, use corrected question for display/TTS
    // If it's slow, proceed with original question
    const articulateTimeout = new Promise((resolve) => {
      setTimeout(() => resolve({ data: null, error: null }), 2000);
    });
    
    const articulateResult = await Promise.race([articulatePromise, articulateTimeout]) as any;
    
    let correctedQuestion = question;
    if (articulateResult?.data?.articulatedQuestion) {
      correctedQuestion = articulateResult.data.articulatedQuestion;
      // Update display with corrected version if we got it quickly
      setCurrentQuestion(correctedQuestion);
    }
    
    // Speak the question back (use corrected if available, otherwise original)
    // This prevents transcription loops where TTS output gets re-transcribed
    // For iOS, ensure audio is unlocked before speaking (user gesture context)
    if (settings.voiceOutput) {
      unlockAudio(); // Ensure audio context is unlocked for iOS
      const childNameForPrompt = (activeChild?.name || settings.childName || "").trim();
      const thinkPhrase = childNameForPrompt ? `Let me think, ${childNameForPrompt}!` : "Let me think!";
      // Use corrected question if available, otherwise original
      speak(`${correctedQuestion}... ${thinkPhrase}`, settings.selectedVoice, settings.voiceSpeed);
    }
    
    // Answer generation is already running in parallel - no need to wait
  }, [settings, speak, conversationHistory, activeChild, fetchAnswer]);

  // Unified voice input hook - must be after handleQuestion definition
  const { state: voiceState, isSupported: voiceSupported, start: startListening, stop: stopListening, error: voiceError } = useVoiceInput({
    onTranscription: handleQuestion,
  });
  
  const isListening = voiceState === "listening";
  const isVoiceProcessing = voiceState === "processing";

  // Generate 2 AI images (reduced from 3 for faster loading) - educational, age-appropriate
  const fetchProgressiveMedia = useCallback(async (question: string, answer: string) => {
    setMediaLoading(true);
    const questionId = question;
    
    // 2 different image styles: realistic, cartoon (removed diagram for speed)
    const imageConfigs = [
      { prompt: question, imageType: "realistic" },   // Realistic photo-style
      { prompt: question, imageType: "cartoon" },     // Educational cartoon (scientifically accurate)
    ];
    
    // Start with empty array - images will be added sequentially
    setMedia([]);
    setMediaSource("ai-generated");
    
    // Generate images sequentially, one by one, adding each to the carousel as it's generated
    for (let index = 0; index < imageConfigs.length; index++) {
      const { prompt, imageType } = imageConfigs[index];
      
      // Check if question changed before making request
      if (currentQuestionRef.current !== questionId) {
        setMediaLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase.functions.invoke("generate-image", {
          body: { prompt, ageRange: settings.ageRange, imageType },
        });
        
        // Check again after request completes
        if (currentQuestionRef.current !== questionId) {
          setMediaLoading(false);
          return;
        }
        
        if (error || !data?.imageUrl) {
          console.log(`Image ${index + 1} (${imageType}) generation failed:`, error);
          continue; // Skip this image and continue with next
        }
        
        // Validate image URL format
        try {
          const url = new URL(data.imageUrl);
          console.log(`Image ${index + 1} URL validated:`, {
            protocol: url.protocol,
            hostname: url.hostname,
            pathname: url.pathname.substring(0, 50),
            browser: navigator.userAgent,
            platform: navigator.platform,
          });
        } catch (urlError) {
          console.error(`Invalid image URL format for image ${index + 1}:`, {
            url: data.imageUrl,
            error: urlError,
            browser: navigator.userAgent,
            platform: navigator.platform,
          });
          // Continue anyway - might still work
        }
        
        // Add this image to the carousel immediately
        const newImage: MediaItem = {
          url: data.imageUrl,
          alt: `${imageType}: ${prompt}`,
          source: "ai-generated" as const,
        };
        
        // Update media state with the new image added to existing ones
        setMedia(prev => [...prev, newImage]);
        
      } catch (err) {
        // Only log if question hasn't changed (to avoid noise from cancellations)
        if (currentQuestionRef.current === questionId) {
          console.error(`Error generating image ${index + 1}:`, err);
        }
        // Continue with next image even if this one failed
      }
    }
    
    // Final check before finishing
    if (currentQuestionRef.current !== questionId) {
      setMediaLoading(false);
      return;
    }
    
    setMediaLoading(false);
  }, [settings.ageRange]);

  const handleMicClick = () => {
    // CRITICAL: Prime audio pool during user gesture for iOS Safari
    // This creates audio elements in the user gesture context so we can use them later
    unlockAudio();
    primeAudioPool(); // Prime 2 audio elements: one for question, one for answer
    
    if (isListening) {
      // Immediately set processing state to prevent flash back to idle
      setIsProcessing(true);
      // Stop listening and immediately transition to thinking stage
      stopListening();
      // The voice input hook will call handleQuestion when it stops
      // But we need to ensure it transitions immediately
    } else if (settings.voiceInput && voiceSupported) {
      startListening();
    } else {
      setShowTextInput(true);
    }
  };

  const handleTellMore = useCallback(() => {
    if (currentQuestion) {
      const newDepth = Math.min(depthLevel + 1, 4);
      setDepthLevel(newDepth);
      fetchAnswer(currentQuestion, newDepth, conversationHistory.slice(-20));
    }
  }, [currentQuestion, depthLevel, fetchAnswer, conversationHistory]);

  const handleRepeatAnswer = () => {
    if (currentAnswer && settings.voiceOutput) {
      unlockAudio(); // Ensure audio context is unlocked for iOS
      speak(currentAnswer, settings.selectedVoice, settings.voiceSpeed);
    }
  };


  const handleStop = () => {
    // Stop listening if active
    if (isListening) {
      stopListening();
    }
    // Cancel ongoing request immediately
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    // Stop speaking immediately (this should stop all TTS)
    stopSpeaking();
    // Stop any ongoing media generation
    setMediaLoading(false);
    // Clear question reference
    currentQuestionRef.current = "";
    // Reset state immediately
    setIsProcessing(false);
    setCurrentQuestion("");
    setCurrentAnswer("");
    setMedia([]);
    setMediaSource("");
    setModelUsed("");
  };

  const childName = settings.childName || "there";

  const { children, setActiveChild } = useSettings();
  
  // Get child switcher buttons (max 5)
  const childProfiles = children.slice(0, 5);

  return (
    <div className="h-dvh flex flex-col bg-background overflow-hidden">
      {/* Header with user info */}
      <header className="flex-shrink-0 px-4 pt-3 pb-2 safe-area-top">
        <div className="flex items-center justify-between">
          {/* Left: Logo with name below + Child profiles */}
          <div className="flex items-center gap-4">
            {/* Logo - Wuai text only, consistent size */}
            <div className="flex items-center">
              <WuaiLogo />
            </div>
            
            {/* Child profile switcher buttons - 40% larger */}
            <div className="flex items-center gap-2 ml-2">
              {childProfiles.map((child) => (
                <button
                  key={child.id}
                  onClick={() => setActiveChild(child)}
                  className={`px-4 py-2 rounded-xl text-base font-medium transition-all ${
                    activeChild?.id === child.id
                      ? "bg-earth-sage/70 text-foreground shadow-sm"
                      : "bg-earth-sand/40 text-muted-foreground hover:bg-earth-sand/60"
                  }`}
                >
                  <span className="leading-tight">{child.name}</span>
                  {activeChild?.id === child.id && (
                    <span className="block text-xs text-muted-foreground leading-tight">
                      {child.age_range}y
                    </span>
                  )}
                </button>
              ))}
              {childProfiles.length === 0 && settings.childName && (
                <div className="px-4 py-2 rounded-xl bg-earth-sage/70 text-base font-medium text-foreground">
                  <span className="leading-tight">{settings.childName}</span>
                  <span className="block text-xs text-muted-foreground leading-tight">
                    {settings.ageRange}y
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: User info & controls */}
          <div className="flex items-center gap-3">
            {/* User avatar indicator */}
            {user && user.user_metadata?.avatar_url && (
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-border">
                <img
                  src={user.user_metadata.avatar_url}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            {/* History button */}
            <QAHistorySheet
              onSelectQuestion={(question, answer) => {
                setCurrentQuestion(question);
                setCurrentAnswer(answer);
              }}
            />

            {/* Menu button */}
            <AppMenu
              onChildrenClick={() => setShowChildrenManager(true)}
            />
          </div>
        </div>
      </header>

      {/* Main Content Area - Fixed height, no scroll */}
      <main className="flex-1 flex flex-col min-h-0 px-3 sm:px-4 py-2">
        {!currentQuestion && !currentAnswer ? (
          /* Empty state - Montessori inspired */
          <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in-up">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-earth-sand flex items-center justify-center mb-4 animate-breathe shadow-montessori overflow-hidden">
              <SquidMascot size="lg" animated />
            </div>
            <h2 className="text-lg sm:text-xl font-display font-semibold text-foreground mb-1.5 tracking-tight">
              What would you like to learn?
            </h2>
            <p className="text-sm text-muted-foreground font-medium">
              Tap the button to ask a question
            </p>
          </div>
        ) : isProcessing && !currentAnswer ? (
          /* Thinking stage - question at top, animation below */
          <div className="flex-1 flex flex-col min-h-0 gap-2">
            {/* Question confirmation - compact at top (same position as answer phase) */}
            <div className="flex-shrink-0">
              <QuestionBubble question={currentQuestion} />
            </div>
            
            {/* Animation area - same size/position as media placeholder */}
            <div className="flex-1 min-h-0 relative rounded-2xl overflow-hidden flex items-center justify-center bg-earth-sand/30">
              <SquidTeacher className="scale-90 sm:scale-100" />
            </div>
          </div>
        ) : (
          /* Answer view - media takes most space */
          <div className="flex-1 flex flex-col min-h-0 gap-2">
            {/* Question confirmation - compact at top */}
            <div className="flex-shrink-0">
              <QuestionBubble question={currentQuestion} />
            </div>
            
            {/* Media area with repeat button overlay */}
            {settings.showMedia && (
              <div className="flex-1 min-h-0 relative rounded-2xl overflow-hidden flex items-center justify-center bg-earth-sand/30">
                {/* Repeat answer button - top right corner */}
                {currentAnswer && settings.voiceOutput && (
                  <button
                    onClick={handleRepeatAnswer}
                    disabled={isSpeaking}
                    className="absolute top-3 right-3 z-10 w-10 h-10 rounded-xl bg-card/90 backdrop-blur-sm border border-border/30 flex items-center justify-center hover:bg-card transition-colors shadow-montessori"
                    aria-label="Repeat answer"
                  >
                    <RotateCcw className={`w-4 h-4 text-foreground ${isSpeaking ? 'animate-spin' : ''}`} />
                  </button>
                )}
                <MediaGallery 
                  images={media} 
                  source={mediaSource} 
                  fullscreen 
                  isLoading={mediaLoading && media.length === 0}
                  className="w-full h-full"
                />
              </div>
            )}
            
            {/* Compact answer text with model label */}
            <div className="flex-shrink-0">
              <AnswerBubble answer={currentAnswer} isSpeaking={isSpeaking} compact />
              {modelUsed && currentAnswer && !isProcessing && (
                <p className="text-[10px] text-muted-foreground/60 text-center mt-1">
                  via {modelUsed === "gpt" ? "GPT-5 Mini" : modelUsed === "gemini-pro" ? "Gemini Pro" : modelUsed === "perplexity" ? "Perplexity" : modelUsed}
                </p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Fixed footer with timer, mic button, and tell more */}
      <footer className="flex-shrink-0 px-4 pb-4 pt-2 safe-area-bottom">
        <div className="flex items-center">
          {/* Sand timer - far left */}
          <div className="flex-1 flex justify-start -ml-2">
            {settings.timerMinutes > 0 ? (
              <button onClick={handleTimerToggle}>
                <SandTimer
                  totalMinutes={settings.timerMinutes}
                  remainingSeconds={timerSeconds}
                  isActive={timerActive}
                  compact
                />
              </button>
            ) : (
              <div className="w-10" /> 
            )}
          </div>
          
          {/* Ask button - perfectly centered */}
          <div className="flex-shrink-0">
            <MicButton
              isListening={isListening}
              isProcessing={isProcessing}
              onClick={handleMicClick}
            />
          </div>
          
          {/* Tell me more OR Stop button - far right */}
          <div className="flex-1 flex justify-end">
            {isListening || isProcessing || mediaLoading ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleStop}
                className="text-xs px-4 py-1.5 h-9 rounded-xl font-medium shadow-montessori"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Stop
              </Button>
            ) : currentAnswer ? (
              <Button
                variant="default"
                size="sm"
                onClick={handleTellMore}
                className="text-xs px-4 py-1.5 h-9 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium shadow-montessori"
              >
                More →
              </Button>
            ) : (
              <div className="w-16" />
            )}
          </div>
        </div>
      </footer>

      {/* Dialogs */}
      <TextInputModal
        open={showTextInput}
        onOpenChange={setShowTextInput}
        onSubmit={handleQuestion}
      />

      <ChildrenManager
        open={showChildrenManager}
        onOpenChange={setShowChildrenManager}
      />
    </div>
  );
};

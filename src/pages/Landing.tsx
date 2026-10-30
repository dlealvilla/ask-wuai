import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Users, History, Mic, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MediaGallery } from "@/components/MediaGallery";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { Input } from "@/components/ui/input";
import { SquidMascot } from "@/components/SquidMascot";
import { WuaiLogo } from "@/components/WuaiLogo";
import { CANONICAL_SITE_URL } from "@/lib/canonical";

interface MediaItem {
  url: string;
  alt: string;
  source?: "photo" | "ai-generated" | "illustration";
}

export default function Landing() {
  const navigate = useNavigate();
  const { speak } = useSpeechSynthesis();

  const [demoQuestion, setDemoQuestion] = useState("");
  const [demoAnswer, setDemoAnswer] = useState("");
  const [demoMedia, setDemoMedia] = useState<MediaItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [inputText, setInputText] = useState("");

  const fetchMediaFunc = async (keywords: string[], question: string) => {
    setMediaLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("media", {
        body: { keywords, question },
      });

      if (!error && data?.images) {
        setDemoMedia(data.images);
        
        if (data.hasMore) {
          const { data: moreData } = await supabase.functions.invoke("media", {
            body: { keywords, question, fetchMore: true },
          });
          if (moreData?.images?.length > 0) {
            setDemoMedia(prev => {
              const existingUrls = new Set(prev.map(m => m.url));
              const newImages = moreData.images.filter((img: MediaItem) => !existingUrls.has(img.url));
              return [...prev, ...newImages];
            });
          }
        }
      }
    } catch (error) {
      console.error("Error fetching media:", error);
    } finally {
      setMediaLoading(false);
    }
  };

  const handleDemoQuestion = useCallback(async (question: string) => {
    if (!question.trim()) return;
    
    setDemoQuestion(question);
    setDemoAnswer("");
    setDemoMedia([]);
    setIsProcessing(true);
    setMediaLoading(true);
    setInputText("");

    try {
      const { data, error } = await supabase.functions.invoke("answer", {
        body: { 
          question, 
          ageRange: "5-6",
          depthLevel: 1,
          conversationHistory: [],
        },
      });

      if (error) throw error;

      const answer = data.answer || "Hmm, I'm not sure about that!";
      setDemoAnswer(answer);
      speak(answer, undefined, 1);

      if (data.mediaKeywords?.length > 0) {
        fetchMediaFunc(data.mediaKeywords, question);
      }
    } catch (error) {
      console.error("Error:", error);
      setDemoAnswer("Oops! Something went wrong. Try again!");
    } finally {
      setIsProcessing(false);
    }
  }, [speak]);

  // Unified voice input hook
  const { state: voiceState, isSupported: voiceSupported, start: startListening, stop: stopListening } = useVoiceInput({
    onTranscription: handleDemoQuestion,
  });
  
  const isListening = voiceState === "listening";
  const isVoiceProcessing = voiceState === "processing";

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else if (voiceSupported) {
      startListening();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      handleDemoQuestion(inputText.trim());
    }
  };

  return (
    <div className="min-h-dvh bg-gradient-to-b from-background to-secondary/30 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <div className="flex items-center">
          <WuaiLogo />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-accent font-semibold border-accent/30 hover:bg-accent/10 hover:border-accent/50"
          onClick={() => {
            if (window.location.origin !== CANONICAL_SITE_URL) {
              window.location.assign(`${CANONICAL_SITE_URL}/auth`);
              return;
            }
            navigate("/auth");
          }}
        >
          Sign In
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col px-4 pb-4 min-h-0">
        {/* Demo Section - Interactive Try Area */}
        <div className="bg-card rounded-2xl shadow-lg border border-border p-4 mb-4">
          <div className="text-center mb-3">
            <h2 className="text-lg font-semibold">Try it <span className="text-accent">now!</span></h2>
            <p className="text-xs text-muted-foreground font-medium">Ask any question</p>
          </div>

          {/* Demo Display Area */}
          <div className="relative rounded-xl bg-muted/30 overflow-hidden mb-3" style={{ height: "200px" }}>
            {!demoQuestion && !demoAnswer ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                <div className="w-14 h-14 rounded-full bg-secondary/50 flex items-center justify-center mb-2 animate-bounce-gentle overflow-hidden">
                  <SquidMascot size="md" animated className="scale-90" />
                </div>
                <p className="text-sm font-medium text-foreground">What do you want to know?</p>
                <p className="text-xs text-muted-foreground">Try: "Why is the sky blue?"</p>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                {/* Media Area */}
                <div className="flex-1 min-h-0">
                  <MediaGallery 
                    images={demoMedia} 
                    fullscreen 
                    isLoading={mediaLoading && demoMedia.length === 0}
                    className="w-full h-full"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Answer Text */}
          {demoAnswer && (
            <div className="bg-primary/5 rounded-lg p-3 mb-3 max-h-20 overflow-y-auto">
              <p className="text-sm leading-relaxed">{demoAnswer}</p>
            </div>
          )}

          {/* Ask Me Button - Primary CTA */}
          {voiceSupported && (
            <Button 
              onClick={handleMicClick}
              disabled={isProcessing || isVoiceProcessing}
              size="lg"
              className={`w-full mb-3 gap-2 ${isListening ? "bg-destructive hover:bg-destructive/90 animate-pulse" : ""}`}
            >
              <Mic className="w-5 h-5" />
              {isListening ? "Listening..." : isVoiceProcessing ? "Transcribing..." : isProcessing ? "Thinking..." : "Ask me anything!"}
            </Button>
          )}

          {/* Text Input - Secondary Option */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Or type your question..."
              disabled={isProcessing}
            />
            <Button type="submit" size="icon" disabled={isProcessing || !inputText.trim()}>
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>

        {/* CTA Section */}
        <div className="text-center mb-4">
          <p className="text-sm text-muted-foreground font-medium mb-3">
            Like it? Get the <span className="text-accent font-semibold">full experience!</span>
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => navigate("/app")} className="gap-2 font-semibold">
              <Sparkles className="w-4 h-4" />
              Full App
            </Button>
            <Button variant="outline" onClick={() => navigate("/auth")} className="gap-2 text-accent font-semibold border-accent/30 hover:bg-accent/10">
              <Users className="w-4 h-4" />
              Create Account
            </Button>
          </div>
        </div>

        {/* Features - Compact */}
        <div className="grid grid-cols-3 gap-2 mt-auto">
          <div className="flex flex-col items-center p-2 text-center">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-1">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <span className="text-xs font-semibold text-accent">AI Answers</span>
          </div>
          <div className="flex flex-col items-center p-2 text-center">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-1">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <span className="text-xs font-semibold text-accent">Child Profiles</span>
          </div>
          <div className="flex flex-col items-center p-2 text-center">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-1">
              <History className="w-4 h-4 text-primary" />
            </div>
            <span className="text-xs font-semibold text-accent">Save History</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-2 text-center text-xs text-muted-foreground flex-shrink-0">
        Made with ❤️ for curious minds
      </footer>
    </div>
  );
}

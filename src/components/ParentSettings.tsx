import React, { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSettings, AgeRange, AIProvider } from "@/contexts/SettingsContext";
import { Trash2, Info, Clock, Volume2, LogOut, Brain, Timer } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ParentSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface VoiceOption {
  id: string;
  displayName: string;
  gender: "male" | "female";
  voiceURI: string;
}

// 6 curated child-friendly voices (warm, gentle narration style like Thomas the Tank Engine)
const CURATED_VOICE_PREFERENCES = [
  // Female voices - warm, gentle, maternal
  { keywords: ['samantha'], displayName: 'Samantha', gender: 'female' as const },
  { keywords: ['karen'], displayName: 'Karen', gender: 'female' as const },
  { keywords: ['moira'], displayName: 'Moira', gender: 'female' as const },
  { keywords: ['victoria'], displayName: 'Victoria', gender: 'female' as const },
  { keywords: ['fiona'], displayName: 'Fiona', gender: 'female' as const },
  { keywords: ['allison'], displayName: 'Allison', gender: 'female' as const },
  // Male voices - warm, fatherly, storyteller
  { keywords: ['daniel'], displayName: 'Daniel', gender: 'male' as const },
  { keywords: ['tom', 'thomas'], displayName: 'Thomas', gender: 'male' as const },
  { keywords: ['james'], displayName: 'James', gender: 'male' as const },
  { keywords: ['oliver'], displayName: 'Oliver', gender: 'male' as const },
  { keywords: ['alex'], displayName: 'Alex', gender: 'male' as const },
  { keywords: ['aaron'], displayName: 'Aaron', gender: 'male' as const },
];

export const ParentSettings: React.FC<ParentSettingsProps> = ({
  open,
  onOpenChange,
}) => {
  const { settings, updateSetting, clearHistory, lockApp } = useSettings();
  const [voices, setVoices] = useState<VoiceOption[]>([]);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      const englishVoices = availableVoices.filter((v) => v.lang.startsWith("en"));
      
      const matchedVoices: VoiceOption[] = [];
      const usedURIs = new Set<string>();
      
      // Find matching voices for our curated list
      for (const pref of CURATED_VOICE_PREFERENCES) {
        for (const voice of englishVoices) {
          if (usedURIs.has(voice.voiceURI)) continue;
          
          const nameLower = voice.name.toLowerCase();
          if (pref.keywords.some(kw => nameLower.includes(kw))) {
            matchedVoices.push({
              id: pref.displayName.toLowerCase(),
              displayName: pref.displayName,
              gender: pref.gender,
              voiceURI: voice.voiceURI,
            });
            usedURIs.add(voice.voiceURI);
            break;
          }
        }
        
        // Stop once we have 6 voices (3 female + 3 male ideally)
        const females = matchedVoices.filter(v => v.gender === 'female').length;
        const males = matchedVoices.filter(v => v.gender === 'male').length;
        if (females >= 3 && males >= 3) break;
        if (matchedVoices.length >= 6) break;
      }
      
      // Sort: females first, then males
      matchedVoices.sort((a, b) => {
        if (a.gender === 'female' && b.gender === 'male') return -1;
        if (a.gender === 'male' && b.gender === 'female') return 1;
        return a.displayName.localeCompare(b.displayName);
      });
      
      setVoices(matchedVoices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const testVoice = () => {
    const utterance = new SpeechSynthesisUtterance("Hi! I'm Wuai, your friendly helper!");
    utterance.rate = settings.voiceSpeed;
    utterance.pitch = 1.1;
    
    if (settings.selectedVoice) {
      const voice = window.speechSynthesis.getVoices().find(
        (v) => v.voiceURI === settings.selectedVoice
      );
      if (voice) utterance.voice = voice;
    }
    
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const handleExitApp = () => {
    lockApp();
    onOpenChange(false);
    // In a real scenario, you might redirect to a parent dashboard or close the app
    window.location.href = "about:blank";
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-parent-bg">
        <SheetHeader>
          <SheetTitle className="text-xl font-bold">Parent Settings</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] mt-6">
          <div className="space-y-8 pr-4">
            {/* Child Info */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold">Child Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="child-name">Child's Name (optional)</Label>
                <Input
                  id="child-name"
                  value={settings.childName}
                  onChange={(e) => updateSetting("childName", e.target.value)}
                  placeholder="Enter name"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="age-range">Child's Age</Label>
                <Select
                  value={settings.ageRange}
                  onValueChange={(value) => updateSetting("ageRange", value as AgeRange)}
                >
                  <SelectTrigger id="age-range" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3-4">3-4 years (Toddler)</SelectItem>
                    <SelectItem value="5-6">5-6 years (Kindergarten)</SelectItem>
                    <SelectItem value="7-8">7-8 years (Early Elementary)</SelectItem>
                    <SelectItem value="9-10">9-10 years (Late Elementary)</SelectItem>
                    <SelectItem value="11-12">11-12 years (Pre-Teen)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Answers are tailored to this age group.
                </p>
              </div>
            </div>

            {/* Voice Settings */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold">Voice Settings</h3>

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label htmlFor="voice-input">Voice Input</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow asking questions by voice
                  </p>
                </div>
                <Switch
                  id="voice-input"
                  checked={settings.voiceInput}
                  onCheckedChange={(checked) => updateSetting("voiceInput", checked)}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label htmlFor="voice-output">Read Answers Aloud</Label>
                  <p className="text-sm text-muted-foreground">
                    Speak answers using text-to-speech
                  </p>
                </div>
                <Switch
                  id="voice-output"
                  checked={settings.voiceOutput}
                  onCheckedChange={(checked) => updateSetting("voiceOutput", checked)}
                />
              </div>

              {settings.voiceOutput && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="voice-select">Choose Voice</Label>
                    <div className="flex gap-2">
                      <Select
                        value={settings.selectedVoice || "default"}
                        onValueChange={(value) => updateSetting("selectedVoice", value === "default" ? "" : value)}
                      >
                        <SelectTrigger id="voice-select" className="flex-1">
                          <SelectValue placeholder="Default voice" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Default voice</SelectItem>
                          {voices.filter(v => v.gender === 'female').length > 0 && (
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              Female Voices
                            </div>
                          )}
                          {voices.filter(v => v.gender === 'female').map((voice) => (
                            <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
                              {voice.displayName}
                            </SelectItem>
                          ))}
                          {voices.filter(v => v.gender === 'male').length > 0 && (
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">
                              Male Voices
                            </div>
                          )}
                          {voices.filter(v => v.gender === 'male').map((voice) => (
                            <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
                              {voice.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={testVoice}
                        title="Test voice"
                      >
                        <Volume2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Voice Speed</Label>
                      <span className="text-sm text-muted-foreground font-medium">
                        {settings.voiceSpeed.toFixed(1)}x
                      </span>
                    </div>
                    <Slider
                      value={[settings.voiceSpeed]}
                      onValueChange={(value) => updateSetting("voiceSpeed", value[0])}
                      min={0.5}
                      max={1.5}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Slower</span>
                      <span>Faster</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Media Settings */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold">Media</h3>
              
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label htmlFor="show-media">Show Images</Label>
                  <p className="text-sm text-muted-foreground">
                    Display photos or illustrations with answers
                  </p>
                </div>
                <Switch
                  id="show-media"
                  checked={settings.showMedia}
                  onCheckedChange={(checked) => updateSetting("showMedia", checked)}
                />
              </div>
            </div>

            {/* Answer Length Settings */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold">Answer Length</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Answer Detail</Label>
                  <span className="text-sm text-muted-foreground font-medium">
                    {settings.answerLength === 1 ? "Normal" : 
                     settings.answerLength < 1 ? "Shorter" : "Longer"}
                  </span>
                </div>
                <Slider
                  value={[settings.answerLength]}
                  onValueChange={(value) => updateSetting("answerLength", value[0])}
                  min={0.5}
                  max={2}
                  step={0.25}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Brief</span>
                  <span>Detailed</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Adjust how long answers are. Default is ~15 seconds to read aloud.
                </p>
              </div>
            </div>

            {/* Timer Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4" />
                <h3 className="text-base font-semibold">Play Timer</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Timer Duration</Label>
                  <span className="text-sm text-muted-foreground font-medium">
                    {settings.timerMinutes === 0 ? "Off" : `${settings.timerMinutes} min`}
                  </span>
                </div>
                <Slider
                  value={[settings.timerMinutes]}
                  onValueChange={(value) => updateSetting("timerMinutes", value[0])}
                  min={0}
                  max={60}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Off</span>
                  <span>60 min</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Shows a sand timer that helps kids see how much time they have left.
                </p>
              </div>
            </div>

            {/* AI Provider Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4" />
                <h3 className="text-base font-semibold">AI Engine</h3>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ai-provider">Choose AI</Label>
                <Select
                  value={settings.aiProvider}
                  onValueChange={(value) => updateSetting("aiProvider", value as AIProvider)}
                >
                  <SelectTrigger id="ai-provider" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt">
                      <div className="flex flex-col">
                        <span>ChatGPT</span>
                        <span className="text-xs text-muted-foreground">Recommended</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="perplexity">
                      <div className="flex flex-col">
                        <span>Perplexity</span>
                        <span className="text-xs text-muted-foreground">Web search + images</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="gemini-pro">
                      <div className="flex flex-col">
                        <span>Gemini Pro</span>
                        <span className="text-xs text-muted-foreground">Google AI</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Different AI models have different strengths. Perplexity can search the web for current info.
                </p>
              </div>
            </div>

            {/* PIN Settings */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold">Security</h3>
              
              <div className="space-y-2">
                <Label htmlFor="pin">Parent PIN</Label>
                <Input
                  id="pin"
                  type="password"
                  value={settings.pin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                    updateSetting("pin", value);
                  }}
                  placeholder="4-digit PIN"
                  maxLength={4}
                  className="w-32"
                />
                <p className="text-sm text-muted-foreground">
                  Required to access settings or exit the app.
                </p>
              </div>
            </div>

            {/* Question History */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">Question History</h3>
                {settings.questionHistory.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearHistory}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              {settings.questionHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No questions asked yet.
                </p>
              ) : (
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {settings.questionHistory.slice(0, 10).map((item) => (
                    <div
                      key={item.id}
                      className="bg-card rounded-lg p-3 space-y-2 border"
                    >
                      <p className="font-medium text-sm">{item.question}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.answer}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tip */}
            <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Info className="w-4 h-4" />
                Tip for Parents
              </div>
              <p className="text-sm text-muted-foreground">
                For an app-like experience, add this website to your home screen:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>iOS: Tap Share → Add to Home Screen</li>
                <li>Android: Tap Menu → Add to Home Screen</li>
              </ul>
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              <Button
                className="w-full"
                size="lg"
                onClick={() => onOpenChange(false)}
              >
                Back to App
              </Button>
              
              <Button
                variant="outline"
                className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                size="lg"
                onClick={handleExitApp}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Exit App
              </Button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

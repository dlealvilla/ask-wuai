import React, { useState, useEffect } from "react";
import { Menu, Users, LogOut, LogIn, Volume2, Mic, Image, Timer, Brain, ChevronRight, Sparkles } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSettings, AgeRange, AIProvider } from "@/contexts/SettingsContext";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ELEVENLABS_VOICES, useElevenLabsTTS, isElevenLabsAvailable } from "@/hooks/useElevenLabsTTS";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { Badge } from "@/components/ui/badge";

interface AppMenuProps {
  onChildrenClick: () => void;
}

interface NativeVoiceOption {
  id: string;
  displayName: string;
  gender: "male" | "female";
  voiceURI: string;
  type: "native";
}

// Curated child-friendly native voices
const CURATED_VOICE_PREFERENCES = [
  { keywords: ['samantha'], displayName: 'Samantha', gender: 'female' as const },
  { keywords: ['karen'], displayName: 'Karen', gender: 'female' as const },
  { keywords: ['moira'], displayName: 'Moira', gender: 'female' as const },
  { keywords: ['victoria'], displayName: 'Victoria', gender: 'female' as const },
  { keywords: ['fiona'], displayName: 'Fiona', gender: 'female' as const },
  { keywords: ['allison'], displayName: 'Allison', gender: 'female' as const },
  { keywords: ['daniel'], displayName: 'Daniel', gender: 'male' as const },
  { keywords: ['tom', 'thomas'], displayName: 'Thomas', gender: 'male' as const },
  { keywords: ['james'], displayName: 'James', gender: 'male' as const },
  { keywords: ['oliver'], displayName: 'Oliver', gender: 'male' as const },
  { keywords: ['alex'], displayName: 'Alex', gender: 'male' as const },
  { keywords: ['aaron'], displayName: 'Aaron', gender: 'male' as const },
];

export const AppMenu: React.FC<AppMenuProps> = ({ onChildrenClick }) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { settings, updateSetting } = useSettings();
  const [nativeVoices, setNativeVoices] = useState<NativeVoiceOption[]>([]);
  const [open, setOpen] = useState(false);
  const [elevenLabsAvailable, setElevenLabsAvailable] = useState(isElevenLabsAvailable());
  
  const { speak: speakNative, stop: stopNative } = useSpeechSynthesis();
  const { speak: speakElevenLabs, stop: stopElevenLabs, isLoading: elevenLabsLoading } = useElevenLabsTTS();

  // Listen for ElevenLabs availability changes
  useEffect(() => {
    const handleUnavailable = () => {
      setElevenLabsAvailable(false);
      // If current voice is ElevenLabs, switch to system voice
      if (settings.selectedVoice && ELEVENLABS_VOICES.some(v => v.id === settings.selectedVoice)) {
        updateSetting("selectedVoice", "");
      }
    };

    window.addEventListener("elevenlabs-unavailable", handleUnavailable);
    return () => window.removeEventListener("elevenlabs-unavailable", handleUnavailable);
  }, [settings.selectedVoice, updateSetting]);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      const englishVoices = availableVoices.filter((v) => v.lang.startsWith("en"));
      
      const matchedVoices: NativeVoiceOption[] = [];
      const usedURIs = new Set<string>();
      
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
              type: "native",
            });
            usedURIs.add(voice.voiceURI);
            break;
          }
        }
        
        const females = matchedVoices.filter(v => v.gender === 'female').length;
        const males = matchedVoices.filter(v => v.gender === 'male').length;
        if (females >= 3 && males >= 3) break;
        if (matchedVoices.length >= 6) break;
      }
      
      matchedVoices.sort((a, b) => {
        if (a.gender === 'female' && b.gender === 'male') return -1;
        if (a.gender === 'male' && b.gender === 'female') return 1;
        return a.displayName.localeCompare(b.displayName);
      });
      
      setNativeVoices(matchedVoices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const isElevenLabsVoice = (voiceId: string) => {
    return ELEVENLABS_VOICES.some(v => v.id === voiceId);
  };

  const testVoice = async () => {
    const testText = "Hi! I'm Wuai, your friendly helper!";
    const voiceId = settings.selectedVoice;
    
    stopNative();
    stopElevenLabs();
    
    if (voiceId && isElevenLabsVoice(voiceId) && elevenLabsAvailable) {
      try {
        await speakElevenLabs(testText, voiceId, settings.voiceSpeed);
      } catch (e) {
        // Fallback to system voice if ElevenLabs fails
        speakNative(testText, undefined, settings.voiceSpeed);
      }
    } else {
      speakNative(testText, voiceId || undefined, settings.voiceSpeed);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
    navigate("/");
  };

  const handleChildrenClick = () => {
    setOpen(false);
    onChildrenClick();
  };

  const femaleElevenLabs = ELEVENLABS_VOICES.filter(v => v.gender === 'female');
  const maleElevenLabs = ELEVENLABS_VOICES.filter(v => v.gender === 'male');
  const femaleNative = nativeVoices.filter(v => v.gender === 'female');
  const maleNative = nativeVoices.filter(v => v.gender === 'male');

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center hover:bg-muted transition-colors"
          aria-label="Menu"
        >
          <Menu className="w-7 h-7 text-muted-foreground" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-lg font-semibold">Settings</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-6rem)] mt-4 pr-4">
          <div className="space-y-5">
            {/* Child Profiles */}
            {user && (
              <>
                <button
                  onClick={handleChildrenClick}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-primary" />
                    <div className="text-left">
                      <p className="font-medium text-sm">Manage Children</p>
                      <p className="text-xs text-muted-foreground">Add or switch child profiles</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
                <Separator />
              </>
            )}

            {/* Voice Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Voice</h3>
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="voice-input" className="text-sm">Voice Input</Label>
                <Switch
                  id="voice-input"
                  checked={settings.voiceInput}
                  onCheckedChange={(checked) => updateSetting("voiceInput", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="voice-output" className="text-sm">Read Aloud</Label>
                <Switch
                  id="voice-output"
                  checked={settings.voiceOutput}
                  onCheckedChange={(checked) => updateSetting("voiceOutput", checked)}
                />
              </div>

              {settings.voiceOutput && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm">Voice</Label>
                    <div className="flex gap-2">
                      <Select
                        value={settings.selectedVoice ? settings.selectedVoice : "system"}
                        onValueChange={(value) => updateSetting("selectedVoice", value === "system" ? "" : value)}
                      >
                        <SelectTrigger className="flex-1 h-9">
                          <SelectValue placeholder="Select a voice" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="system">System voice</SelectItem>
                          
                          {/* ElevenLabs Premium Voices - only show if available */}
                          {elevenLabsAvailable && (
                            <>
                              <div className="px-2 py-1.5 text-xs font-semibold text-primary flex items-center gap-1 border-t mt-1 pt-2">
                                <Sparkles className="w-3 h-3" />
                                Premium Voices
                              </div>
                              
                              {femaleElevenLabs.length > 0 && (
                                <div className="px-2 py-1 text-[10px] text-muted-foreground">Female</div>
                              )}
                              {femaleElevenLabs.map((voice) => (
                                <SelectItem key={voice.id} value={voice.id}>
                                  <div className="flex items-center gap-2">
                                    <span>{voice.name}</span>
                                    <span className="text-[10px] text-muted-foreground">{voice.description}</span>
                                  </div>
                                </SelectItem>
                              ))}
                              
                              {maleElevenLabs.length > 0 && (
                                <div className="px-2 py-1 text-[10px] text-muted-foreground">Male</div>
                              )}
                              {maleElevenLabs.map((voice) => (
                                <SelectItem key={voice.id} value={voice.id}>
                                  <div className="flex items-center gap-2">
                                    <span>{voice.name}</span>
                                    <span className="text-[10px] text-muted-foreground">{voice.description}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </>
                          )}
                          
                          {/* Native Voices */}
                          {(femaleNative.length > 0 || maleNative.length > 0) && (
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">
                              System Voices
                            </div>
                          )}
                          
                          {femaleNative.length > 0 && (
                            <div className="px-2 py-1 text-[10px] text-muted-foreground">Female</div>
                          )}
                          {femaleNative.map((voice) => (
                            <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
                              {voice.displayName}
                            </SelectItem>
                          ))}
                          
                          {maleNative.length > 0 && (
                            <div className="px-2 py-1 text-[10px] text-muted-foreground">Male</div>
                          )}
                          {maleNative.map((voice) => (
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
                        className="h-9 w-9"
                        disabled={elevenLabsLoading}
                      >
                        <Volume2 className="w-4 h-4" />
                      </Button>
                    </div>
                    {settings.selectedVoice && isElevenLabsVoice(settings.selectedVoice) && (
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        Premium voice
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Speed</Label>
                      <span className="text-xs text-muted-foreground font-medium">
                        {settings.voiceSpeed.toFixed(1)}x
                      </span>
                    </div>
                    <Slider
                      value={[settings.voiceSpeed]}
                      onValueChange={(value) => updateSetting("voiceSpeed", value[0])}
                      min={0.75}
                      max={1.25}
                      step={0.05}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Slower</span>
                      <span>Normal</span>
                      <span>Faster</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <Separator />

            {/* Media & Answers */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Image className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Content</h3>
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="show-media" className="text-sm">Show Images</Label>
                <Switch
                  id="show-media"
                  checked={settings.showMedia}
                  onCheckedChange={(checked) => updateSetting("showMedia", checked)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Answer Length</Label>
                  <span className="text-xs text-muted-foreground font-medium">
                    {settings.answerLength <= 0.75 ? "Brief" : settings.answerLength >= 1.5 ? "Detailed" : "Normal"}
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
              </div>
            </div>

            <Separator />

            {/* Timer */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Timer</h3>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Play Timer</Label>
                  <span className="text-xs text-muted-foreground font-medium">
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
              </div>
            </div>

            <Separator />

            {/* AI Engine */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">AI Engine</h3>
              </div>
              
              <Select
                value={settings.aiProvider}
                onValueChange={(value) => updateSetting("aiProvider", value as AIProvider)}
              >
                <SelectTrigger className="w-full h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt">ChatGPT (Recommended)</SelectItem>
                  <SelectItem value="perplexity">Perplexity (Web search)</SelectItem>
                  <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Account */}
            <div className="pt-2 pb-4">
              {user ? (
                <Button
                  variant="outline"
                  className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => { setOpen(false); navigate("/auth"); }}
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

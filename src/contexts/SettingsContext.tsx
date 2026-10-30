import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { ELEVENLABS_VOICES } from "@/hooks/useElevenLabsTTS";

export type AgeRange = "3-4" | "5-6" | "7-8" | "9-10" | "11-12";
export type AIProvider = "gemini-pro" | "gpt" | "perplexity";

interface QuestionHistoryItem {
  id: string;
  question: string;
  answer: string;
  timestamp: Date;
}

export interface Child {
  id: string;
  name: string;
  age_range: string;
  avatar: string | null;
}

interface Settings {
  ageRange: AgeRange;
  childName: string;
  voiceInput: boolean;
  voiceOutput: boolean;
  selectedVoice: string;
  voiceSpeed: number;
  showMedia: boolean;
  aiProvider: AIProvider;
  pin: string;
  questionHistory: QuestionHistoryItem[];
  isLocked: boolean;
  timerMinutes: number;
  answerLength: number;
}

interface SettingsContextType {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  addToHistory: (question: string, answer: string, childId?: string) => void;
  clearHistory: () => void;
  unlockApp: () => void;
  lockApp: () => void;
  // Multi-child support
  children: Child[];
  activeChild: Child | null;
  loadingChildren: boolean;
  addChild: (name: string, ageRange: AgeRange) => Promise<void>;
  removeChild: (childId: string) => Promise<void>;
  setActiveChild: (child: Child | null) => void;
}

const DEFAULT_PREMIUM_VOICE_ID = ELEVENLABS_VOICES[0]?.id || "";

const defaultSettings: Settings = {
  ageRange: "5-6",
  childName: "",
  voiceInput: true,
  voiceOutput: true,
  // Default to a premium (ElevenLabs) voice
  selectedVoice: DEFAULT_PREMIUM_VOICE_ID,
  voiceSpeed: 1.0,
  showMedia: true,
  aiProvider: "gpt",
  pin: "1234",
  questionHistory: [],
  isLocked: true,
  timerMinutes: 0,
  answerLength: 0.7,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const STORAGE_KEY = "curious-buddy-settings";
const ACTIVE_CHILD_KEY = "curious-buddy-active-child";

// Map database columns to Settings keys
const dbToSettingsMap: Record<string, keyof Settings> = {
  age_range: "ageRange",
  child_name: "childName",
  voice_input: "voiceInput",
  voice_output: "voiceOutput",
  selected_voice: "selectedVoice",
  voice_speed: "voiceSpeed",
  show_media: "showMedia",
  ai_provider: "aiProvider",
  pin: "pin",
  timer_minutes: "timerMinutes",
  answer_length: "answerLength",
};

const settingsToDbMap: Record<string, string> = {
  ageRange: "age_range",
  childName: "child_name",
  voiceInput: "voice_input",
  voiceOutput: "voice_output",
  selectedVoice: "selected_voice",
  voiceSpeed: "voice_speed",
  showMedia: "show_media",
  aiProvider: "ai_provider",
  pin: "pin",
  timerMinutes: "timer_minutes",
  answerLength: "answer_length",
};

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children: childrenProp }) => {
  const [user, setUser] = useState<User | null>(null);
  const [childrenList, setChildrenList] = useState<Child[]>([]);
  const [activeChild, setActiveChildState] = useState<Child | null>(null);
  const [loadingChildren, setLoadingChildren] = useState(false);
  
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const selectedVoiceFromStorage = parsed.selectedVoice;
        const normalizedSelectedVoice =
          typeof selectedVoiceFromStorage === "string" && selectedVoiceFromStorage.trim()
            ? selectedVoiceFromStorage
            : DEFAULT_PREMIUM_VOICE_ID;

        // Migrate gemini-flash to gpt if present
        const aiProvider = parsed.aiProvider === "gemini-flash" ? "gpt" : (parsed.aiProvider || defaultSettings.aiProvider);
        
        return {
          ...defaultSettings,
          ...parsed,
          selectedVoice: normalizedSelectedVoice,
          aiProvider: aiProvider as AIProvider,
          questionHistory: (parsed.questionHistory || []).map((item: any) => ({
            ...item,
            timestamp: new Date(item.timestamp),
          })),
        };
      }
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
    return defaultSettings;
  });

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load children when user logs in
  useEffect(() => {
    if (!user) {
      setChildrenList([]);
      setActiveChildState(null);
      return;
    }

    const loadChildren = async () => {
      setLoadingChildren(true);
      const { data, error } = await supabase
        .from("children")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error loading children:", error);
      } else {
        setChildrenList(data || []);
        
        // Restore active child from localStorage
        const storedActiveChildId = localStorage.getItem(ACTIVE_CHILD_KEY);
        if (storedActiveChildId && data) {
          const found = data.find((c) => c.id === storedActiveChildId);
          if (found) {
            setActiveChildState(found);
            // Sync settings with active child
            setSettings((prev) => ({
              ...prev,
              childName: found.name,
              ageRange: found.age_range as AgeRange,
            }));
          } else if (data.length > 0) {
            // Default to first child
            setActiveChildState(data[0]);
            setSettings((prev) => ({
              ...prev,
              childName: data[0].name,
              ageRange: data[0].age_range as AgeRange,
            }));
          }
        } else if (data && data.length > 0) {
          setActiveChildState(data[0]);
          setSettings((prev) => ({
            ...prev,
            childName: data[0].name,
            ageRange: data[0].age_range as AgeRange,
          }));
        }
      }
      setLoadingChildren(false);
    };

    loadChildren();
  }, [user]);

  // Load settings from database when user logs in
  useEffect(() => {
    if (!user) return;

    const loadUserSettings = async () => {
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading user settings:", error);
        return;
      }

      if (data) {
        // Map database fields to settings
        const dbSettings: Partial<Settings> = {};
        for (const [dbKey, settingsKey] of Object.entries(dbToSettingsMap)) {
          if (data[dbKey] !== undefined && data[dbKey] !== null) {
            (dbSettings as any)[settingsKey] = data[dbKey];
          }
        }

        const dbSelectedVoice = (dbSettings.selectedVoice || "").toString().trim();
        const normalizedSelectedVoice = dbSelectedVoice ? dbSelectedVoice : DEFAULT_PREMIUM_VOICE_ID;

        setSettings((prev) => ({
          ...prev,
          ...dbSettings,
          selectedVoice: normalizedSelectedVoice,
        }));
      } else {
        // Create initial settings record for user
        await supabase.from("user_settings").insert([{
          user_id: user.id,
          age_range: settings.ageRange,
          child_name: settings.childName,
          voice_input: settings.voiceInput,
          voice_output: settings.voiceOutput,
          selected_voice: settings.selectedVoice || DEFAULT_PREMIUM_VOICE_ID,
          voice_speed: settings.voiceSpeed,
          show_media: settings.showMedia,
          ai_provider: settings.aiProvider,
          pin: settings.pin,
          timer_minutes: settings.timerMinutes,
          answer_length: settings.answerLength,
        }]);
      }
    };

    loadUserSettings();
  }, [user]);

  // Save to localStorage always (for offline/guest use)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error("Failed to save settings:", e);
    }
  }, [settings]);

  const setActiveChild = useCallback((child: Child | null) => {
    setActiveChildState(child);
    if (child) {
      localStorage.setItem(ACTIVE_CHILD_KEY, child.id);
      // Update settings to match child
      setSettings((prev) => ({
        ...prev,
        childName: child.name,
        ageRange: child.age_range as AgeRange,
      }));
    } else {
      localStorage.removeItem(ACTIVE_CHILD_KEY);
    }
  }, []);

  const addChild = useCallback(async (name: string, ageRange: AgeRange) => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("children")
      .insert([{
        user_id: user.id,
        name,
        age_range: ageRange,
      }])
      .select()
      .single();

    if (error) {
      console.error("Error adding child:", error);
      return;
    }

    if (data) {
      setChildrenList((prev) => [...prev, data]);
      // Auto-select if first child
      if (childrenList.length === 0) {
        setActiveChild(data);
      }
    }
  }, [user, childrenList.length, setActiveChild]);

  const removeChild = useCallback(async (childId: string) => {
    if (!user) return;
    
    const { error } = await supabase
      .from("children")
      .delete()
      .eq("id", childId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error removing child:", error);
      return;
    }

    setChildrenList((prev) => prev.filter((c) => c.id !== childId));
    
    // If removed child was active, select another
    if (activeChild?.id === childId) {
      const remaining = childrenList.filter((c) => c.id !== childId);
      setActiveChild(remaining.length > 0 ? remaining[0] : null);
    }
  }, [user, activeChild, childrenList, setActiveChild]);

  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));

    // Sync to database if user is logged in and it's a synced setting
    if (user && settingsToDbMap[key]) {
      const dbKey = settingsToDbMap[key];
      supabase
        .from("user_settings")
        .update({ [dbKey]: value })
        .eq("user_id", user.id)
        .then(({ error }) => {
          if (error) console.error("Failed to sync setting:", error);
        });
    }
  }, [user]);

  const addToHistory = useCallback(async (question: string, answer: string, childId?: string) => {
    const newItem: QuestionHistoryItem = {
      id: crypto.randomUUID(),
      question,
      answer,
      timestamp: new Date(),
    };

    // Update local state
    setSettings((prev) => ({
      ...prev,
      questionHistory: [newItem, ...prev.questionHistory].slice(0, 20),
    }));

    // Save to database - check for current session directly instead of relying on state
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { error } = await supabase
        .from("qa_history")
        .insert([{
          user_id: session.user.id,
          question,
          answer,
          child_id: childId || activeChild?.id || null,
        }]);
      if (error) console.error("Failed to save Q&A to history:", error);
    }
  }, [activeChild]);

  const clearHistory = () => {
    setSettings((prev) => ({ ...prev, questionHistory: [] }));
  };

  const unlockApp = () => {
    setSettings((prev) => ({ ...prev, isLocked: false }));
  };

  const lockApp = () => {
    setSettings((prev) => ({ ...prev, isLocked: true }));
  };

  return (
    <SettingsContext.Provider value={{
      settings,
      updateSetting,
      addToHistory,
      clearHistory,
      unlockApp,
      lockApp,
      children: childrenList,
      activeChild,
      loadingChildren,
      addChild,
      removeChild,
      setActiveChild,
    }}>
      {childrenProp}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};

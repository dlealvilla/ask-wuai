import React, { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Loader2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSettings, Child } from "@/contexts/SettingsContext";
import { formatDistanceToNow } from "date-fns";

interface QAItem {
  id: string;
  question: string;
  answer: string;
  created_at: string;
  media_urls?: string[] | null;
  child_id?: string | null;
}

interface QAHistorySheetProps {
  onSelectQuestion?: (question: string, answer: string) => void;
}

// Generate consistent color for a child based on their ID
const getChildColor = (childId: string | null | undefined, children: Child[]): string => {
  if (!childId) return "border-border/50";
  
  const colors = [
    "border-l-rose-400",
    "border-l-sky-400",
    "border-l-amber-400",
    "border-l-emerald-400",
    "border-l-violet-400",
    "border-l-orange-400",
  ];
  
  const index = children.findIndex((c) => c.id === childId);
  return index >= 0 ? colors[index % colors.length] : "border-border/50";
};

const getChildName = (childId: string | null | undefined, children: Child[]): string | null => {
  if (!childId) return null;
  const child = children.find((c) => c.id === childId);
  return child?.name || null;
};

export const QAHistorySheet: React.FC<QAHistorySheetProps> = ({ onSelectQuestion }) => {
  const { user } = useAuth();
  const { settings, children } = useSettings();
  const [history, setHistory] = useState<QAItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && user) {
      loadHistory();
    } else if (open && !user) {
      // Use local history for guests
      setHistory(
        settings.questionHistory.map((item) => ({
          id: item.id,
          question: item.question,
          answer: item.answer,
          created_at: item.timestamp.toISOString(),
        }))
      );
    }
  }, [open, user]);

  const loadHistory = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("qa_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error("Error loading history:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item: QAItem) => {
    onSelectQuestion?.(item.question, item.answer);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="w-14 h-14 flex items-center justify-center rounded-2xl bg-secondary hover:bg-muted transition-colors"
          aria-label="Question history"
        >
          <History className="w-7 h-7 text-muted-foreground" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Past Questions
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] mt-4 pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No questions yet!</p>
              <p className="text-xs mt-1">Your questions will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => {
                const childName = getChildName(item.child_id, children);
                const colorClass = getChildColor(item.child_id, children);
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`w-full text-left p-3 rounded-xl bg-card border border-border/50 hover:border-primary/30 hover:bg-muted/50 transition-colors border-l-4 ${colorClass}`}
                  >
                    {childName && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <User className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {childName}
                        </span>
                      </div>
                    )}
                    <p className="text-sm font-medium text-foreground line-clamp-2 mb-1">
                      {item.question}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {item.answer}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-2">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

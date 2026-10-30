import React from "react";
import { cn } from "@/lib/utils";
import { Volume2 } from "lucide-react";
import { SquidMascot } from "./SquidMascot";

interface AnswerBubbleProps {
  answer: string;
  isSpeaking: boolean;
  className?: string;
  compact?: boolean;
}

export const AnswerBubble: React.FC<AnswerBubbleProps> = ({ answer, isSpeaking, className, compact = false }) => {
  if (!answer) return null;

  if (compact) {
    return (
      <div className={cn("animate-fade-in", className)}>
        <div className="bg-card rounded-xl px-4 py-3 shadow-montessori border border-border/30">
          <div className="flex items-start gap-2.5">
            <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-earth-sage flex items-center justify-center overflow-hidden">
              <SquidMascot size="sm" className="scale-75" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {isSpeaking && (
                  <Volume2 className="w-3.5 h-3.5 text-accent animate-pulse" />
                )}
              </div>
              <p className="text-sm leading-relaxed text-foreground line-clamp-4">
                {answer}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Original full view
  return (
    <div className={cn("animate-fade-in-up", className)} style={{ animationDelay: "0.1s" }}>
      <div className="bg-card rounded-xl px-5 py-4 max-w-[90%] shadow-montessori border border-border/30">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-earth-sage flex items-center justify-center overflow-hidden">
            <SquidMascot size="sm" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-semibold text-primary">Wuai</p>
              {isSpeaking && (
                <Volume2 className="w-4 h-4 text-accent animate-pulse" />
              )}
            </div>
            <p className="text-base leading-relaxed text-foreground whitespace-pre-wrap">
              {answer}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from "react";
import { cn } from "@/lib/utils";

interface QuestionBubbleProps {
  question: string;
  className?: string;
}

export const QuestionBubble: React.FC<QuestionBubbleProps> = ({ question, className }) => {
  if (!question) return null;

  return (
    <div className={cn("animate-fade-in-up", className)}>
      <div className="bubble-child rounded-bubble px-3 py-1.5 max-w-[85%] ml-auto">
        <p className="text-xs text-foreground/60 leading-tight">{question}</p>
      </div>
    </div>
  );
};

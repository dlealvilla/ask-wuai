import React from "react";
import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { SquidMascot } from "./SquidMascot";

interface MicButtonProps {
  isListening: boolean;
  isProcessing: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export const MicButton: React.FC<MicButtonProps> = ({
  isListening,
  isProcessing,
  onClick,
  disabled,
}) => {
  return (
    <div className="relative flex items-center justify-center">
      {/* Soft pulse rings when listening */}
      {isListening && (
        <>
          <div className="absolute inset-0 rounded-full bg-accent/25 animate-pulse-ring" />
          <div className="absolute inset-0 rounded-full bg-accent/15 animate-pulse-ring" style={{ animationDelay: "0.6s" }} />
        </>
      )}

      <button
        onClick={onClick}
        disabled={disabled || isProcessing}
        className={cn(
          "relative z-10 w-[4.8rem] h-[4.8rem] sm:w-[6.08rem] sm:h-[6.08rem] rounded-full flex flex-col items-center justify-center gap-1",
          "transition-all duration-300 ease-out transform active:scale-95",
          "shadow-montessori hover:shadow-glow",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "border-2",
          isListening
            ? "mic-listening border-accent/30 shadow-glow-accent scale-105"
            : "mic-gradient border-primary/20 hover:scale-105"
        )}
        aria-label={isListening ? "Listening for your question" : "Press to ask a question"}
      >
        {isProcessing ? (
          <SquidMascot size="md" animated light className="scale-75" />
        ) : (
          <Mic className={cn(
            "w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground transition-transform",
            isListening && "animate-bounce-gentle"
          )} />
        )}
        <span className="text-[9px] sm:text-[10px] font-medium text-primary-foreground/90 px-1 text-center leading-tight tracking-wide">
          {isProcessing
            ? "Thinking..."
            : isListening
            ? "Listening..."
            : "Ask Wuai"}
        </span>
      </button>
    </div>
  );
};

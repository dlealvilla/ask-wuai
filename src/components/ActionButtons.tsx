import React from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, MessageCircle } from "lucide-react";

interface ActionButtonsProps {
  onTellMore: () => void;
  onSimplify: () => void;
  disabled?: boolean;
  show: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onTellMore,
  onSimplify,
  disabled,
  show,
}) => {
  if (!show) return null;

  return (
    <div className="flex gap-3 justify-center animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
      <Button
        variant="secondary"
        size="lg"
        onClick={onTellMore}
        disabled={disabled}
        className="rounded-full px-5 py-3 h-auto font-semibold text-sm shadow-soft"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Tell me more!
      </Button>
      <Button
        variant="outline"
        size="lg"
        onClick={onSimplify}
        disabled={disabled}
        className="rounded-full px-5 py-3 h-auto font-semibold text-sm shadow-soft border-2"
      >
        <MessageCircle className="w-4 h-4 mr-2" />
        Make it simpler
      </Button>
    </div>
  );
};

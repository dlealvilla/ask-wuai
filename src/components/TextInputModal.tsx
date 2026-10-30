import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { primeAudioPool } from "@/hooks/useElevenLabsTTS";

interface TextInputModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (question: string) => void;
}

export const TextInputModal: React.FC<TextInputModalProps> = ({
  open,
  onOpenChange,
  onSubmit,
}) => {
  const [question, setQuestion] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) {
      // CRITICAL: Prime audio pool during user gesture (form submit) for iOS Safari
      primeAudioPool();
      
      onSubmit(question.trim());
      setQuestion("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-center text-base">
            Type your question 📝
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What would you like to know?"
            className="text-sm h-10"
            autoFocus
          />
          <Button
            type="submit"
            className="w-full h-10 text-sm font-semibold"
            disabled={!question.trim()}
          >
            <Send className="w-4 h-4 mr-2" />
            Ask!
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  correctPin: string;
  onSuccess: () => void;
}

export const PinDialog: React.FC<PinDialogProps> = ({
  open,
  onOpenChange,
  correctPin,
  onSuccess,
}) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);

      if (newPin.length === 4) {
        if (newPin === correctPin) {
          setTimeout(() => {
            setPin("");
            onSuccess();
            onOpenChange(false);
          }, 200);
        } else {
          setError(true);
          setTimeout(() => {
            setPin("");
            setError(false);
          }, 500);
        }
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError(false);
  };

  const handleClose = () => {
    setPin("");
    setError(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xs bg-parent-bg">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-bold text-foreground">
            Parent Access
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          {/* PIN dots */}
          <div className="flex gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  "w-4 h-4 rounded-full transition-all duration-200",
                  pin.length > i
                    ? error
                      ? "bg-destructive"
                      : "bg-primary"
                    : "bg-muted border-2 border-border"
                )}
              />
            ))}
          </div>

          {error && (
            <p className="text-sm text-destructive font-medium">
              Incorrect PIN
            </p>
          )}

          {/* Number pad */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <Button
                key={num}
                variant="outline"
                className="w-14 h-14 text-xl font-bold rounded-xl"
                onClick={() => handleNumberClick(num.toString())}
              >
                {num}
              </Button>
            ))}
            <div />
            <Button
              variant="outline"
              className="w-14 h-14 text-xl font-bold rounded-xl"
              onClick={() => handleNumberClick("0")}
            >
              0
            </Button>
            <Button
              variant="ghost"
              className="w-14 h-14 text-sm font-medium rounded-xl"
              onClick={handleDelete}
              disabled={pin.length === 0}
            >
              Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

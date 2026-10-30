import { useEffect, useState } from "react";

interface SandTimerProps {
  totalMinutes: number;
  remainingSeconds: number;
  isActive: boolean;
  compact?: boolean;
  onComplete?: () => void;
}

export const SandTimer = ({ totalMinutes, remainingSeconds, isActive, compact = false, onComplete }: SandTimerProps) => {
  const totalSeconds = totalMinutes * 60;
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  
  const topSandLevel = progress;
  const bottomSandLevel = 1 - progress;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg">
        {/* Mini sand timer */}
        <svg viewBox="0 0 100 140" className="w-6 h-8">
          <path
            d="M20 10 Q20 5 30 5 L70 5 Q80 5 80 10 L80 50 Q80 60 50 70 Q20 60 20 50 Z"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="4"
            className="opacity-60"
          />
          <path
            d="M20 130 Q20 135 30 135 L70 135 Q80 135 80 130 L80 90 Q80 80 50 70 Q20 80 20 90 Z"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="4"
            className="opacity-60"
          />
          <clipPath id="topBulbCompact">
            <path d="M22 12 Q22 8 30 8 L70 8 Q78 8 78 12 L78 50 Q78 58 50 68 Q22 58 22 50 Z" />
          </clipPath>
          <rect
            x="20"
            y={12 + (1 - topSandLevel) * 56}
            width="60"
            height={topSandLevel * 56}
            fill="hsl(var(--primary))"
            clipPath="url(#topBulbCompact)"
            className="transition-all duration-1000 ease-linear opacity-80"
          />
          <clipPath id="bottomBulbCompact">
            <path d="M22 128 Q22 132 30 132 L70 132 Q78 132 78 128 L78 90 Q78 82 50 72 Q22 82 22 90 Z" />
          </clipPath>
          <rect
            x="20"
            y={132 - bottomSandLevel * 56}
            width="60"
            height={bottomSandLevel * 56}
            fill="hsl(var(--primary))"
            clipPath="url(#bottomBulbCompact)"
            className="transition-all duration-1000 ease-linear opacity-80"
          />
          {isActive && topSandLevel > 0 && (
            <line
              x1="50"
              y1="68"
              x2="50"
              y2="72"
              stroke="hsl(var(--primary))"
              strokeWidth="4"
              className="animate-pulse opacity-80"
            />
          )}
        </svg>
        
        <span className="text-lg font-bold text-foreground font-mono">
          {formatTime(remainingSeconds)}
        </span>
        
        {remainingSeconds === 0 && totalMinutes > 0 && (
          <span className="text-sm">🎉</span>
        )}
      </div>
    );
  }

  // Full size timer (original)
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-4xl font-bold text-primary font-mono">
        {formatTime(remainingSeconds)}
      </div>
      
      <div className="relative w-24 h-32">
        <svg viewBox="0 0 100 140" className="w-full h-full">
          <path
            d="M20 10 Q20 5 30 5 L70 5 Q80 5 80 10 L80 50 Q80 60 50 70 Q20 60 20 50 Z"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="3"
            className="opacity-60"
          />
          <path
            d="M20 130 Q20 135 30 135 L70 135 Q80 135 80 130 L80 90 Q80 80 50 70 Q20 80 20 90 Z"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="3"
            className="opacity-60"
          />
          <clipPath id="topBulb">
            <path d="M22 12 Q22 8 30 8 L70 8 Q78 8 78 12 L78 50 Q78 58 50 68 Q22 58 22 50 Z" />
          </clipPath>
          <rect
            x="20"
            y={12 + (1 - topSandLevel) * 56}
            width="60"
            height={topSandLevel * 56}
            fill="hsl(var(--primary))"
            clipPath="url(#topBulb)"
            className="transition-all duration-1000 ease-linear opacity-80"
          />
          <clipPath id="bottomBulb">
            <path d="M22 128 Q22 132 30 132 L70 132 Q78 132 78 128 L78 90 Q78 82 50 72 Q22 82 22 90 Z" />
          </clipPath>
          <rect
            x="20"
            y={132 - bottomSandLevel * 56}
            width="60"
            height={bottomSandLevel * 56}
            fill="hsl(var(--primary))"
            clipPath="url(#bottomBulb)"
            className="transition-all duration-1000 ease-linear opacity-80"
          />
          {isActive && topSandLevel > 0 && (
            <line
              x1="50"
              y1="68"
              x2="50"
              y2="72"
              stroke="hsl(var(--primary))"
              strokeWidth="3"
              className="animate-pulse opacity-80"
            />
          )}
        </svg>
      </div>
      
      <div className="text-lg font-medium text-muted-foreground">
        {!isActive && remainingSeconds === 0 && totalMinutes > 0 && (
          <span className="text-destructive animate-pulse">Time's up! 🎉</span>
        )}
        {!isActive && remainingSeconds > 0 && (
          <span>Paused</span>
        )}
        {isActive && (
          <span className="text-primary">Playing...</span>
        )}
      </div>
    </div>
  );
};

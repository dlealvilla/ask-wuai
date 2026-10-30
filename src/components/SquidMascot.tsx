import React from "react";

interface SquidMascotProps {
  size?: "sm" | "md" | "lg";
  animated?: boolean;
  className?: string;
  light?: boolean; // Use light colors for dark backgrounds
}

export const SquidMascot: React.FC<SquidMascotProps> = ({ 
  size = "md", 
  animated = false,
  className = "",
  light = false
}) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-16 h-16",
    lg: "w-24 h-24",
  };
  
  // Lime Scooter Green: hsl(145, 65%, 42%) - softer, more teal-ish
  const limeColor = "#2D9D5B";
  // Violet: hsl(270, 70%, 60%)
  const violetColor = "#A855F7";
  
  const bodyFill = light ? "white" : limeColor;
  const tentacleStroke = light ? "white" : limeColor;
  const accentStroke = violetColor;

  return (
    <svg
      viewBox="0 0 100 120"
      className={`${sizeClasses[size]} ${className}`}
      style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.15))" }}
    >
      {/* Pointy head */}
      <path
        d="M 50 5 Q 70 15 70 35 L 70 50 Q 70 60 50 65 Q 30 60 30 50 L 30 35 Q 30 15 50 5"
        fill={bodyFill}
      />
      
      {/* Body */}
      <ellipse cx="50" cy="60" rx="22" ry="15" fill={bodyFill} />
      
      {/* Teacher glasses - violet frames */}
      <circle cx="42" cy="35" r="8" stroke={violetColor} strokeWidth="2.5" fill="white" />
      <circle cx="58" cy="35" r="8" stroke={violetColor} strokeWidth="2.5" fill="white" />
      <line x1="50" y1="35" x2="50" y2="35" stroke={violetColor} strokeWidth="2.5" />
      <path d="M 34 35 L 28 32" stroke={violetColor} strokeWidth="2" strokeLinecap="round" />
      <path d="M 66 35 L 72 32" stroke={violetColor} strokeWidth="2" strokeLinecap="round" />
      
      {/* Eyes behind glasses */}
      <circle cx="42" cy="36" r="3" fill="#1a1a2e" />
      <circle cx="58" cy="36" r="3" fill="#1a1a2e" />
      {/* Eye shine */}
      <circle cx="43" cy="34" r="1" fill="white" />
      <circle cx="59" cy="34" r="1" fill="white" />
      
      {/* Wise smile */}
      <path
        d="M 44 48 Q 50 52 56 48"
        stroke="#1a1a2e"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      
      {/* Regular tentacles (6 shorter ones) - lime green */}
      <path
        d="M 32 70 Q 22 85 20 100"
        stroke={tentacleStroke}
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        className={animated ? "origin-top animate-[wiggle_0.6s_ease-in-out_infinite]" : ""}
      />
      <path
        d="M 38 72 Q 30 88 28 105"
        stroke={tentacleStroke}
        strokeWidth="4.5"
        fill="none"
        strokeLinecap="round"
        className={animated ? "origin-top animate-[wiggle_0.7s_ease-in-out_infinite_0.1s]" : ""}
      />
      <path
        d="M 45 74 Q 42 90 40 108"
        stroke={accentStroke}
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        className={animated ? "origin-top animate-[wiggle_0.65s_ease-in-out_infinite_0.15s]" : ""}
      />
      <path
        d="M 55 74 Q 58 90 60 108"
        stroke={accentStroke}
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        className={animated ? "origin-top animate-[wiggle_0.65s_ease-in-out_infinite_0.2s]" : ""}
      />
      <path
        d="M 62 72 Q 70 88 72 105"
        stroke={tentacleStroke}
        strokeWidth="4.5"
        fill="none"
        strokeLinecap="round"
        className={animated ? "origin-top animate-[wiggle_0.7s_ease-in-out_infinite_0.25s]" : ""}
      />
      <path
        d="M 68 70 Q 78 85 80 100"
        stroke={tentacleStroke}
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        className={animated ? "origin-top animate-[wiggle_0.6s_ease-in-out_infinite_0.3s]" : ""}
      />
      
      {/* Two distinctive long tentacles (feeding tentacles) - violet accent */}
      <path
        d="M 28 65 Q 10 55 5 70 Q 0 85 15 95"
        stroke={accentStroke}
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        className={animated ? "origin-top-right animate-[wiggle_0.8s_ease-in-out_infinite]" : ""}
      />
      
      {/* Right distinctive tentacle holding pointing stick */}
      <g className={animated ? "origin-bottom-left animate-[point_1.5s_ease-in-out_infinite]" : ""}>
        <path
          d="M 72 65 Q 85 50 95 40"
          stroke={accentStroke}
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
        {/* Pointing stick - violet */}
        <line
          x1="92"
          y1="42"
          x2="75"
          y2="15"
          stroke={violetColor}
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Stick tip */}
        <circle cx="75" cy="15" r="2" fill={violetColor} />
      </g>

      {/* CSS for animations */}
      <style>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
        @keyframes point {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-8deg); }
        }
      `}</style>
    </svg>
  );
};

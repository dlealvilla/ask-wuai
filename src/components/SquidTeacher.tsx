import React from "react";
import { SquidMascot } from "./SquidMascot";

export const SquidTeacher: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Blackboard */}
      <div className="relative">
        <div className="w-48 h-32 bg-violet-900 rounded-lg border-4 border-violet-600 shadow-lg relative overflow-hidden">
          {/* Chalk marks appearing */}
          <div className="absolute inset-2 flex items-center justify-center">
            <svg viewBox="0 0 100 60" className="w-full h-full">
              {/* Chalk squiggles */}
              <path
                d="M 10 30 Q 25 20 40 30 Q 55 40 70 25 Q 85 15 95 30"
                stroke="white"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeDasharray="100"
                strokeDashoffset="100"
                style={{
                  animation: "draw 2s ease-in-out infinite",
                }}
              />
              <path
                d="M 15 45 Q 30 50 50 42 Q 70 35 85 48"
                stroke="white"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeDasharray="80"
                strokeDashoffset="80"
                style={{
                  animation: "draw 2.5s ease-in-out infinite 0.5s",
                }}
              />
            </svg>
          </div>
          {/* Chalk dust particles */}
          <div className="absolute bottom-1 right-2 w-1 h-1 bg-white/60 rounded-full animate-ping" />
          <div className="absolute bottom-2 right-4 w-0.5 h-0.5 bg-white/40 rounded-full animate-ping" style={{ animationDelay: "0.3s" }} />
        </div>

        {/* Squid Teacher below blackboard */}
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2">
          <SquidMascot size="lg" animated />
        </div>
      </div>

      {/* CSS for custom animations */}
      <style>{`
        @keyframes draw {
          0% { stroke-dashoffset: 100; }
          50% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -100; }
        }
      `}</style>
    </div>
  );
};

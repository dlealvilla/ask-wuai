import React from "react";
import { cn } from "@/lib/utils";

interface WuaiLogoProps {
  className?: string;
}

export const WuaiLogo: React.FC<WuaiLogoProps> = ({ className = "" }) => {
  return (
    <h1 className={cn("text-[1.625rem] font-medium tracking-tight font-fun", className)}>
      <span className="text-primary">W</span>
      <span className="text-accent">u</span>
      <span className="text-primary">a</span>
      <span className="text-accent">i</span>
    </h1>
  );
};


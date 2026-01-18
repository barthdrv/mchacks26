import { cn } from "@/lib/utils";

interface SnowLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function SnowLogo({ size = "md", className }: SnowLogoProps) {
  const sizeClasses = {
    sm: "h-9 w-9",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  };

  const svgSizes = {
    sm: "h-7 w-7",
    md: "h-10 w-10",
    lg: "h-14 w-14",
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg bg-black group cursor-pointer overflow-hidden",
        sizeClasses[size],
        className
      )}
    >
      <svg 
        viewBox="0 0 100 100" 
        className={cn(
          svgSizes[size],
          "transition-transform duration-500 ease-out group-hover:rotate-45 group-hover:scale-110"
        )}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Main vertical line */}
        <line x1="50" y1="5" x2="50" y2="95" stroke="#7CB9E8" strokeWidth="6" strokeLinecap="round"/>
        
        {/* Horizontal line */}
        <line x1="5" y1="50" x2="95" y2="50" stroke="#7CB9E8" strokeWidth="6" strokeLinecap="round"/>
        
        {/* Diagonal lines */}
        <line x1="18" y1="18" x2="82" y2="82" stroke="#7CB9E8" strokeWidth="6" strokeLinecap="round"/>
        <line x1="82" y1="18" x2="18" y2="82" stroke="#7CB9E8" strokeWidth="6" strokeLinecap="round"/>
        
        {/* Center hexagon - lighter blue */}
        <polygon 
          points="50,30 67,40 67,60 50,70 33,60 33,40" 
          fill="#D6EAF8" 
          stroke="#A9D4F5" 
          strokeWidth="2"
        />
        
        {/* Top branch details */}
        <line x1="50" y1="15" x2="42" y2="23" stroke="#7CB9E8" strokeWidth="4" strokeLinecap="round"/>
        <line x1="50" y1="15" x2="58" y2="23" stroke="#7CB9E8" strokeWidth="4" strokeLinecap="round"/>
        
        {/* Bottom branch details */}
        <line x1="50" y1="85" x2="42" y2="77" stroke="#7CB9E8" strokeWidth="4" strokeLinecap="round"/>
        <line x1="50" y1="85" x2="58" y2="77" stroke="#7CB9E8" strokeWidth="4" strokeLinecap="round"/>
        
        {/* Left branch details */}
        <line x1="15" y1="50" x2="23" y2="42" stroke="#7CB9E8" strokeWidth="4" strokeLinecap="round"/>
        <line x1="15" y1="50" x2="23" y2="58" stroke="#7CB9E8" strokeWidth="4" strokeLinecap="round"/>
        
        {/* Right branch details */}
        <line x1="85" y1="50" x2="77" y2="42" stroke="#7CB9E8" strokeWidth="4" strokeLinecap="round"/>
        <line x1="85" y1="50" x2="77" y2="58" stroke="#7CB9E8" strokeWidth="4" strokeLinecap="round"/>
        
        {/* Diagonal branch details - top left */}
        <line x1="25" y1="25" x2="20" y2="32" stroke="#7CB9E8" strokeWidth="4" strokeLinecap="round"/>
        <line x1="25" y1="25" x2="32" y2="20" stroke="#7CB9E8" strokeWidth="4" strokeLinecap="round"/>
        
        {/* Diagonal branch details - top right */}
        <line x1="75" y1="25" x2="80" y2="32" stroke="#7CB9E8" strokeWidth="4" strokeLinecap="round"/>
        <line x1="75" y1="25" x2="68" y2="20" stroke="#7CB9E8" strokeWidth="4" strokeLinecap="round"/>
        
        {/* Diagonal branch details - bottom left */}
        <line x1="25" y1="75" x2="20" y2="68" stroke="#7CB9E8" strokeWidth="4" strokeLinecap="round"/>
        <line x1="25" y1="75" x2="32" y2="80" stroke="#7CB9E8" strokeWidth="4" strokeLinecap="round"/>
        
        {/* Diagonal branch details - bottom right */}
        <line x1="75" y1="75" x2="80" y2="68" stroke="#7CB9E8" strokeWidth="4" strokeLinecap="round"/>
        <line x1="75" y1="75" x2="68" y2="80" stroke="#7CB9E8" strokeWidth="4" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

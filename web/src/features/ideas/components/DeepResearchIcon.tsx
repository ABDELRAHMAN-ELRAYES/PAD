import React, { FC } from "react";

interface DeepResearchIconProps {
  className?: string;
}

export const DeepResearchIcon: FC<DeepResearchIconProps> = ({ className }) => {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .geist-research-icon {
          color: currentColor;
          shape-rendering: crispEdges; 
        }
        .geist-research-icon .particle {
          animation: geist-light-wave 1.8s ease-in-out infinite;
          opacity: 0.15;
        }
        .geist-research-icon .ring-outer { animation-delay: 0s; }
        .geist-research-icon .ring-inner { animation-delay: 0.2s; }
        .geist-research-icon .ring-core  { animation-delay: 0.4s; }

        @keyframes geist-light-wave {
          0% { opacity: 0.15; }
          15% { opacity: 1; }
          40%, 100% { opacity: 0.15; }
        }
      `}} />
      <svg className={`geist-research-icon ${className || "w-24 h-24"}`} xmlns="http://www.w3.org/2000/svg" viewBox="3 3 11 11">
        {/* Outer Ring (Furthest points) */}
        <rect className="particle ring-outer p-n1" x="8" y="6" width="1" height="1" fill="currentColor"/>
        <rect className="particle ring-outer p-e1" x="10" y="8" width="1" height="1" fill="currentColor"/>
        <rect className="particle ring-outer p-s1" x="8" y="10" width="1" height="1" fill="currentColor"/>
        <rect className="particle ring-outer p-w1" x="6" y="8" width="1" height="1" fill="currentColor"/>
        
        {/* Inner Ring (Middle points and diagonals) */}
        <rect className="particle ring-inner p-n2" x="8" y="7" width="1" height="1" fill="currentColor"/>
        <rect className="particle ring-inner p-e2" x="9" y="8" width="1" height="1" fill="currentColor"/>
        <rect className="particle ring-inner p-s2" x="8" y="9" width="1" height="1" fill="currentColor"/>
        <rect className="particle ring-inner p-w2" x="7" y="8" width="1" height="1" fill="currentColor"/>
        <rect className="particle ring-inner p-ne" x="9" y="7" width="1" height="1" fill="currentColor"/>
        <rect className="particle ring-inner p-nw" x="7" y="7" width="1" height="1" fill="currentColor"/>
        <rect className="particle ring-inner p-se" x="9" y="9" width="1" height="1" fill="currentColor"/>
        <rect className="particle ring-inner p-sw" x="7" y="9" width="1" height="1" fill="currentColor"/>
        
        {/* Core Processor */}
        <rect className="particle ring-core p-c" x="8" y="8" width="1" height="1" fill="currentColor"/>
      </svg>
    </>
  );
};

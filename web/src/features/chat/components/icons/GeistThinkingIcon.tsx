import * as React from "react";
import { cn } from "@/lib/utils";

interface GeistThinkingIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

export function GeistThinkingIcon({ className, size = 28, ...props }: GeistThinkingIconProps) {
  return (
    <svg
      className={cn("geist-thinking-icon", className)}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="2 2 13 13"
      width={size}
      height={size}
      aria-hidden="true"
      {...props}
    >
      <rect className="particle p-n1" x="8" y="6" width="1" height="1" fill="currentColor" />
      <rect className="particle p-n2" x="8" y="7" width="1" height="1" fill="currentColor" />
      <rect className="particle p-s1" x="8" y="10" width="1" height="1" fill="currentColor" />
      <rect className="particle p-s2" x="8" y="9" width="1" height="1" fill="currentColor" />
      <rect className="particle p-e1" x="10" y="8" width="1" height="1" fill="currentColor" />
      <rect className="particle p-e2" x="9" y="8" width="1" height="1" fill="currentColor" />
      <rect className="particle p-w1" x="6" y="8" width="1" height="1" fill="currentColor" />
      <rect className="particle p-w2" x="7" y="8" width="1" height="1" fill="currentColor" />
      <rect className="particle p-ne" x="9" y="7" width="1" height="1" fill="currentColor" />
      <rect className="particle p-nw" x="7" y="7" width="1" height="1" fill="currentColor" />
      <rect className="particle p-se" x="9" y="9" width="1" height="1" fill="currentColor" />
      <rect className="particle p-sw" x="7" y="9" width="1" height="1" fill="currentColor" />
      <rect className="particle p-c" x="8" y="8" width="1" height="1" fill="currentColor" />
    </svg>
  );
}

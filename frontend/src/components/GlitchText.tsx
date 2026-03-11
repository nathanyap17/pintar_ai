import React, { useState } from 'react';

// Shared start time for all glitch animations to ensure synchronization
const SYNC_START = Date.now();

function getSyncDelay(durationMs: number) {
  return -((Date.now() - SYNC_START) % durationMs) / 1000;
}

interface GlitchTextProps {
  text: string;
  className?: string;
  as?: React.ElementType;
  children?: React.ReactNode;
}

export function GlitchText({ text, className = "", as: Component = "h2", children }: GlitchTextProps) {
  // We need to calculate the delay on mount so it doesn't change on re-renders,
  // but matches the exact mount time.
  const [delay1] = useState(() => getSyncDelay(5000));
  const [delay2] = useState(() => getSyncDelay(7000));

  const content = children || text;

  return (
    <div className="relative inline-block">
      <Component 
        className={`cyber-glitch ${className}`}
        data-text={text}
      >
        {content}
      </Component>
      <div 
        className="title-scanner-overlay scanner-1" 
        style={{ animationDelay: `${delay1}s` }}
      >
        <Component className={`${className} -translate-x-1`}>
          {content}
        </Component>
      </div>
      <div 
        className="title-scanner-overlay scanner-2" 
        style={{ animationDelay: `${delay2}s` }}
      >
        <Component className={`${className} -translate-x-1.5`}>
          {content}
        </Component>
      </div>
    </div>
  );
}

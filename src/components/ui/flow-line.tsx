import React from 'react';
import { cn } from '@/lib/utils';

export interface FlowLineProps {
  stream: string;
  cursorPosition: number;
  className?: string;
}

export function FlowLine({ stream, cursorPosition, className }: FlowLineProps) {
  const completed = stream.substring(0, cursorPosition);
  const cursorChar = stream[cursorPosition] === ' ' ? '\u00A0' : stream[cursorPosition];
  const pending = stream.substring(cursorPosition + 1);

  return (
    <div className={cn("flex justify-center items-center font-mono text-2xl w-full", className)}>
      <span className="text-gray-400 whitespace-pre text-right overflow-hidden flex-shrink-0">
        {completed.slice(-20)}
      </span>
      <span className="relative">
        <span className="text-blue-500">{cursorChar}</span>
        <span className="absolute left-0 -bottom-1 w-full h-0.5 bg-blue-500 animate-pulse" />
      </span>
      <span className="text-gray-600 whitespace-pre flex-grow-0 overflow-hidden">
        {pending.substring(0, 30)}
      </span>
    </div>
  );
}
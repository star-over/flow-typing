import { cn } from '@/lib/utils';
import { FlowLineCursorType, FlowLineSymbolType, TypingStream } from '@/interfaces/types';
import { useState, useEffect } from 'react';
import { cva, VariantProps } from "class-variance-authority";
import { getSymbolType, getSymbolChar } from '@/lib/stream-utils';

// --- Main Component ---

export interface FlowLineProps {
  stream: TypingStream;
  cursorPosition: number;
  cursorType?: FlowLineCursorType;
  className?: string;
}

export function FlowLine({ stream, cursorPosition, cursorType, className }: FlowLineProps) {
  const completedSymbols = stream.slice(0, cursorPosition);
  const cursorSymbol = stream[cursorPosition];
  const pendingSymbols = stream.slice(cursorPosition + 1);
  const completedCount = -100;
  const pendingCount = 100;

  return (
    <div className={cn(`w-screen flex justify-center items-center  
     font-mono text-4xl`, className)}>

      {/* ---- Completed Symbols ---- */}
      <span className="flex justify-end whitespace-nowrap text-right overflow-hidden min-w-1/3 bg-amber-100">
        {completedSymbols.slice(completedCount).map((symbol, index) => (
          <RegularSymbol
            key={index}
            symbol={getSymbolChar(symbol)}
            symbolType={getSymbolType(symbol)}
          />
        ))}
      </span>

      {/* ---- Cursor Symbol ---- */}
      <CursorSymbol
        key={cursorPosition}
        cursorType={cursorType}
        symbol={cursorSymbol ? getSymbolChar(cursorSymbol) : ''}
      />

      {/* ---- Pending Symbols ---- */}
      <span className="flex justify-start whitespace-pre text-left  overflow-hidden w-full   bg-rose-100">
        {pendingSymbols.slice(0, pendingCount).map((symbol, index) => (
          <RegularSymbol
            key={index}
            symbol={getSymbolChar(symbol)}
          />
        ))}
      </span>
    </div>
  );
}

// --- Sub-components & Variants ---

// -------- RegularSymbol --------
const regularSymbolVariants = cva(
  "", // Base classes are handled by variants for clarity.
  {
    variants: {
      symbolType: {
        NONE: "text-gray-600",
        CORRECT: "text-gray-400",
        ERROR: "text-yellow-600",
        ERRORS: "text-rose-700",
        FIXED: "text-rose-900",
      } satisfies Record<FlowLineSymbolType, string>,
    },
    defaultVariants: {
      symbolType: "NONE",
    }
  }
);

type RegularSymbolProps = React.ComponentProps<"span">
  & VariantProps<typeof regularSymbolVariants>
  & { symbol: string; }

function RegularSymbol({ symbolType, symbol, className, ...props }: RegularSymbolProps) {
  return (
    <span className={cn(regularSymbolVariants({ symbolType }), className)} {...props}>
      {symbol}
    </span>
  );
}

// -------- CursorSymbol --------
const cursorSymbolVariants = cva(
  `absolute left-0 -bottom-0 bg-gray-800`,
  {
    variants: {
      cursorType: {
        RECTANGLE: "h-full w-full",
        VERTICAL: "h-full w-1",
        UNDERSCORE: "h-1 w-full",
      } satisfies Record<FlowLineCursorType, string>,
      isTyping: {
        true: "",
        false: "animate-caret-blink",
      },
    },
    defaultVariants: {
      cursorType: "RECTANGLE",
      isTyping: true,
    }
  }
);

type CursorSymbolProps = React.ComponentProps<"span">
  & VariantProps<typeof cursorSymbolVariants>
  & { symbol: string; }

function CursorSymbol({ cursorType, symbol, className, ...props }: CursorSymbolProps) {
  const [isTyping, setIsTyping] = useState(true);
  const blinkDelay = 600;

  // Reset animation when the symbol at the cursor changes.
  useEffect(() => {
    setIsTyping(true);
    const timer = setTimeout(() => {
      setIsTyping(false);
    }, blinkDelay);

    return () => {
      clearTimeout(timer);
    };
  }, [symbol]); // Depend on the symbol prop, not the key.

  return (
    <span className="relative">
      <span className={cn(cursorSymbolVariants({ cursorType, isTyping }), className)} {...props} />
      <span className="text-gray-50 mix-blend-difference">
        {symbol}
      </span>
    </span>
  );
}

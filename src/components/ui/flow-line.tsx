import { cn, nbsp, sp } from '@/lib/utils';
import { FlowLineCursorType, FlowLineSymbolType, StreamSymbol, TypingStream } from '@/interfaces/types';
import { useState, useEffect } from 'react';
import { cva, VariantProps } from "class-variance-authority";

// --- Helper Functions ---

/**
 * Determines the visual state (symbolType) of a stream symbol based on its attempts.
 */
function getSymbolType(symbol: StreamSymbol): FlowLineSymbolType {
  const { attempts, targetSymbol } = symbol;

  if (!attempts || attempts.length === 0) {
    return "NONE";
  }

  const lastAttempt = attempts.at(-1)!;
  const isCorrect = lastAttempt.typedSymbol === targetSymbol;

  if (isCorrect) {
    // If the last attempt is correct, it's either CORRECT (1st try) or FIXED (after errors).
    return attempts.length > 1 ? "FIXED" : "CORRECT";
  } else {
    // If the last attempt is incorrect, it's either an ERROR (1st try) or ERRORS (multiple).
    return attempts.length > 1 ? "ERRORS" : "ERROR";
  }
}

/**
 * Returns the character to be displayed, converting space to a non-breaking space.
 */
const getSymbolChar = (symbol: { targetSymbol: string; }) =>
  symbol.targetSymbol === sp ? nbsp : symbol.targetSymbol;


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
  const completedCount = -10;
  const pendingCount = 10;

  return (
    <div className={cn("flex justify-center items-center font-mono text-4xl w-fit", className)}>

      {/* ---- Completed Symbols ---- */}
      <span className="whitespace-pre text-right overflow-hidden flex-shrink-0">
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
      <span className="whitespace-pre flex-grow-0 overflow-hidden">
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
        ERROR: "text-yellow-400",
        ERRORS: "text-rose-400",
        FIXED: "text-emerald-400",
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
  `absolute left-0 -bottom-0.5 bg-gray-800`,
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

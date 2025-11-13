import { cn, nbsp, sp } from '@/lib/utils';
import { FlowLineCursorType, TypingStream } from '@/interfaces/types';
import { useState, useEffect } from 'react';
import { cva, VariantProps } from "class-variance-authority";

export interface FlowLineProps {
  stream: TypingStream;
  cursorType: FlowLineCursorType;
  cursorPosition: number;
  className?: string;
}

export function FlowLine({ stream, cursorPosition, cursorType, className }: FlowLineProps) {
  const completedSymbols = stream.slice(0, cursorPosition);
  const cursorSymbol = stream[cursorPosition];
  const pendingSymbols = stream.slice(cursorPosition + 1);
  const completedCount = -10;
  const pendingCount = 10;

  const getSymbolChar = (symbol: { targetSymbol: string; }) =>
    symbol.targetSymbol === sp ? nbsp : symbol.targetSymbol;

  return (
    <div className={cn("flex justify-center items-center font-mono text-4xl w-fit", className)}>

      {/* ---- completedSymbols ---- */}
      <span className="text-gray-400 whitespace-pre text-right overflow-hidden flex-shrink-0">
        {completedSymbols.slice(completedCount).map((symbol, index) => {
          const errorCount = symbol.attempts ? symbol.attempts.length - 1 : 0;
          return (
            <span
              key={index}
              className={cn({
                'bg-yellow-100': errorCount === 1,
                'bg-rose-100': errorCount >= 2,
              })}
            >
              {getSymbolChar(symbol)}
            </span>
          );
        })}
      </span>

      {/* ---- CursorSymbol ---- */}
      <CursorSymbol
        key={cursorPosition}
        cursorType="VERTICAL"
        symbol={cursorSymbol ? getSymbolChar(cursorSymbol) : ''}
      />

      {/* ---- pendingSymbols ---- */}
      <span className="text-gray-600 whitespace-pre flex-grow-0 overflow-hidden">
        {pendingSymbols.slice(0, pendingCount).map((symbol, index) => (
          <span key={index}>{getSymbolChar(symbol)}</span>
        ))}
      </span>
    </div>
  );
}

// -------- CursorSymbol --------
const cursorSymbolVariants = cva(
  `absolute left-0 -bottom-0.5 h-full w-full bg-gray-900`,
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

function CursorSymbol({ key, cursorType, symbol, ...props }: CursorSymbolProps) {
  const [isTyping, setIsTyping] = useState(true);
  const blinkDelay = 600;

  // Make start animation from the start on any new char, instead continuously blinking
  useEffect(() => {
    setIsTyping(true);
    const timer = setTimeout(() => {
      setIsTyping(false);
    }, blinkDelay);

    return () => {
      clearTimeout(timer);
    };
  }, [key]);

  return (
    <span className="relative">
      <span className={cn(cursorSymbolVariants({
        cursorType,
        isTyping
      }))}
        {...props}
      />
      <span className="text-gray-100 mix-blend-difference">
        {symbol}
      </span>
    </span>
  )
};

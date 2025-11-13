import { cn } from '@/lib/utils';
import { TypingStream } from '@/interfaces/types';

export interface FlowLineProps {
  stream: TypingStream;
  cursorPosition: number;
  className?: string;
}

export function FlowLine({ stream, cursorPosition, className }: FlowLineProps) {
  const completedSymbols = stream.slice(0, cursorPosition);
  const cursorSymbol = stream[cursorPosition];
  const pendingSymbols = stream.slice(cursorPosition + 1);

  const getSymbolChar = (symbol: { targetSymbol: string; }) =>
    symbol.targetSymbol === ' ' ? '\u00A0' : symbol.targetSymbol;

  return (
    <div className={cn("flex justify-center items-center font-mono text-4xl w-full", className)}>
      <span className="text-gray-400 whitespace-pre text-right overflow-hidden flex-shrink-0">
        {completedSymbols.slice(-20).map((symbol, index) => {
          const errorCount = symbol.attempts ? symbol.attempts.length - 1 : 0;
          return (
            <span
              key={index}
              className={cn({
                'text-yellow-500': errorCount === 1,
                'text-orange-500': errorCount >= 2,
              })}
            >
              {getSymbolChar(symbol)}
            </span>
          );
        })}
      </span>
      <span className="relative">
        <span className="text-blue-500">{cursorSymbol ? getSymbolChar(cursorSymbol) : ''}</span>
        <span className="absolute left-0 -bottom-1 w-full h-0.5 bg-blue-500 animate-pulse" />
      </span>
      <span className="text-gray-600 whitespace-pre flex-grow-0 overflow-hidden">
        {pendingSymbols.slice(0, 30).map((symbol, index) => (
          <span key={index}>{getSymbolChar(symbol)}</span>
        ))}
      </span>
    </div>
  );
}


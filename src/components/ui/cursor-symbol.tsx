import { cva, VariantProps } from "class-variance-authority";
import { useState, useEffect } from 'react';
import { FlowLineCursorType } from '@/interfaces/types';
import { cn } from '@/lib/utils';

/**
 * Custom hook to manage the blinking state of a caret.
 * It provides an `isBlinking` state that becomes `false` when the `dependency` changes,
 * and turns back to `true` after a specified `delay`.
 *
 * @param dependency - The value that triggers the blink reset (e.g., the current symbol).
 * @param blinkDelay - The delay in milliseconds before the caret starts blinking again.
 * @returns `isTyping` - A boolean indicating if the user is considered to be "typing" (i.e., caret should be solid).
 */
function useCaretBlink(dependency: unknown, blinkDelay: number): boolean {
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    setIsTyping(true); // Reset to solid caret whenever the dependency changes
    const timer = setTimeout(() => {
      setIsTyping(false); // Start blinking after delay
    }, blinkDelay);

    return () => {
      clearTimeout(timer);
    };
  }, [dependency, blinkDelay]);

  return isTyping;
}


/**
 * Варианты стилей для компонента курсора.
 * Определяет форму курсора и анимацию мигания.
 */
const cursorSymbolVariants = cva(
  `absolute left-0 bottom-0 bg-gray-800`,
  {
    variants: {
      /** Тип визуализации курсора. */
      cursorType: {
        RECTANGLE: "h-full w-full",
        VERTICAL: "h-full w-1",
        UNDERSCORE: "h-1 w-full",
      } satisfies Record<FlowLineCursorType, string>,
      /** Флаг, указывающий, идет ли набор текста. Влияет на анимацию мигания. */
      // TODO: тут какой-то глюк, в принципе все работает, но не правильно
      // Надо переосмыслить процедуру "мигания курсора", добавить свойсто isInFocus которые будет отвечать за поведение при наличии фокуса и без.
      isTyping: {
        false: "",
        true: "animate-caret-blink",
      },
    },
    defaultVariants: {
      cursorType: "RECTANGLE",
      isTyping: true,
    }
  }
);

/** Пропсы для компонента `CursorSymbol`. */
type CursorSymbolProps = React.ComponentProps<"span">
  & VariantProps<typeof cursorSymbolVariants>
  & { /** Символ под курсором. */ symbol: string; }

/**
 * Вспомогательный компонент `CursorSymbol` для отображения курсора в `FlowLine`.
 * Включает логику мигания курсора при отсутствии активности.
 * @param props Пропсы компонента.
 * @returns Элемент JSX, представляющий курсор.
 */
export function CursorSymbol({ cursorType, symbol, className, ...props }: CursorSymbolProps) {
  const isTyping = useCaretBlink(symbol, 600);

  return (
    <span className="cursor-symbol relative">
      <span className={cn(cursorSymbolVariants({ cursorType, isTyping, className }))} {...props} />
      <span className="text-gray-50 mix-blend-difference">
        {symbol}
      </span>
    </span>
  );
}

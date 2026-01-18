import { cva, VariantProps } from "class-variance-authority";

import { FlowLineCursorType } from '@/interfaces/types';
import { useCaretBlink } from '@/hooks/use-caret-blink';
import { cn } from '@/lib/utils';

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

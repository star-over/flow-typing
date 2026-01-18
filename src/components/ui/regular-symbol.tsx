import { cva, VariantProps } from "class-variance-authority";

import { FlowLineSymbolType } from '@/interfaces/types';
import { cn } from '@/lib/utils';

/**
 * Варианты стилей для обычного символа в `FlowLine`.
 * Определяет цвет символа в зависимости от его типа (`FlowLineSymbolType`).
 */
const regularSymbolVariants = cva(
  "", // Base classes are handled by variants for clarity.
  {
    variants: {
      /** Тип символа (правильно набран, ошибка и т.д.). */
      symbolType: {
        PENDING: "text-gray-600",
        CORRECT: "text-green-800",
        ERROR: "text-yellow-600",
        INCORRECTS: "text-rose-700",
        CORRECTED: "text-rose-900",
      } satisfies Record<FlowLineSymbolType, string>,
    },
    defaultVariants: {
      symbolType: "PENDING",
    }
  }
);

/** Пропсы для компонента `RegularSymbol`. */
type RegularSymbolProps = React.ComponentProps<"span">
  & VariantProps<typeof regularSymbolVariants>
  & { /** Отображаемый символ. */ symbol: string; }

/**
 * Вспомогательный компонент для отображения обычного символа в `FlowLine`.
 * @param props Пропсы компонента.
 * @returns Элемент JSX, представляющий символ.
 */
export function RegularSymbol({ symbolType, symbol, className, ...props }: RegularSymbolProps) {
  return (
    <span className={cn(regularSymbolVariants({ symbolType, className }))} {...props}>
      {symbol}
    </span>
  );
}

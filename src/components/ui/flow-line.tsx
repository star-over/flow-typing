/**
 * @file Компонент `FlowLine` для визуализации потока ввода текста.
 * @description Имитирует движение каретки печатной машинки, разделяя текст
 * на набранную часть, текущий символ (курсор) и оставшуюся часть.
 * Динамически отображает состояние символов (правильно/неправильно набрано).
 */
import { cva, VariantProps } from "class-variance-authority";
import { useEffect, useState } from 'react';

import { FlowLineCursorMode, FlowLineCursorType, FlowLineSize, FlowLineSymbolType, KeyCapPressResult, TypingStream } from '@/interfaces/types';
import { getSymbolChar, getSymbolType } from '@/lib/stream-utils';
import { cn } from '@/lib/utils';

// --- Variants ---

/**
 * Варианты стилей для `FlowLine` на основе CVA.
 * Определяет размер шрифта и режим отображения курсора.
 */
const flowLineVariants = cva(
  "w-screen flex justify-center items-center font-mono border-2 border-amber-400",
  {
    variants: {
      /** Размер шрифта для символов в строке. */
      size: {
        XS: "text-xl",
        SM: "text-2xl",
        MD: "text-3xl",
        LG: "text-4xl",
        XL: "text-5xl",
      } satisfies Record<FlowLineSize, string>,
      /** Режим отображения курсора, влияющий на соотношение ширины зон. */
      cursorMode: {
        HALF: "[&_.completed-symbols]:w-1/2            [&_.pending-symbols]:w-1/2",
        THIRD: "[&_.completed-symbols]:w-1/3           [&_.pending-symbols]:w-2/3",
        QUARTER: "[&_.completed-symbols]:w-1/4         [&_.pending-symbols]:w-3/4",
        DINAMIC: "[&_.completed-symbols]:min-w-1/12    [&_.pending-symbols]:min-w-1/2",
      } satisfies Record<FlowLineCursorMode, string>,
      /** Результат нажатия клавиши. */
      pressResult: {
        NONE: "",
        CORRECT: "bg-green-100",
        ERROR: "bg-red-100",
      } satisfies Record<KeyCapPressResult, string>,
    },
    defaultVariants: {
      size: "MD",
      cursorMode: "HALF",
    },
  }
);

// --- Main Component ---

/** Пропсы для компонента `FlowLine`. */
export interface FlowLineProps extends VariantProps<typeof flowLineVariants> {
  /** Поток символов для отображения. */
  stream: TypingStream;
  /** Текущая позиция курсора в потоке символов. */
  cursorPosition: number;
  /** Тип визуализации курсора. */
  cursorType?: FlowLineCursorType;
  /** Дополнительные классы CSS. */
  className?: string;
}

/**
 * Компонент `FlowLine` визуализирует процесс набора текста,
 * отображая пройденные символы, текущий символ под курсором и ожидающие символы.
 * @param props Пропсы компонента.
 * @returns Элемент JSX, представляющий строку потока ввода.
 */
export function FlowLine({ stream, cursorPosition, cursorType, cursorMode, size, pressResult, className }: FlowLineProps) {
  const completedSymbols = stream.slice(0, cursorPosition);
  const cursorSymbol = stream[cursorPosition];
  const pendingSymbols = stream.slice(cursorPosition + 1);
  const completedCount = -100; // Количество отображаемых пройденных символов
  const pendingCount = 100;    // Количество отображаемых ожидающих символов

  return (
    <div className={cn(flowLineVariants({ cursorMode, size, pressResult, className }))}>

      {/* ---- Completed Symbols ---- */}
      <div className="completed-symbols flex justify-end whitespace-nowrap text-right overflow-hidden">
        {completedSymbols.slice(completedCount).map((symbol, index) => (
          <RegularSymbol
            key={index}
            symbol={getSymbolChar(symbol)}
            symbolType={getSymbolType(symbol)}
          />
        ))}
      </div>

      {/* ---- Cursor Symbol ---- */}
      <CursorSymbol
        key={cursorPosition}
        cursorType={cursorType}
        symbol={cursorSymbol ? getSymbolChar(cursorSymbol) : ''}
      />

      {/* ---- Pending Symbols ---- */}
      <div className="pending-symbols flex justify-start whitespace-pre text-left overflow-hidden">
        {pendingSymbols.slice(0, pendingCount).map((symbol, index) => (
          <RegularSymbol
            key={index}
            symbol={getSymbolChar(symbol)}
          />
        ))}
      </div>
    </div>
  );
}

// --- Sub-components & Variants ---

// -------- RegularSymbol --------
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
function RegularSymbol({ symbolType, symbol, className, ...props }: RegularSymbolProps) {
  return (
    <span className={cn(regularSymbolVariants({ symbolType, className }))} {...props}>
      {symbol}
    </span>
  );
}

// -------- CursorSymbol --------
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
function CursorSymbol({ cursorType, symbol, className, ...props }: CursorSymbolProps) {
  const [isTyping, setIsTyping] = useState(true);
  const blinkDelay = 600;

  useEffect(() => {
    setIsTyping(true);
    const timer = setTimeout(() => {
      setIsTyping(false);
    }, blinkDelay);

    return () => {
      clearTimeout(timer);
    };
  }, [symbol]);

  return (
    <span className="cursor-symbol relative">
      <span className={cn(cursorSymbolVariants({ cursorType, isTyping, className }))} {...props} />
      <span className="text-gray-50 mix-blend-difference">
        {symbol}
      </span>
    </span>
  );
}

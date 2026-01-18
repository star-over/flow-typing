/**
 * @file Компонент `FlowLine` для визуализации потока ввода текста.
 * @description Имитирует движение каретки печатной машинки, разделяя текст
 * на набранную часть, текущий символ (курсор) и оставшуюся часть.
 * Динамически отображает состояние символов (правильно/неправильно набрано).
 */
import { cva, VariantProps } from "class-variance-authority";

import { FlowLineCursorMode, FlowLineCursorType, FlowLineSize, KeyCapPressResult, TypingStream } from '@/interfaces/types';
import { getSymbolChar, getSymbolType } from '@/lib/stream-utils';
import { cn } from '@/lib/utils';
import { CursorSymbol } from "./cursor-symbol";
import { RegularSymbol } from "./regular-symbol";

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
  const completedCount = 100; // Количество отображаемых пройденных символов
  const pendingCount = 100;    // Количество отображаемых ожидающих символов

  const startCompleted = Math.max(0, cursorPosition - completedCount);
  const completedSymbolsToRender = stream.slice(startCompleted, cursorPosition);

  const cursorSymbol = stream[cursorPosition];

  const endPending = cursorPosition + 1 + pendingCount;
  const pendingSymbolsToRender = stream.slice(cursorPosition + 1, endPending);

  return (
    <div className={cn(flowLineVariants({ cursorMode, size, pressResult, className }))}>

      {/* ---- Completed Symbols ---- */}
      <div className="completed-symbols flex justify-end whitespace-nowrap text-right overflow-hidden">
        {completedSymbolsToRender.map((symbol, index) => (
          <RegularSymbol
            key={startCompleted + index}
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
        {pendingSymbolsToRender.map((symbol, index) => (
          <RegularSymbol
            key={cursorPosition + 1 + index}
            symbol={getSymbolChar(symbol)}
          />
        ))}
      </div>
    </div>
  );
}

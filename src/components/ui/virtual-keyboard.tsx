/**
 * @file Компонент `VirtualKeyboard` для отображения виртуальной клавиатуры.
 * @description Этот компонент является "глупым" (dumb) компонентом, который
 * отвечает только за визуализацию переданного ему `VirtualLayout`.
 * Он не содержит логики определения состояний клавиш, а лишь отображает
 * `VirtualKey` с заданными `visibility` и `navigationRole`.
 */
import { JSX } from "react";

import { symbolLayoutEnQwerty } from "@/data/symbol-layout-en-qwerty";
import { KeyboardLayout, ModifierKey, VirtualKey, } from "@/interfaces/types";
import { getSymbol } from "@/lib/symbol-utils";

import { KeyCap } from "./keycap";


/** Пропсы для компонента `VirtualKeyboard`. */
export type VirtualKeyboardProps = React.ComponentProps<"div">
  & {
    /** Двумерный массив `VirtualKey`, описывающий текущее состояние клавиатуры. */
    virtualLayout: VirtualKey[][];
    /** Массив активных в данный момент клавиш-модификаторов. */
    activeModifiers?: ModifierKey[];
    /** Физический макет клавиатуры, используемый для получения fallback-лейблов. */
    keyboardLayout: KeyboardLayout;
  }

/** Пропсы для компонента `VirtualRow` (внутренний компонент). */
type VirtualRowProps = React.ComponentProps<"div">
  & {
    /** Массив `VirtualKey`, представляющий один ряд клавиатуры. */
    row: VirtualKey[];
    activeModifiers?: ModifierKey[];
    keyboardLayout: KeyboardLayout;
  }

/**
 * Компонент `VirtualKeyboard` отрисовывает виртуальную клавиатуру на основе `VirtualLayout`.
 * @param props Пропсы компонента.
 * @param props.virtualLayout Виртуальный макет клавиатуры (геометрия и базовые свойства).
 * @param props.activeModifiers Массив активных в данный момент клавиш-модификаторов (например, ['shift', 'ctrl']). Компонент использует этот массив для динамического определения и отображения правильных символов на клавишах.
 * @returns Элемент JSX, представляющий виртуальную клавиатуру.
 */
export function VirtualKeyboard({ virtualLayout, activeModifiers, keyboardLayout }: VirtualKeyboardProps): JSX.Element {
  const rows = virtualLayout.map((row: VirtualKey[], rowIndex: number) => (
    <VirtualRow
      row={row}
      key={rowIndex}
      activeModifiers={activeModifiers}
      keyboardLayout={keyboardLayout}
    />
  ));

  return (
    <div className="flex flex-col w-fit gap-0.5">
      {rows}
    </div>
  )
};

/**
 * Вспомогательный компонент `VirtualRow` для отображения одного ряда клавиш.
 * @param props Пропсы компонента.
 * @param props.row Массив `VirtualKey`, представляющий один ряд.
 * @param props.activeModifiers Активные клавиши-модификаторы.
 * @returns Элемент JSX, представляющий ряд клавиш.
 */
function VirtualRow({ row, activeModifiers, keyboardLayout }: VirtualRowProps): JSX.Element {
  const keyCaps = row.map((virtualKey) => {
    return (
      <KeyCap
        key={virtualKey.keyCapId}
        {...virtualKey}
        symbol={getSymbol(virtualKey.keyCapId, activeModifiers || [], symbolLayoutEnQwerty, keyboardLayout)}
        navigationRole={virtualKey.navigationRole}
        visibility={virtualKey.visibility}
      />
    );
  });

  return (
    <div className="flex flex-nowrap gap-0.5">
      {keyCaps}
    </div>
  );
};

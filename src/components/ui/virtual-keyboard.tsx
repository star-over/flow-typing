/**
 * @file Компонент `VirtualKeyboard` для отображения виртуальной клавиатуры.
 * @description Этот компонент является "глупым" (dumb) компонентом, который
 * отвечает только за визуализацию переданного ему `VirtualLayout`.
 * Он не содержит логики определения состояний клавиш, а лишь отображает
 * `VirtualKey` с заданными `visibility` и `navigationRole`.
 */
import { VirtualKey, } from "@/interfaces/types";
import { KeyCap } from "./keycap";
import { JSX } from "react";


/** Пропсы для компонента `VirtualKeyboard`. */
export type VirtualKeyboardProps = React.ComponentProps<"div">
  & {
    /** Двумерный массив `VirtualKey`, описывающий текущее состояние клавиатуры. */
    virtualLayout: VirtualKey[][];
  }

/** Пропсы для компонента `VirtualRow` (внутренний компонент). */
type VirtualRowProps = React.ComponentProps<"div">
  & {
    /** Массив `VirtualKey`, представляющий один ряд клавиатуры. */
    row: VirtualKey[];
  }

/**
 * Компонент `VirtualKeyboard` отрисовывает виртуальную клавиатуру на основе `VirtualLayout`.
 * @param props Пропсы компонента.
 * @param props.virtualLayout Виртуальный макет клавиатуры.
 * @returns Элемент JSX, представляющий виртуальную клавиатуру.
 */
export function VirtualKeyboard({ virtualLayout }: VirtualKeyboardProps): JSX.Element {
  const rows = virtualLayout.map((row: VirtualKey[], rowIndex: number) => (
    <VirtualRow
      row={row}
      key={rowIndex}
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
 * @returns Элемент JSX, представляющий ряд клавиш.
 */
function VirtualRow({ row }: VirtualRowProps): JSX.Element {
  const keyCaps = row.map((virtualKey) => {
    return (
      <KeyCap
        key={virtualKey.keyCapId}
        {...virtualKey}
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

'use client';
import { cva } from 'class-variance-authority';
import React, { useEffect, useMemo, useRef } from 'react';

import { fingerLayoutASDF } from '@/data/finger-layout-asdf';
import { keyboardLayoutANSI } from '@/data/keyboard-layout-ansi';
import { FingerId, FingerState, HandsSceneViewModel, KeyCapId, KeySceneState, ModifierKey, VirtualKey, VirtualLayout, Visibility } from '@/interfaces/types';
import { cn } from '@/lib/utils';

import { VirtualKeyboard } from './virtual-keyboard';


/**
 * Генерирует виртуальный макет клавиатуры, адаптированный для конкретного пальца на основе общей модели сцены.
 * Эта функция определяет, какие клавиши должны быть видимыми и каково их состояние (например, целевая, путь)
 * для данного пальца, обеспечивая отображение только релевантных клавиш в кластере пальца.
 *
 * @param fingerId Идентификатор пальца, для которого генерируется макет (например, 'L1', 'R3').
 * @param viewModel Общая модель представления сцены рук, содержащая состояние для всех пальцев и колпачков клавиш.
 * @returns Двумерный массив, представляющий виртуальный макет, где каждая клавиша обогащена состоянием сцены.
 */
const generateVirtualLayoutForFinger = (fingerId: FingerId, viewModel: HandsSceneViewModel): VirtualLayout => {
  // Получаем состояние сцены конкретно для текущего пальца
  const fingerSceneState = viewModel[fingerId];
  // Извлекаем состояния колпачков клавиш для этого пальца, по умолчанию пустой объект, если их нет
  const keyCapStates: Partial<Record<KeyCapId, KeySceneState>> = fingerSceneState?.keyCapStates || {};

  // Находим данные пальца из статического макета, чтобы определить, является ли он "домашней" клавишей
  const fingerData = Object.values(fingerLayoutASDF).find((d) => d.fingerId === fingerId);

  // Проходим по стандартному макету клавиатуры ANSI, чтобы создать виртуальный макет для пальца
  return keyboardLayoutANSI.map((row, rowIndex) =>
    row.map((physicalKey): VirtualKey => {
      const { keyCapId } = physicalKey;
      // Получаем конкретное состояние для этого колпачка клавиши из состояния сцены пальца
      const keyCapState = keyCapStates[keyCapId];

      // Определяем видимость: клавиша видима, если у нее есть определенное состояние в viewModel для этого пальца
      const isVisible = !!keyCapState;
      const visibility: Visibility = isVisible ? 'VISIBLE' : 'INVISIBLE';

      return {
        ...physicalKey,
        rowIndex,
        colIndex: 0, // colIndex не используется в текущей логике макета для этого компонента
        symbol: keyCapId, // Заполнитель, компонент VirtualKeyboard рассчитает фактический отображаемый символ
        fingerId: fingerData?.fingerId || 'L1', // Присваиваем идентификатор пальца, с запасным значением
        isHomeKey: fingerData?.isHomeKey || false, // Отмечаем, является ли это "домашней" клавишей для этого пальца
        // Динамические свойства из ViewModel
        visibility: visibility,
        navigationRole: keyCapState?.navigationRole || 'NONE', // Роль (TARGET, PATH, NONE)
        navigationArrow: keyCapState?.navigationArrow || 'NONE', // Направление стрелки для навигации
        pressResult: keyCapState?.pressResult || 'NEUTRAL', // Результат нажатия клавиши (CORRECT, INCORRECT, NEUTRAL)
      };
    })
  );
};


// SVG-пути для отрисовки различных частей руки
const part1 = "M146.4 228c1.3-.7 5-.8 6.2.2 4.5 5 8.3 8.7 12.4 14 3.2 4 6.8 7 12 5.5 22.8-6.7 46.5-14.5 69.2-20.3 5.4-1.1 13.8.3 18.6 2 5.2 1.7 6.5 2.4 11 6.8 6.8 6.5 5.3 15.1-3.2 19.2-2.8 1.3-6 2-9 2.8-40.2 10.1-79 23.5-112 49.8-6 4.8-13.7 8-21.2 10.3-13.5 4.1-24.8-2.3-26.7-15a53 53 0 0 1 .6-20.1c6-25 17.7-44.3 42.1-55.3Z";
const part2 = "M139.7 147.8c2-2.3 4-3.3 6.3-3.8 12.3-3 20-11.6 26.9-21.4 14.3-20.3 28.2-41 43.1-60.8A65 65 0 0 1 234.2 46c2-1.2 2.4-1.4 6.7-2.5 9.4-2.6 13.6 4 11.1 13.3a61 61 0 0 1-8.3 17c-19.5 29.9-39.3 59.5-58.9 89.4-5.1 7.9-9.4 16.4-14.3 24.5-4.3 7-6.6 6.8-10.6-.4l-20.2-36.8c-.5-.8-.4-1.8 0-2.7Z";
const part3 = "M182.9 22.3c-5.2 16.7-30.4 85.5-35.6 102.2-2.2 7.2-1.7 15.4-2.2 23-.2 2.8.3 5.5.2 8.2 0 7.1-1.8 8.7-10.9 8.4a54.7 54.7 0 0 1-31.2-17.7c-3-3.1-3.2-7-.5-10.5 11-14.6 17.6-31.4 24.1-48.2 7.3-18.8 15.8-37.2 23.8-55.7a141 141 0 0 1 6.3-13c3.2-6 8.5-11.6 14.2-14.8 4.7-2.6 10.4.2 12 5.5a22 22 0 0 1-.2 12.6Z";
const part4 = "M87.2 167.2c-12.4 1.3-26.2-7-32.6-17.1-4-6.5-3.7-10.5 2.1-15.3a23.7 23.7 0 0 0 8.8-17.6c1.8-23.8 3-47.8 5.8-71.5 1.2-10 4-20.6 8.3-29.3 2.3-4.7 7.6-8.2 13.5-6.2 5.6 1.8 7 6.8 6.8 12-.5 10.4-1.6 20.7-2 31-1 29.6-3.6 59.1 3 88.5 3.8 17.2 3.6 25.5-13.7 25.5Z";
const part5 = "M16.2 144.6c1.6-18-6.7-36.4-9.9-55.7-1.6-9.7-2-19.6-2.3-29.5-.1-6 2.7-11.4 9-12.8a11 11 0 0 1 13 7.6c3.8 11 6.5 22.4 9.2 33.7a938 938 0 0 1 8.1 37c1.3 6.3 4.5 10.5 11 12.3 5.8 1.7 7.3 5.4 3.9 10.2a60.4 60.4 0 0 1-32.3 22.3c-5.7 1.7-9.1-1.4-9.6-8.1-.4-5-.1-10-.1-17Z";
const partB = "M57.8 137.3c13.4 0 77 2.7 88.8 7.4 23 9 30.2 24.7 23.3 48.4a95 95 0 0 0-1.7 42c.4 4.1.6 5.2.5 9.4-.5 14.4-9.6 30.7-14.5 44.2-5.9 16.2-12.7 28.9-31.6 31.2l-25.5.3-21.2-2.9c-34.4-6.2-64.3-14.9-75-52.7-.7-6.9-.4-12.8.7-20.3l.6-3.8c4.2-24 8.8-47.9 12.5-72 2.6-16.5 12.3-25.4 27.7-29.1 5-1.2 10.2-1.6 15.4-2.1Z";


const handsVariants = cva("",
  {
    variants: {
      centerPointVisibility: {
        VISIBLE: "[&_.finger-center-point]:fill-blue-500",
        INVISIBLE: "[&_.finger-center-point]:fill-transparent",
      } satisfies Record<Visibility, string>,
      L1: { ACTIVE: "[&_.L1]:fill-yellow-400", INACTIVE: "[&_.L1]:fill-orange-50", IDLE: "[&_.L1]:fill-gray-200", INCORRECT: "[&_.L1]:fill-rose-600", } satisfies Record<FingerState, string>,
      L2: { ACTIVE: "[&_.L2]:fill-orange-400", INACTIVE: "[&_.L2]:fill-orange-50", IDLE: "[&_.L2]:fill-gray-200", INCORRECT: "[&_.L2]:fill-rose-600", } satisfies Record<FingerState, string>,
      L3: { ACTIVE: "[&_.L3]:fill-green-400",  INACTIVE: "[&_.L3]:fill-orange-50", IDLE: "[&_.L3]:fill-gray-200", INCORRECT: "[&_.L3]:fill-rose-600", } satisfies Record<FingerState, string>,
      L4: { ACTIVE: "[&_.L4]:fill-blue-400",   INACTIVE: "[&_.L4]:fill-orange-50", IDLE: "[&_.L4]:fill-gray-200", INCORRECT: "[&_.L4]:fill-rose-600", } satisfies Record<FingerState, string>,
      L5: { ACTIVE: "[&_.L5]:fill-purple-400", INACTIVE: "[&_.L5]:fill-orange-50", IDLE: "[&_.L5]:fill-gray-200", INCORRECT: "[&_.L5]:fill-rose-600", } satisfies Record<FingerState, string>,
      LB: { ACTIVE: "[&_.LB]:fill-orange-50",  INACTIVE: "[&_.LB]:fill-orange-50", IDLE: "[&_.LB]:fill-gray-200", INCORRECT: "[&_.LB]:fill-rose-600", } satisfies Record<FingerState, string>,
      R1: { ACTIVE: "[&_.R1]:fill-yellow-400", INACTIVE: "[&_.R1]:fill-orange-50", IDLE: "[&_.R1]:fill-gray-200", INCORRECT: "[&_.R1]:fill-rose-600", } satisfies Record<FingerState, string>,
      R2: { ACTIVE: "[&_.R2]:fill-orange-400", INACTIVE: "[&_.R2]:fill-orange-50", IDLE: "[&_.R2]:fill-gray-200", INCORRECT: "[&_.R2]:fill-rose-600", } satisfies Record<FingerState, string>,
      R3: { ACTIVE: "[&_.R3]:fill-green-400",  INACTIVE: "[&_.R3]:fill-orange-50", IDLE: "[&_.R3]:fill-gray-200", INCORRECT: "[&_.R3]:fill-rose-600", } satisfies Record<FingerState, string>,
      R4: { ACTIVE: "[&_.R4]:fill-blue-400",   INACTIVE: "[&_.R4]:fill-orange-50", IDLE: "[&_.R4]:fill-gray-200", INCORRECT: "[&_.R4]:fill-rose-600", } satisfies Record<FingerState, string>,
      R5: { ACTIVE: "[&_.R5]:fill-purple-400", INACTIVE: "[&_.R5]:fill-orange-50", IDLE: "[&_.R5]:fill-gray-200", INCORRECT: "[&_.R5]:fill-rose-600", } satisfies Record<FingerState, string>,
      RB: { ACTIVE: "[&_.RB]:fill-orange-50",  INACTIVE: "[&_.RB]:fill-orange-50", IDLE: "[&_.RB]:fill-gray-200", INCORRECT: "[&_.RB]:fill-rose-600", } satisfies Record<FingerState, string>,
    },
    defaultVariants: {
      centerPointVisibility: "INVISIBLE",
      L1: "IDLE", L2: "IDLE", L3: "IDLE", L4: "IDLE", L5: "IDLE", LB: "IDLE", R1: "IDLE", R2: "IDLE", R3: "IDLE", R4: "IDLE", R5: "IDLE", RB: "IDLE",
    },
  });

interface HandsExtProps {
  viewModel: HandsSceneViewModel;
  className?: string;
  centerPointVisibility?: Visibility;
}


/**
 * Компонент HandsExt отвечает за визуализацию рук и динамических, контекстных блоков клавиш,
 * которые "двигаются" к нужным пальцам на основе модели представления.
 * Он отображает SVG-изображения рук и рендерит кластеры клавиш поверх них,
 * применяя стилизацию в зависимости от состояния пальцев и клавиш.
 *
 * @param {HandsExtProps} props Пропсы компонента.
 * @param {HandsSceneViewModel} props.viewModel Модель представления сцены рук, определяющая состояние всех пальцев и клавиш.
 * @param {string} [props.className] Дополнительные CSS-классы для корневого элемента.
 * @param {Visibility} [props.centerPointVisibility] Определяет видимость центральной точки пальцев.
 * @returns {React.FC<HandsExtProps>} React-элемент, отображающий руки и динамические клавиатуры.
 */
export const HandsExt: React.FC<HandsExtProps> = ({ viewModel, className, centerPointVisibility, ...props }) => {
  // Определяем массив идентификаторов пальцев для левой и правой руки
  const fingerIds: FingerId[] = useMemo(() => ['L5', 'L4', 'L3', 'L2', 'L1', 'R1', 'R2', 'R3', 'R4', 'R5'], []);
  // Используем useRef для хранения ссылок на контейнеры виртуальных клавиатур каждого пальца
  const keyboardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Эффект для позиционирования виртуальных клавиатур относительно центральных точек пальцев
  useEffect(() => {
    fingerIds.forEach((fingerId) => {
      // Находим "домашнюю" клавишу для текущего пальца из его раскладки
      const homeKeyEntry = Object.entries(fingerLayoutASDF).find(
        ([, fingerData]) => fingerData.fingerId === fingerId && fingerData.isHomeKey
      );
      if (!homeKeyEntry) return; // Если домашняя клавиша не найдена, пропускаем

      const homeKeyId = homeKeyEntry[0] as KeyCapId;
      // Находим элемент центральной точки пальца в SVG
      const fingerElement = document.querySelector(`[data-finger-id="${fingerId}"] .finger-center-point`);
      // Получаем контейнер виртуальной клавиатуры для этого пальца
      const keyboardContainer = keyboardRefs.current[fingerId];

      if (fingerElement && keyboardContainer) {
        // ВАЖНО: Поиск `keyElement` должен быть ограничен `keyboardContainer` этого пальца.
        // Глобальный `document.querySelector` может найти клавишу в другом, одновременно
        // отображаемом кластере, что приведет к неверному позиционированию.
        const keyElement = keyboardContainer.querySelector(`[data-keycap-id="${homeKeyId}"] .keycap-center-point`);

        if (keyElement) {
          const fingerRect = fingerElement.getBoundingClientRect(); // Размеры и позиция точки пальца
          const keyRect = keyElement.getBoundingClientRect();       // Размеры и позиция точки "домашней" клавиши
          const containerRect = keyboardContainer.parentElement?.getBoundingClientRect(); // Размеры и позиция родительского контейнера клавиатуры

          if (containerRect) {
            // Вычисляем смещения для перемещения клавиатуры
            const deltaX = (fingerRect.left - containerRect.left) - (keyRect.left - containerRect.left);
            const deltaY = (fingerRect.top - containerRect.top) - (keyRect.top - containerRect.top);

            // Применяем трансформацию для позиционирования клавиатуры
            keyboardContainer.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
          }
        }
      }
    });
  }, [viewModel, fingerIds]); // Зависимости эффекта: viewModel и fingerIds

  // Извлекаем состояния пальцев из viewModel для применения стилей
  const fingerStates = Object.fromEntries(
    Object.entries(viewModel).map(([fingerId, fingerSceneState]) => [fingerId, fingerSceneState.fingerState])
  ) as Record<FingerId, FingerState>;

  return (
    <div
      className={cn("relative w-full h-full", className)}
      {...props}
    >
      {/* Слой с SVG-изображениями рук */}
      <div
        className={cn(
          handsVariants({ centerPointVisibility, ...fingerStates }), // Применяем динамические стили для окрашивания пальцев
          "flex w-screen justify-center mt-10"
        )}
      >
        {/* Левая рука */}
        <svg className="w-3xs" viewBox="0 0 281 321">
          {/* Каждая группа <g> представляет собой палец с его формой и центральной точкой */}
          <g data-finger-id="L1"><path className="L1" d={part1} /><circle cx="260" cy="240" r="2" className="finger-center-point" /></g>
          <g data-finger-id="L2"><path className="L2" d={part2} /><circle cx="240" cy="55" r="2" className="finger-center-point" /></g>
          <g data-finger-id="L3"><path className="L3" d={part3} /><circle cx="172" cy="18" r="2" className="finger-center-point" /></g>
          <g data-finger-id="L4"><path className="L4" d={part4} /><circle cx="90" cy="25" r="2" className="finger-center-point" /></g>
          <g data-finger-id="L5"><path className="L5" d={part5} /><circle cx="15" cy="60" r="2" className="finger-center-point" /></g>
          <g data-finger-id="LB"><path className="LB" d={partB} /></g> {/* Большой палец левой руки */}
        </svg>
        <div className="w-12" /> {/* Пространство между руками */}
        {/* Правая рука (отзеркаленная левая) */}
        <svg className="w-3xs -scale-x-100" viewBox="0 0 281 321">
          <g data-finger-id="R1"><path className="R1" d={part1} /><circle cx="260" cy="240" r="2" className="finger-center-point" /></g>
          <g data-finger-id="R2"><path className="R2" d={part2} /><circle cx="240" cy="55" r="2" className="finger-center-point" /></g>
          <g data-finger-id="R3"><path className="R3" d={part3} /><circle cx="172" cy="18" r="2" className="finger-center-point" /></g>
          <g data-finger-id="R4"><path className="R4" d={part4} /><circle cx="90" cy="25" r="2" className="finger-center-point" /></g>
          <g data-finger-id="R5"><path className="R5" d={part5} /><circle cx="15" cy="60" r="2" className="finger-center-point" /></g>
          <g data-finger-id="RB"><path className="RB" d={partB} /></g> {/* Большой палец правой руки */}
        </svg>

        {/*
          Слой клавиатур: Рендерится *после* SVG рук, чтобы гарантировать,
          что кластеры клавиш будут отображаться поверх (выше по z-оси).
        */}
        {fingerIds.map((fingerId) => {
          const fingerSceneState = viewModel[fingerId];
          // Рендерим клавиатуру только если палец не в состоянии 'IDLE' и у него есть ассоциированные клавиши
          if (fingerSceneState.fingerState === 'IDLE' || !fingerSceneState.keyCapStates) {
            return null;
          }

          // Генерируем виртуальный макет для текущего пальца
          const virtualLayout = generateVirtualLayoutForFinger(fingerId, viewModel);

          // Определяем активные модификаторы (Shift, Ctrl, Alt, Meta) из всей сцены
          // Это нужно, чтобы модификаторы были подсвечены на всех клавиатурах, если они являются целевыми
          const activeModifiers: ModifierKey[] = [];
          const allTargetKeyCaps = Object.values(viewModel)
            .filter((f) => f.fingerState === 'ACTIVE' && f.keyCapStates) // Ищем активные пальцы с клавишами
            .flatMap((f) =>
                Object.entries(f.keyCapStates!)
                    .filter(([, state]) => state.navigationRole === 'TARGET') // Фильтруем по целевым клавишам
                    .map(([keyCapId]) => keyCapId as KeyCapId) // Извлекаем KeyCapId
            );

          // Проверяем, является ли какой-либо модификатор целевой клавишей
          if (allTargetKeyCaps.some((k) => k === 'ShiftLeft' || k === 'ShiftRight')) activeModifiers.push('shift');
          if (allTargetKeyCaps.some((k) => k === 'ControlLeft' || k === 'ControlRight')) activeModifiers.push('ctrl');
          if (allTargetKeyCaps.some((k) => k === 'AltLeft' || k === 'AltRight')) activeModifiers.push('alt');
          if (allTargetKeyCaps.some((k) => k === 'MetaLeft' || k === 'MetaRight')) activeModifiers.push('meta');

          return (
            <div
              key={fingerId}
              ref={(el) => { keyboardRefs.current[fingerId] = el; }} // Сохраняем ссылку на контейнер клавиатуры
              className="absolute top-0 left-0" // Позиционируем абсолютно для дальнейшего смещения
            >
              <VirtualKeyboard virtualLayout={virtualLayout} activeModifiers={activeModifiers}/>
            </div>
          );
        })}
      </div>
    </div>
  );
};

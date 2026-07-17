<script lang="ts">
  import type {
    FingerId,
    FingerLayout,
    FingerNavigationRole,
    HandsSceneViewModel,
    KeyCapId,
    PhysicalLayout,
    SymbolLayout,
    Visibility,
  } from '@/interfaces/types';
  import {
    LEFT_HAND_BASE,
    LEFT_HAND_FINGERS,
    RIGHT_HAND_BASE,
    RIGHT_HAND_FINGERS,
  } from '@/interfaces/types';
  import { createKeyboardSceneForFinger } from '@/lib/keyboard-scene';
  import { createKeyLabelMap } from '@/lib/key-cap';
  import { calculateClusterTranslation } from './cluster-translation';
  import { HAND_VIEW_BOX } from './finger-paths';
  import { onMount } from 'svelte';
  import { on } from 'svelte/events';
  import { scale } from 'svelte/transition';
  import Finger from './Finger.svelte';
  import KeyboardScene from './KeyboardScene.svelte';
  import MovementPath from './MovementPath.svelte';

  // Положительная обратная связь на КАЖДОЕ верное продвижение: завершённый («призрак»)
  // кластер показывает CORRECT (зелёный) и гаснет ПОВЕРХ текущего кластера; текущий
  // (живой) предъявляется лёгким scale+fade. При prefers-reduced-motion — мгновенно.
  const CLUSTER_FADE_OUT_MS = 600; // гашение отработанного (CORRECT) кластера (подстраиваемо)
  const CLUSTER_FADE_IN_MS = 200; // предъявление нового
  const CLUSTER_SCALE_FROM = 0.92; // стартовый масштаб «предъявления» нового кластера

  const LEFT_HAND_IDS: FingerId[] = [...LEFT_HAND_FINGERS, LEFT_HAND_BASE];
  const RIGHT_HAND_IDS: FingerId[] = [...RIGHT_HAND_FINGERS, RIGHT_HAND_BASE];
  const ALL_FINGER_IDS: FingerId[] = [...LEFT_HAND_IDS, ...RIGHT_HAND_IDS];
  const FINGER_IDS_FOR_RENDER: FingerId[] = [...LEFT_HAND_FINGERS, ...RIGHT_HAND_FINGERS];

  const emptyRefMap = <T>(): Record<FingerId, T | null> =>
    Object.fromEntries(ALL_FINGER_IDS.map((id) => [id, null])) as Record<FingerId, T | null>;

  interface Props {
    handsScene: HandsSceneViewModel;
    fingerLayout: FingerLayout;
    physicalLayout: PhysicalLayout;
    symbolLayout: SymbolLayout;
    centerPointVisibility?: Visibility;
    /**
     * Ключ продвижения (индекс курсора потока). Меняется на каждом ВЕРНОМ продвижении —
     * им заводится анимация кластера, чтобы обратная связь была видна даже когда
     * следующий символ совпадает с предыдущим (повтор буквы). Ошибка ключ не меняет.
     */
    advanceKey?: number;
    /**
     * ViewModel только что ЗАВЕРШЁННОГО символа (предыдущего) — с CORRECT на цели.
     * Рендерится как «призрак» уходящего кластера (зелёный отклик), который гаснет.
     */
    outgoingHandsScene?: HandsSceneViewModel;
  }

  const {
    handsScene,
    fingerLayout,
    physicalLayout,
    symbolLayout,
    centerPointVisibility = 'INVISIBLE',
    advanceKey = 0,
    outgoingHandsScene,
  }: Props = $props();

  let reduceMotion = $state(false);
  onMount(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduceMotion = mq.matches;
    return on(mq, 'change', () => { reduceMotion = mq.matches; });
  });

  // Per-finger derived states for the <Finger> components
  const fingerNavigationRoles = $derived(
    Object.fromEntries(
      Object.entries(handsScene).map(([fingerId, fingerSceneState]) => [
        fingerId,
        (fingerSceneState as { navigationRole: FingerNavigationRole }).navigationRole,
      ])
    ) as Record<FingerId, FingerNavigationRole>
  );

  // Refs (keyed by FingerId). All FingerIds are pre-initialized to null so that
  // `bind:` on a not-yet-mounted element doesn't trip Svelte's
  // props_invalid_value guard for $bindable props.
  const fingerCenterRefs: Record<FingerId, SVGCircleElement | null> = $state(emptyRefMap<SVGCircleElement>());
  const clusterRefs: Record<FingerId, HTMLDivElement | null> = $state(emptyRefMap<HTMLDivElement>());

  // Computed translations per finger; once set, reused across rerenders so the
  // cluster snaps into place without flicker when remounted.
  const clusterTranslations: Partial<Record<FingerId, { dx: number; dy: number }>> = $state({});

  // Готовая map надписей клавиш — KeyboardScene не вызывает getLabel в template,
  // а читает уже посчитанные значения.
  const keyLabels = $derived(createKeyLabelMap({ physicalLayout, symbolLayout }));

  /** Упорядоченный путь дом→…→цель для целевого пальца (для анимации `MovementPath`). */
  function movementPathFor(fingerId: FingerId): KeyCapId[] {
    const finger = handsScene[fingerId];
    return finger.navigationRole === 'TARGET' ? finger.navigationPath : [];
  }

  $effect(() => {
    // Reactive reads to retrigger when the scene changes
    const _vm = handsScene;
    const _fl = fingerLayout;

    FINGER_IDS_FOR_RENDER.forEach((fingerId) => {
      if (clusterTranslations[fingerId]) return;

      const homeKeyEntry = _fl.find(
        (item) => item.fingerId === fingerId && item.home
      );
      if (!homeKeyEntry) return;

      const centerEl = fingerCenterRefs[fingerId];
      const clusterEl = clusterRefs[fingerId];
      if (!centerEl || !clusterEl || !clusterEl.parentElement) return;

      // Local lookup inside this cluster (not document-wide)
      const keyEl = clusterEl.querySelector(
        `[data-keycap-id="${homeKeyEntry.keyCapId}"] .keycap-center-point`
      );
      if (!keyEl) return;

      const translation = calculateClusterTranslation({
        fingerElement: centerEl,
        keyElement: keyEl,
        containerElement: clusterEl.parentElement,
      });
      if (translation) {
        clusterTranslations[fingerId] = { dx: translation.deltaX, dy: translation.deltaY };
      }
    });
  });
</script>

<div class="hands-scene-root">
  <div class="hands-layer" data-center-point-visibility={centerPointVisibility}>
    <svg class="hand-svg" viewBox={HAND_VIEW_BOX} data-hand="left">
      {#each LEFT_HAND_IDS as fingerId (fingerId)}
        <Finger
          {fingerId}
          navigationRole={fingerNavigationRoles[fingerId]}
          bind:centerRef={fingerCenterRefs[fingerId]}
        />
      {/each}
    </svg>

    <div class="hand-spacer"></div>

    <svg class="hand-svg hand-svg--mirrored" viewBox={HAND_VIEW_BOX} data-hand="right">
      {#each RIGHT_HAND_IDS as fingerId (fingerId)}
        <Finger
          {fingerId}
          navigationRole={fingerNavigationRoles[fingerId]}
          bind:centerRef={fingerCenterRefs[fingerId]}
        />
      {/each}
    </svg>

    <!-- ТЕКУЩИЙ кластер (живой, всегда виден): предъявляется лёгким scale+fade.
         Ключ на уровне группы — новый набор монтируется целиком, даже при смене пальца. -->
    {#key advanceKey}
      <div class="cluster-group">
        {#each FINGER_IDS_FOR_RENDER as fingerId (fingerId)}
          {#if handsScene[fingerId].navigationRole === 'TARGET'}
            {@const keyboardScene = createKeyboardSceneForFinger({ fingerId, handsScene, fingerLayout, physicalLayout })}
            {@const t = clusterTranslations[fingerId]}
            {@const movementPath = movementPathFor(fingerId)}
            <div
              bind:this={clusterRefs[fingerId]}
              data-cluster-id={fingerId}
              class="cluster-container"
              style:transform={t ? `translate(${t.dx}px, ${t.dy}px)` : undefined}
              style:visibility={t ? 'visible' : 'hidden'}
            >
              <!-- Внутренняя обёртка несёт scale «предъявления» отдельно от transform:translate
                   контейнера (иначе конфликт за одно свойство transform). -->
              <div
                class="cluster-inner"
                in:scale={{
                  start: reduceMotion ? 1 : CLUSTER_SCALE_FROM,
                  opacity: 0,
                  duration: reduceMotion ? 0 : CLUSTER_FADE_IN_MS,
                }}
              >
                <KeyboardScene {keyboardScene} {keyLabels} />
                {#if movementPath.length >= 1}
                  <MovementPath path={movementPath} {fingerId} />
                {/if}
              </div>
            </div>
          {/if}
        {/each}
      </div>
    {/key}

    <!-- ПРИЗРАК завершённого кластера — ПОВЕРХ текущего: показывает CORRECT (зелёный отклик)
         и гаснет CSS-анимацией на монтировании. Именно ПОВЕРХ: иначе (под текущим кластером)
         в «том же кластере» полупрозрачные клавиши текущего накрывают зелёный, и он читается
         мутным / «просвечивает из-под» (ревью владельца). Позиция — из кэша пальца (он только
         что был целью); без ref/MovementPath, pointer-events:none (кластер отработан). -->
    {#if outgoingHandsScene}
      {#key advanceKey}
        <div
          class="cluster-group cluster-ghost"
          class:reduced={reduceMotion}
          style:--cluster-ghost-duration="{CLUSTER_FADE_OUT_MS}ms"
        >
          {#each FINGER_IDS_FOR_RENDER as fingerId (fingerId)}
            {#if outgoingHandsScene[fingerId].navigationRole === 'TARGET'}
              {@const gt = clusterTranslations[fingerId]}
              {#if gt}
                {@const ghostScene = createKeyboardSceneForFinger({ fingerId, handsScene: outgoingHandsScene, fingerLayout, physicalLayout })}
                <div class="cluster-container" style:transform={`translate(${gt.dx}px, ${gt.dy}px)`}>
                  <div class="cluster-inner">
                    <KeyboardScene keyboardScene={ghostScene} {keyLabels} />
                  </div>
                </div>
              {/if}
            {/if}
          {/each}
        </div>
      {/key}
    {/if}
  </div>
</div>

<style>
  .hands-scene-root {
    position: relative;
    width: 100%;
    height: 100%;
    /* Поднято на 30px (6rem → 4.5rem при 1rem=20px): кластер и руки ближе к
       строке потока, меньше мёртвого воздуха между ритм-каналом и клавишами. */
    padding-top: 4.5rem;
    box-sizing: border-box;
  }

  .hands-layer {
    display: flex;
    width: 100vw;
    justify-content: center;
  }

  .hand-svg {
    width: 16rem;
  }

  .hand-svg--mirrored {
    transform: scaleX(-1);
  }

  .hand-spacer {
    width: 6rem;
  }

  .cluster-container {
    position: absolute;
    top: 0;
    left: 0;
  }

  /* Обёртка scale-«предъявления». Позиционированная (MovementPath-оверлей inset:0
     привязывается к ней). transform-origin у домашнего ряда: scale растёт от дома
     наружу и почти не смещает домашнюю клавишу — выверенное позиционирование кластера
     (по ней центрируется) не сбивается. */
  .cluster-inner {
    position: relative;
    display: inline-block;
    transform-origin: 50% 65%;
  }

  /* Призрак завершённого кластера: гаснет CSS-анимацией на монтировании. */
  .cluster-ghost {
    animation: cluster-ghost-fadeout var(--cluster-ghost-duration, 400ms) ease forwards;
    pointer-events: none;
  }
  .cluster-ghost.reduced {
    animation: none;
    opacity: 0;
  }
  @keyframes cluster-ghost-fadeout {
    from { opacity: 1; }
    to { opacity: 0; }
  }

  /* Drive the finger-center-point fill via a custom property on the ancestor.
     The <Finger> component reads var(--center-point-fill, transparent). */
  .hands-layer[data-center-point-visibility="VISIBLE"] {
    --center-point-fill: var(--hands-center-point-fill);
  }
  .hands-layer[data-center-point-visibility="INVISIBLE"] {
    --center-point-fill: transparent;
  }
</style>

<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import KeyboardScene from './KeyboardScene.svelte';
  import { fingerLayoutASDF } from '@/data/layouts/finger-layout-asdf';
  import { physicalLayoutANSI } from '@/data/layouts/physical-layout-ansi';
  import { getSymbolLayout } from '@/data/layouts/layouts';
  import { createKeyboardScene } from '@/lib/keyboard-scene';

  const symbolLayoutEn = getSymbolLayout('qwerty');
  const symbolLayoutJcuken = getSymbolLayout('йцукен');

  const keyboardSceneEn = createKeyboardScene({
    physicalLayout: physicalLayoutANSI,
    symbolLayout: symbolLayoutEn,
    fingerLayout: fingerLayoutASDF,
  });

  const keyboardSceneRu = createKeyboardScene({
    physicalLayout: physicalLayoutANSI,
    symbolLayout: symbolLayoutJcuken,
    fingerLayout: fingerLayoutASDF,
  });

  const { Story } = defineMeta({
    title: 'UI/KeyboardScene',
    component: KeyboardScene,
    args: {
      keyboardScene: keyboardSceneEn,
      physicalLayout: physicalLayoutANSI,
      symbolLayout: symbolLayoutEn,
    },
  });
</script>

<Story name="WholeKeyboard" />

<Story name="CyrillicKeyboard" args={{ keyboardScene: keyboardSceneRu, symbolLayout: symbolLayoutJcuken }} />

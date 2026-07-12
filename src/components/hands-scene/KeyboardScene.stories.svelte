<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import KeyboardScene from './KeyboardScene.svelte';
  import { getFingerLayout, getPhysicalLayout, getSymbolLayout } from '@/lib/layouts';
  import { createKeyboardScene } from '@/lib/keyboard-scene';
  import { createKeyLabelMap } from '@/lib/key-cap';

  const fingerLayoutASDF = getFingerLayout('asdf');
  const fingerLayoutSDFV = getFingerLayout('sdfv');
  const physicalLayoutANSI = getPhysicalLayout('ansi');
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

  // SDFV: указательные «дома» на нижнем ряду (V/N), три пальца сдвинуты к центру.
  const keyboardSceneSdfv = createKeyboardScene({
    physicalLayout: physicalLayoutANSI,
    symbolLayout: symbolLayoutEn,
    fingerLayout: fingerLayoutSDFV,
  });

  const keyLabelsEn = createKeyLabelMap({
    physicalLayout: physicalLayoutANSI,
    symbolLayout: symbolLayoutEn,
  });

  const keyLabelsRu = createKeyLabelMap({
    physicalLayout: physicalLayoutANSI,
    symbolLayout: symbolLayoutJcuken,
  });

  const { Story } = defineMeta({
    title: 'UI/KeyboardScene',
    component: KeyboardScene,
  });
</script>

<Story name="WholeKeyboard"    args={{ keyboardScene: keyboardSceneEn, keyLabels: keyLabelsEn }} />
<Story name="CyrillicKeyboard" args={{ keyboardScene: keyboardSceneRu, keyLabels: keyLabelsRu }} />
<Story name="SdfvFingerLayout" args={{ keyboardScene: keyboardSceneSdfv, keyLabels: keyLabelsEn }} />

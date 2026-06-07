<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import KeyCap from "./KeyCap.svelte";
  import {
    KEY_CAP_HOME_KEY_MARKERS,
    KEY_CAP_NAVIGATION_ARROWS,
    KEY_CAP_NAVIGATION_ROLES,
    KEY_CAP_PRESS_RESULTS,
    KEY_CAP_SYMBOL_SIZES,
    KEY_CAP_UNIT_WIDTHS,
    LEFT_HAND_BASE,
    LEFT_HAND_FINGERS,
    RIGHT_HAND_BASE,
    RIGHT_HAND_FINGERS,
    VISIBILITY_STATES,
  } from "@/interfaces/types";

  const { Story } = defineMeta({
    title: "UI/KeyCap",
    component: KeyCap,
    parameters: { controls: { sort: "none" } }, // 'none' | 'alpha' | 'requiredFirst'

    args: {
      symbol: "A",
      pressResult: "NONE",
    },
    argTypes: {
      visibility: { options: VISIBILITY_STATES, control: "inline-radio" },
      pressResult: { options: KEY_CAP_PRESS_RESULTS, control: "inline-radio" },
      symbol: { table: { disable: true } },
      keyCapId: { table: { disable: true } },
      home: { control: "boolean" },
      fingerId: {
        options: [...LEFT_HAND_FINGERS, ...RIGHT_HAND_FINGERS, LEFT_HAND_BASE, RIGHT_HAND_BASE],
        control: "inline-radio",
      },
      navigationRole: { options: KEY_CAP_NAVIGATION_ROLES, control: "inline-radio" },
      navigationArrow: { options: KEY_CAP_NAVIGATION_ARROWS, control: "inline-radio" },
      homeKeyMarker: { options: KEY_CAP_HOME_KEY_MARKERS, control: "inline-radio" },
      unitWidth: { options: KEY_CAP_UNIT_WIDTHS, control: "inline-radio" },
      symbolSize: { options: KEY_CAP_SYMBOL_SIZES, control: "inline-radio" },
    },
  });
</script>

<Story name="Default" />

<Story name="Correct" args={{ pressResult: "CORRECT" }} />

<Story name="Error" args={{ pressResult: "ERROR" }} />

<Story name="Wide1_25U" args={{ symbol: "Ctrl", unitWidth: "1.25U" }} />

<Story name="Wide1_5U" args={{ symbol: "Tab", unitWidth: "1.5U" }} />

<Story name="Wide1_75U" args={{ symbol: "Caps", unitWidth: "1.75U" }} />

<Story name="Wide2U" args={{ symbol: "Shift", unitWidth: "2U" }} />

<Story name="Wide2_5U" args={{ symbol: "Shift R", unitWidth: "2.5U" }} />

<Story name="Wide5U" args={{ symbol: "Space", unitWidth: "5U" }} />

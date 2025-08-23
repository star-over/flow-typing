import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { KeyCap } from './keycap';

const meta = {
  component: KeyCap,
  argTypes: {
    visibility: {
      options: ["VISIBLE", "INVISIBLE"] satisfies Visibility[],
      control: "inline-radio",
    },
    homeKeyMarker: {
      options: ["NONE", "BAR", "DOT"] satisfies KeyCapHomeKeyMarker[],
      control: "inline-radio",
    },
    navigationRole: {
      options: ["IDLE", "HOME", "PATH", "TARGET"] satisfies KeyCapNavigationRole[],
      control: "inline-radio",
    },
    unitWidth: {
      options: ["1U", "1.25U", "1.5U", "1.75U", "2U", "5U"] satisfies KeyCapUnitWidth[],
      control: "inline-radio",
    },
    pressResult: {
      options: ["NEUTRAL", "CORRECT", "INCORRECT"]  satisfies KeyCapPressResult[],
      control: "inline-radio",
    },
  },
} satisfies Meta<typeof KeyCap>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "A",
    visibility: meta.argTypes.visibility.options[0],
    homeKeyMarker: meta.argTypes.homeKeyMarker.options[0],
    navigationRole: meta.argTypes.navigationRole.options[0],
    unitWidth: meta.argTypes.unitWidth.options[0],
    pressResult: meta.argTypes.pressResult.options[0],
  },
  // render: (args) => <KeyCap {...args} />
};

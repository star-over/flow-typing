import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Geist, Geist_Mono } from 'next/font/google';

import {
  KEY_CAP_HOME_KEY_MARKERS,
  KEY_CAP_NAVIGATION_ARROWS,
  KEY_CAP_NAVIGATION_ROLES,
  KEY_CAP_PRESS_RESULTS,
  KEY_CAP_SYMBOL_SIZES,
  KEY_CAP_UNIT_WIDTHS,
  LEFT_HAND_FINGER_IDS,
  RIGHT_HAND_FINGER_IDS,
  VISIBILITY_STATES,
} from "@/interfaces/types";

import { KeyCap } from './keycap';

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const meta = {
  title: 'UI/KeyCap',
  component: KeyCap,

  argTypes: {
    visibility: {
      options: VISIBILITY_STATES,
      control: "inline-radio",
    },
    isHomeKey: {
      name: 'Is It Home Key',
      control: 'boolean',
      description: 'Toggle to switch between Home key and not',
    },
    fingerId: {
      options: [...LEFT_HAND_FINGER_IDS, ...RIGHT_HAND_FINGER_IDS],
      control: "inline-radio",
    },
    navigationRole: {
      options: KEY_CAP_NAVIGATION_ROLES,
      control: "inline-radio",
    },
    navigationArrowFrom: {
      options: KEY_CAP_NAVIGATION_ARROWS,
      control: "inline-radio",
    },
    homeKeyMarker: {
      options: KEY_CAP_HOME_KEY_MARKERS,
      control: "inline-radio",
    },
    unitWidth: {
      options: KEY_CAP_UNIT_WIDTHS,
      control: "inline-radio",
    },
    symbolSize: {
      options: KEY_CAP_SYMBOL_SIZES,
      control: "inline-radio",
    },
    pressResult: {
      options: KEY_CAP_PRESS_RESULTS,
      control: "inline-radio",
    },
    centerPointVisibility: {
      options: VISIBILITY_STATES,
      control: "inline-radio",
    },

  },
  decorators: [
    Story => (
      <div className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof KeyCap>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isHomeKey: false,
    fingerId: meta.argTypes.fingerId.options[0],
    visibility: meta.argTypes.visibility.options[0],
    homeKeyMarker: meta.argTypes.homeKeyMarker.options[0],
    navigationRole: meta.argTypes.navigationRole.options[0],
    navigationArrowFrom: meta.argTypes.navigationArrowFrom.options[0],
    unitWidth: meta.argTypes.unitWidth.options[0],
    symbolSize: meta.argTypes.symbolSize.options[0],
    pressResult: meta.argTypes.pressResult.options[0],
    centerPointVisibility: meta.argTypes.centerPointVisibility.options[0],
    symbol: "G",
    keyCapId: 'KeyG',
  },
  render: (args) => <KeyCap {...args} />
};

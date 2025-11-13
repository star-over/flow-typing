import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Geist, Geist_Mono } from 'next/font/google';
import { KeyCap } from './keycap';
import { KeyCapHomeKeyMarker, KeyCapNavigationRole, KeyCapPressResult, KeyCapSymbolSize, KeyCapUnitWidth, Visibility } from "@/interfaces/types";

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
  // parameters: {
  //   layout: 'centered',
  // },
  // tags: ['autodocs'],

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
    symbolSize: {
      options: ["MD", "SM", "XS"] satisfies KeyCapSymbolSize[],
      control: "inline-radio",
    },
    pressResult: {
      options: ["NEUTRAL", "CORRECT", "INCORRECT"]  satisfies KeyCapPressResult[],
      control: "inline-radio",
    },
    centerPointVisibility: {
      options: ["VISIBLE", "INVISIBLE"] satisfies Visibility[],
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
    symbol: "A",
    visibility: meta.argTypes.visibility.options[0],
    homeKeyMarker: meta.argTypes.homeKeyMarker.options[0],
    navigationRole: meta.argTypes.navigationRole.options[0],
    unitWidth: meta.argTypes.unitWidth.options[0],
    symbolSize: meta.argTypes.symbolSize.options[0],
    pressResult: meta.argTypes.pressResult.options[0],
    centerPointVisibility: meta.argTypes.centerPointVisibility.options[0],
  },
  // render: (args) => <KeyCap {...args} />
};

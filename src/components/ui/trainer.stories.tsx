import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Geist, Geist_Mono } from 'next/font/google';
import { Trainer } from './trainer';

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const meta = {
  title: 'UI/Trainer',
  component: Trainer,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    // No specific argTypes for now as it's a simple container
  },
  decorators: [
    Story => (
      <div className={`${geistSans.variable} ${geistMono.variable} antialiased w-full`}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Trainer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    // No args needed for the default story yet
  },
};

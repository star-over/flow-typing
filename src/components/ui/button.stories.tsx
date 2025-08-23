import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Button } from './button';

// import { ComponentProps } from "react";
// import { ButtonProps } from "@/stories/Button";
// type StoryProps = ComponentProps<typeof Button>;

const meta = {
  component: Button,
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "hello",
    // asChild: false,
    variant: "link"
  },
  render: (args) => <Button {...args}/>
};

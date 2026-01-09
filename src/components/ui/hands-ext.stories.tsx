import type { Meta, StoryObj } from '@storybook/react';

import { idleFixture } from '@/fixtures/hands-ext/idle.fixture';
import { shiftCurlyBraceFixture } from '@/fixtures/hands-ext/shift-curly-brace.fixture';
import { shiftDFixture } from '@/fixtures/hands-ext/shift-d.fixture';
import { shiftFFixture } from '@/fixtures/hands-ext/shift-f.fixture';
import { shiftPlusFixture } from '@/fixtures/hands-ext/shift-plus.fixture';
import { shiftQuoteFixture } from '@/fixtures/hands-ext/shift-quote.fixture';
import { simple2Fixture } from '@/fixtures/hands-ext/simple-2.fixture';
import { simpleCFixture } from '@/fixtures/hands-ext/simple-c.fixture';
import { simpleKFixture } from '@/fixtures/hands-ext/simple-k.fixture';
import { simpleKErrorFixture } from '@/fixtures/hands-ext/simple-k-error.fixture';
import { simpleNFixture } from '@/fixtures/hands-ext/simple-n.fixture';
import { simpleTFixture } from '@/fixtures/hands-ext/simple-t.fixture';
import { spaceFixture } from '@/fixtures/hands-ext/space.fixture';

import { HandsExt } from './hands-ext';


const meta = {
  title: 'UI/HandsExt',
  component: HandsExt,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    viewModel: {
      control: 'object',
    }
  }
} satisfies Meta<typeof HandsExt>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  args: {
    viewModel: idleFixture.expectedOutput,
    className: 'pt-12',
  },
};

export const SimpleK: Story = {
  args: {
    viewModel: simpleKFixture.expectedOutput,
    className: 'pt-12',
  },
};

export const SimpleKError: Story = {
  args: {
    viewModel: simpleKErrorFixture.expectedOutput,
    className: 'pt-12',
  },
};

export const SimpleN: Story = {
  args: {
    viewModel: simpleNFixture.expectedOutput,
    className: 'pt-12',
  },
};

export const SimpleT: Story = {
  args: {
    viewModel: simpleTFixture.expectedOutput,
    className: 'pt-12',
  },
};

export const SimpleC: Story = {
  args: {
    viewModel: simpleCFixture.expectedOutput,
    className: 'pt-12',
  },
};

export const ShiftF: Story = {
  args: {
    viewModel: shiftFFixture.expectedOutput,
    className: 'pt-12',
  },
};

export const ShiftD: Story = {
  args: {
    viewModel: shiftDFixture.expectedOutput,
    className: 'pt-12',
  },
};

export const Simple2: Story = {
  args: {
    viewModel: simple2Fixture.expectedOutput,
    className: 'pt-12',
  },
};

export const Space: Story = {
  args: {
    viewModel: spaceFixture.expectedOutput,
    className: 'pt-12',
  },
};


export const ShiftPlus: Story = {
  args: {
    viewModel: shiftPlusFixture.expectedOutput,
    className: 'pt-12',
  },
};

export const ShiftCurlyBrace: Story = {
  args: {
    viewModel: shiftCurlyBraceFixture.expectedOutput,
    className: 'pt-12',
  },
};

export const ShiftQuote: Story = {
  args: {
    viewModel: shiftQuoteFixture.expectedOutput,
    className: 'pt-12',
  },
};

import type { Meta, StoryObj } from '@storybook/react';

import { idleFixture } from '@/fixtures/hands-ext/idle.fixture';
import { shift_t_error_shift_n } from '@/fixtures/hands-ext/shift_t_error_shift_n';
import { simple_e_error_shift_F } from '@/fixtures/hands-ext/simple_e_error_shift_F.fixture';
import { shift_o_error_simple_o } from '@/fixtures/hands-ext/shift_o_error_simple_o';
import { simple_e_error_space } from '@/fixtures/hands-ext/simple_e_error_space';
import { k_j } from '@/fixtures/hands-ext/k_j.fixture';
import { r_f } from '@/fixtures/hands-ext/r_f.fixture';
import { shiftCurlyBraceFixture } from '@/fixtures/hands-ext/shift-curly-brace.fixture';
import { shiftDFixture } from '@/fixtures/hands-ext/shift-d.fixture';
import { shiftFFixture } from '@/fixtures/hands-ext/shift-f.fixture';
import { shiftPlusFixture } from '@/fixtures/hands-ext/shift-plus.fixture';
import { shiftQuoteFixture } from '@/fixtures/hands-ext/shift-quote.fixture';
import { simple2Fixture } from '@/fixtures/hands-ext/simple-2.fixture';
import { simpleCFixture } from '@/fixtures/hands-ext/simple-c.fixture';
import { k } from '@/fixtures/hands-ext/simple-k.fixture';
import { simpleNFixture } from '@/fixtures/hands-ext/simple-n.fixture';
import { t } from '@/fixtures/hands-ext/t.fixture';
import { spaceFixture } from '@/fixtures/hands-ext/space.fixture';
import { shift_o } from '@/fixtures/hands-ext/shift_o.fixture';

import { HandsExt } from './hands-ext';


const meta = {
  title: 'UI/HandsExt',
  component: HandsExt,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: { viewModel: {} }

} satisfies Meta<typeof HandsExt>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  args: {
    viewModel: idleFixture.expectedOutput,
    className: 'pt-40',
  },
};

export const shiftTErrorShiftN: Story = {
  args: {
    viewModel: shift_t_error_shift_n.expectedOutput,
    className: 'pt-40',
  },
};

export const shiftOErrorSimpleO: Story = {
  args: {
    viewModel: shift_o_error_simple_o.expectedOutput,
    className: 'pt-40',
  },
};

export const shiftO: Story = {
  args: {
    viewModel: shift_o.expectedOutput,
    className: 'pt-40',
  },
};

export const simpleEErrorShiftF: Story = {
  args: {
    viewModel: simple_e_error_shift_F.expectedOutput,
    className: 'pt-40',
  },
};

export const simpleEErrorSpace: Story = {
  args: {
    viewModel: simple_e_error_space.expectedOutput,
    className: 'pt-40',
  },
};

export const T: Story = {
  args: {
    viewModel: t.expectedOutput,
    className: 'pt-40',
  },
};

export const K: Story = {
  args: {
    viewModel: k.expectedOutput,
    className: 'pt-40',
  },
};

export const SimpleKErrorJ: Story = {
  args: {
    viewModel: k_j.expectedOutput,
    className: 'pt-40',
  },
};
export const simpleRErrorF: Story = {
  args: {
    viewModel: r_f.expectedOutput,
    className: 'pt-40',
  },
};

export const SimpleN: Story = {
  args: {
    viewModel: simpleNFixture.expectedOutput,
    className: 'pt-40',
  },
};



export const SimpleC: Story = {
  args: {
    viewModel: simpleCFixture.expectedOutput,
    className: 'pt-40',
  },
};

export const ShiftF: Story = {
  args: {
    viewModel: shiftFFixture.expectedOutput,
    className: 'pt-40',
  },
};

export const ShiftD: Story = {
  args: {
    viewModel: shiftDFixture.expectedOutput,
    className: 'pt-40',
  },
};

export const Simple2: Story = {
  args: {
    viewModel: simple2Fixture.expectedOutput,
    className: 'pt-40',
  },
};

export const Space: Story = {
  args: {
    viewModel: spaceFixture.expectedOutput,
    className: 'pt-40',
  },
};


export const ShiftPlus: Story = {
  args: {
    viewModel: shiftPlusFixture.expectedOutput,
    className: 'pt-40',
  },
};

export const ShiftCurlyBrace: Story = {
  args: {
    viewModel: shiftCurlyBraceFixture.expectedOutput,
    className: 'pt-40',
  },
};

export const ShiftQuote: Story = {
  args: {
    viewModel: shiftQuoteFixture.expectedOutput,
    className: 'pt-40',
  },
};

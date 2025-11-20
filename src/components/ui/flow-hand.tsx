import * as React from 'react';
import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import { Hand, HandProps } from './hand';
import { FingerId, FingerState, HandSide } from "@/interfaces/types";

// Map FingerId to a generic finger index (1-5) for styling
const fingerIdToFingerIndex: Record<HandSide, Record<FingerId, number>> = {
  LEFT: {
    L5: 1, // Pinky
    L4: 2, // Ring
    L3: 3, // Middle
    L2: 4, // Index
    L1: 5, // Thumb
    LB: 0, // Base - no direct finger mapping
    RB: 0, // Not a left finger
    R1: 0, // Not a left finger
    R2: 0, // Not a left finger
    R3: 0, // Not a left finger
    R4: 0, // Not a left finger
    R5: 0, // Not a left finger
    NONE: 0, // No finger
  },
  RIGHT: {
    R5: 1, // Pinky
    R4: 2, // Ring
    R3: 3, // Middle
    R2: 4, // Index
    R1: 5, // Thumb
    RB: 0, // Base - no direct finger mapping
    LB: 0, // Not a right finger
    L1: 0, // Not a right finger
    L2: 0, // Not a right finger
    L3: 0, // Not a right finger
    L4: 0, // Not a right finger
    L5: 0, // Not a right finger
    NONE: 0, // No finger
  },
};

const fingerStateVariants = cva(
  "",
  {
    variants: {
      fingerState: {
        IDLE: "fill-orange-50",
        ACTIVE: "fill-orange-400",
        INACTIVE: "fill-orange-50",
        INCORRECT: "fill-rose-700",
      } satisfies Record<FingerState, string>,
    },
    defaultVariants: {
      fingerState: "IDLE",
    },
  }
);

export type FlowHandProps = HandProps & {
  activeFingerId?: FingerId;
  fingerState?: FingerState;
};

const FlowHand = React.forwardRef<SVGSVGElement, FlowHandProps>(
  ({ className, side, activeFingerId, fingerState, ...props }, ref) => {
    const fingerIndexToHighlight = activeFingerId
      ? fingerIdToFingerIndex[side || 'RIGHT'][activeFingerId]
      : 0;

    const fingerClasses: string[] = [];
    if (fingerIndexToHighlight > 0) {
      fingerClasses.push(`[&_.finger-${fingerIndexToHighlight}]:${fingerStateVariants({ fingerState })}`);
    }

    return (
      <Hand
        ref={ref}
        className={cn(className, fingerClasses)}
        side={side}
        {...props}
      />
    );
  },
);
FlowHand.displayName = 'FlowHand';

export { FlowHand };

<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import FlowLine from './FlowLine.svelte';
  import { addAttempt, createTypingStream, enrichStreamSymbols } from '@/lib/typing-stream';
  import { getSymbolLayout } from '@/lib/layouts';

  const symbolLayoutQwerty = getSymbolLayout('qwerty');
  import { getKeyCapIdsForChar } from '@/lib/key-cap';
  import {
    FLOW_LINE_CURSOR_TYPES,
    KEY_CAP_PRESS_RESULTS,
  } from '@/interfaces/types';

  const fullStreamText = 'The Quick brown fox jumps over the lazy dog.';

  const baseStreamPending = createTypingStream({ drillText: fullStreamText, symbolLayout: symbolLayoutQwerty });

  // Stream with one error on position 4
  let streamWithOneError = createTypingStream({ drillText: fullStreamText, symbolLayout: symbolLayoutQwerty });
  for (let i = 0; i < streamWithOneError.length; i++) {
    const targetChar = streamWithOneError[i]!.targetSymbol;
    const correctKeys = getKeyCapIdsForChar({ char: targetChar, symbolLayout: symbolLayoutQwerty });
    if (i === 4) {
      const wrongKeys = getKeyCapIdsForChar({ char: 'w', symbolLayout: symbolLayoutQwerty });
      if (wrongKeys) {
        streamWithOneError = addAttempt({ stream: streamWithOneError, cursorPosition: i, pressedKeyCaps: wrongKeys, startAt: 0, endAt: 50 });
      }
    }
    if (correctKeys) {
      streamWithOneError = addAttempt({ stream: streamWithOneError, cursorPosition: i, pressedKeyCaps: correctKeys, startAt: 50, endAt: 100 });
    }
  }

  // Stream with multiple errors
  let streamWithMultipleErrors = createTypingStream({ drillText: fullStreamText, symbolLayout: symbolLayoutQwerty });
  for (let i = 0; i < streamWithMultipleErrors.length; i++) {
    const targetChar = streamWithMultipleErrors[i]!.targetSymbol;
    const correctKeys = getKeyCapIdsForChar({ char: targetChar, symbolLayout: symbolLayoutQwerty });
    if (i === 0) {
      const wrongKeys = getKeyCapIdsForChar({ char: 'w', symbolLayout: symbolLayoutQwerty });
      if (wrongKeys) streamWithMultipleErrors = addAttempt({ stream: streamWithMultipleErrors, cursorPosition: i, pressedKeyCaps: wrongKeys, startAt: 0, endAt: 50 });
    } else if (i === 1) {
      const wrongKeys1 = getKeyCapIdsForChar({ char: 'w', symbolLayout: symbolLayoutQwerty });
      const wrongKeys2 = getKeyCapIdsForChar({ char: 'e', symbolLayout: symbolLayoutQwerty });
      if (wrongKeys1) streamWithMultipleErrors = addAttempt({ stream: streamWithMultipleErrors, cursorPosition: i, pressedKeyCaps: wrongKeys1, startAt: 0, endAt: 50 });
      if (wrongKeys2) streamWithMultipleErrors = addAttempt({ stream: streamWithMultipleErrors, cursorPosition: i, pressedKeyCaps: wrongKeys2, startAt: 50, endAt: 100 });
    }
    if (correctKeys) {
      streamWithMultipleErrors = addAttempt({ stream: streamWithMultipleErrors, cursorPosition: i, pressedKeyCaps: correctKeys, startAt: 50, endAt: 100 });
    }
  }

  const baseSymbols = enrichStreamSymbols(baseStreamPending);
  const symbolsWithOneError = enrichStreamSymbols(streamWithOneError);
  const symbolsWithMultipleErrors = enrichStreamSymbols(streamWithMultipleErrors);

  const { Story } = defineMeta({
    title: 'UI/FlowLine',
    component: FlowLine,
    args: {
      symbols: baseSymbols,
      cursorPosition: 0,
      pressResult: 'NONE',
      cursorType: 'RECTANGLE',
      blink: true,
    },
    argTypes: {
      symbols: { table: { disable: true } },
      cursorPosition: { control: { type: 'number', min: 0 } },
      blink: { control: 'boolean' },
      cursorType: { options: FLOW_LINE_CURSOR_TYPES, control: 'inline-radio' },
      pressResult: { options: KEY_CAP_PRESS_RESULTS, control: 'inline-radio' },
    },
  });
</script>

<Story name="Default" />

<Story name="WithOneError" args={{ symbols: symbolsWithOneError, cursorPosition: 10 }} />

<Story name="WithMultipleErrors" args={{ symbols: symbolsWithMultipleErrors, cursorPosition: 10 }} />

<Story name="Completed" args={{ symbols: symbolsWithOneError, cursorPosition: 20 }} />

<Story name="CursorCorrect" args={{ pressResult: 'CORRECT' }} />

<Story name="CursorError" args={{ pressResult: 'ERROR' }} />

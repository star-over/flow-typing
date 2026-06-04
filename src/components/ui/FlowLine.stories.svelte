<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import FlowLine from './FlowLine.svelte';
  import { createTypingStream, addAttempt } from '@/lib/stream-utils';
  import { symbolLayoutEnQwerty } from '@/data/layouts/symbol-layout-en';
  import { getKeyCapIdsForChar } from '@/lib/symbol-utils';

  const fullStreamText = 'The Quick brown fox jumps over the lazy dog.';

  const baseStreamPending = createTypingStream(fullStreamText, symbolLayoutEnQwerty);

  // Stream with one error on position 4
  let streamWithOneError = createTypingStream(fullStreamText, symbolLayoutEnQwerty);
  for (let i = 0; i < streamWithOneError.length; i++) {
    const targetChar = streamWithOneError[i]!.targetSymbol;
    const correctKeys = getKeyCapIdsForChar(targetChar, symbolLayoutEnQwerty);
    if (i === 4) {
      const wrongKeys = getKeyCapIdsForChar('w', symbolLayoutEnQwerty);
      if (wrongKeys) {
        streamWithOneError = addAttempt({ stream: streamWithOneError, cursorPosition: i, pressedKeyCaps: wrongKeys, startAt: 0, endAt: 50 });
      }
    }
    if (correctKeys) {
      streamWithOneError = addAttempt({ stream: streamWithOneError, cursorPosition: i, pressedKeyCaps: correctKeys, startAt: 50, endAt: 100 });
    }
  }

  // Stream with multiple errors
  let streamWithMultipleErrors = createTypingStream(fullStreamText, symbolLayoutEnQwerty);
  for (let i = 0; i < streamWithMultipleErrors.length; i++) {
    const targetChar = streamWithMultipleErrors[i]!.targetSymbol;
    const correctKeys = getKeyCapIdsForChar(targetChar, symbolLayoutEnQwerty);
    if (i === 0) {
      const wrongKeys = getKeyCapIdsForChar('w', symbolLayoutEnQwerty);
      if (wrongKeys) streamWithMultipleErrors = addAttempt({ stream: streamWithMultipleErrors, cursorPosition: i, pressedKeyCaps: wrongKeys, startAt: 0, endAt: 50 });
    } else if (i === 1) {
      const wrongKeys1 = getKeyCapIdsForChar('w', symbolLayoutEnQwerty);
      const wrongKeys2 = getKeyCapIdsForChar('e', symbolLayoutEnQwerty);
      if (wrongKeys1) streamWithMultipleErrors = addAttempt({ stream: streamWithMultipleErrors, cursorPosition: i, pressedKeyCaps: wrongKeys1, startAt: 0, endAt: 50 });
      if (wrongKeys2) streamWithMultipleErrors = addAttempt({ stream: streamWithMultipleErrors, cursorPosition: i, pressedKeyCaps: wrongKeys2, startAt: 50, endAt: 100 });
    }
    if (correctKeys) {
      streamWithMultipleErrors = addAttempt({ stream: streamWithMultipleErrors, cursorPosition: i, pressedKeyCaps: correctKeys, startAt: 50, endAt: 100 });
    }
  }

  const { Story } = defineMeta({
    title: 'UI/FlowLine',
    component: FlowLine,
    args: {
      stream: baseStreamPending,
      cursorPosition: 0,
      pressResult: 'NONE',
      cursorType: 'RECTANGLE',
      cursorMode: 'HALF',
      size: 'MD',
      isTyping: false,
    },
  });
</script>

<Story name="Default" />

<Story name="WithOneError" args={{ stream: streamWithOneError, cursorPosition: 10 }} />

<Story name="WithMultipleErrors" args={{ stream: streamWithMultipleErrors, cursorPosition: 10 }} />

<Story name="Completed" args={{ stream: streamWithOneError, cursorPosition: 20 }} />

<Story name="SizeLarge" args={{ size: 'LG' }} />

<Story name="CursorCorrect" args={{ pressResult: 'CORRECT' }} />

<Story name="CursorError" args={{ pressResult: 'ERROR' }} />

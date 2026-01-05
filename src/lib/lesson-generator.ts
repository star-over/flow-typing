import { fingerLayoutASDF } from "@/data/finger-layout-asdf";
import { FingerId, KeyCapId, LEFT_HAND_FINGER_IDS, RIGHT_HAND_FINGER_IDS, StreamSymbol,TypingStream } from "@/interfaces/types";
import { getFingerByKeyCap, getKeyCapIdsForChar, modifierKeyCapIdSet } from "@/lib/symbol-utils";

export const lessons = [
  "the quick brown fox jumps over the lazy dog.",
  "never underestimate the power of a good book.",
  "the early bird catches the worm.",
  "technology has changed the way we live and work.",
  "to be or not to be, that is the question.",
];

const isLeftHand = (fingerId: FingerId) => (LEFT_HAND_FINGER_IDS as readonly FingerId[]).includes(fingerId);
const isRightHand = (fingerId: FingerId) => (RIGHT_HAND_FINGER_IDS as readonly FingerId[]).includes(fingerId);

type Hand = 'LEFT' | 'RIGHT' | 'NONE';

/**
 * Generates a lesson as an "enriched" TypingStream.
 * It picks a random lesson, then for each character, it pre-calculates the
 * `requiredKeyCapIds`, including special logic for the spacebar.
 * @returns A TypingStream for the lesson.
 */
export function generateLesson(): TypingStream {
  const randomIndex = Math.floor(Math.random() * lessons.length);
  const lessonText = lessons[randomIndex];

  let lastHandUsed: Hand = 'NONE';

  const stream: TypingStream = lessonText
    .split('')
    .reduce<TypingStream>((acc, char) => {
      let requiredKeyCapIds: KeyCapId[] | undefined;
      let currentHand: Hand = 'NONE';

      if (char === ' ') {
        // Spacebar logic
        if (lastHandUsed === 'LEFT') {
          requiredKeyCapIds = ['SpaceRight'];
        } else {
          // Default to left space if previous was right or none
          requiredKeyCapIds = ['SpaceLeft'];
        }
      } else {
        // Normal character logic
        requiredKeyCapIds = getKeyCapIdsForChar(char);
      }

      if (!requiredKeyCapIds) {
        console.warn(`Character "${char}" not found in symbol layout.`);
        return acc; // Skip characters not in the layout
      }

      // Determine the hand used for this character
      const primaryKey = requiredKeyCapIds.find(id => !modifierKeyCapIdSet.has(id));
      if (primaryKey) {
        const fingerId = getFingerByKeyCap(primaryKey, fingerLayoutASDF);
        if (fingerId) {
          if (isLeftHand(fingerId)) currentHand = 'LEFT';
          else if (isRightHand(fingerId)) currentHand = 'RIGHT';
        }
      }
      
      if (currentHand !== 'NONE') {
        lastHandUsed = currentHand;
      }

      acc.push({
        targetSymbol: char,
        requiredKeyCapIds,
        attempts: [],
      });
      
      return acc;
    }, []);

  return stream;
}

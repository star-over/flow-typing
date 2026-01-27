import type { Meta, StoryObj } from '@storybook/react';
import { LessonStatsDisplay } from './lesson-stats-display';
import { TypingStream, KeyCapId, Dictionary } from '@/interfaces/types';

const meta: Meta<typeof LessonStatsDisplay> = {
  title: 'UI/LessonStatsDisplay',
  component: LessonStatsDisplay,
  tags: ['autodocs'],
  argTypes: {
    stream: {
      control: {
        type: 'object'
      },
      description: 'The typing stream object representing the completed lesson.',
    },
    dictionary: {
      control: {
        type: 'object'
      },
      description: 'The dictionary object for i18n.',
    }
  },
};

export default meta;
type Story = StoryObj<typeof LessonStatsDisplay>;

const mockDictionary: Dictionary = {
  title: "Welcome to FlowTyping",
  app: {
    title: "FlowTyping",
    app_state: "App State",
    loading: "Loading...",
    start_training: "Start Training",
    settings: "Settings",
    stats: "Stats",
    lesson_complete: "Lesson Complete!",
    back_to_menu: "Back to Menu",
    stats_screen_title: "Stats Screen",
    error_title: "An Error Occurred",
    start_again: "Start Again",
    pause: "Pause",
    resume: "Resume",
    welcome: "Welcome to FlowTyping. Select an option to begin."
  },
  user_preferences: {
    title: "User Preferences",
    language_label: "Language",
    keyboard_layout_label: "Keyboard Layout",
    language_placeholder: "Select language",
    keyboard_layout_placeholder: "Select layout",
    back_button: "Back"
  },
  stats_card: {
    title: "Lesson Results",
    cpm: "Speed",
    wpm: "WPM",
    accuracy: "Accuracy",
    duration: "Duration"
  }
};

// Helper to create a simple stream for testing, copied from stats-calculator.test.ts
const createTestStream = (
  symbols: Array<{
    targetSymbol: string;
    targetKeyCaps: KeyCapId[];
    attempts: Array<{ startAt?: number; endAt?: number; pressedKeyCups: KeyCapId[] }>;
  }>,
): TypingStream => {
  return symbols.map((s) => ({
    targetSymbol: s.targetSymbol,
    targetKeyCaps: s.targetKeyCaps,
    attempts: s.attempts.map((a) => ({
      pressedKeyCups: a.pressedKeyCups,
      startAt: a.startAt,
      endAt: a.endAt,
    })),
  }));
};

// Mock Data for Stories

// Scenario 1: Good Performance
// Target: ~250 CPM, ~100% Accuracy
// 15 chars in 3.6s = 4.16 char/s * 60 = 250 CPM
const goodPerformanceStream = createTestStream([
  { targetSymbol: 'q', targetKeyCaps: ['KeyQ'], attempts: [{ startAt: 1000, endAt: 1240, pressedKeyCups: ['KeyQ'] }] },
  { targetSymbol: 'u', targetKeyCaps: ['KeyU'], attempts: [{ startAt: 1240, endAt: 1480, pressedKeyCups: ['KeyU'] }] },
  { targetSymbol: 'i', targetKeyCaps: ['KeyI'], attempts: [{ startAt: 1480, endAt: 1720, pressedKeyCups: ['KeyI'] }] },
  { targetSymbol: 'c', targetKeyCaps: ['KeyC'], attempts: [{ startAt: 1720, endAt: 1960, pressedKeyCups: ['KeyC'] }] },
  { targetSymbol: 'k', targetKeyCaps: ['KeyK'], attempts: [{ startAt: 1960, endAt: 2200, pressedKeyCups: ['KeyK'] }] },
  { targetSymbol: ' ', targetKeyCaps: ['Space'], attempts: [{ startAt: 2200, endAt: 2440, pressedKeyCups: ['Space'] }] },
  { targetSymbol: 'b', targetKeyCaps: ['KeyB'], attempts: [{ startAt: 2440, endAt: 2680, pressedKeyCups: ['KeyB'] }] },
  { targetSymbol: 'r', targetKeyCaps: ['KeyR'], attempts: [{ startAt: 2680, endAt: 2920, pressedKeyCups: ['KeyR'] }] },
  { targetSymbol: 'o', targetKeyCaps: ['KeyO'], attempts: [{ startAt: 2920, endAt: 3160, pressedKeyCups: ['KeyO'] }] },
  { targetSymbol: 'w', targetKeyCaps: ['KeyW'], attempts: [{ startAt: 3160, endAt: 3400, pressedKeyCups: ['KeyW'] }] },
  { targetSymbol: 'n', targetKeyCaps: ['KeyN'], attempts: [{ startAt: 3400, endAt: 3640, pressedKeyCups: ['KeyN'] }] },
  { targetSymbol: ' ', targetKeyCaps: ['Space'], attempts: [{ startAt: 3640, endAt: 3880, pressedKeyCups: ['Space'] }] },
  { targetSymbol: 'f', targetKeyCaps: ['KeyF'], attempts: [{ startAt: 3880, endAt: 4120, pressedKeyCups: ['KeyF'] }] },
  { targetSymbol: 'o', targetKeyCaps: ['KeyO'], attempts: [{ startAt: 4120, endAt: 4360, pressedKeyCups: ['KeyO'] }] },
  { targetSymbol: 'x', targetKeyCaps: ['KeyX'], attempts: [{ startAt: 4360, endAt: 4600, pressedKeyCups: ['KeyX'] }] },
]);

// Scenario 2: Average Performance with errors
// Target: ~150 CPM, ~83% Accuracy
// 10 chars, 12 attempts, in 4s = 2.5 char/s * 60 = 150 CPM
const averagePerformanceStream = createTestStream([
    { targetSymbol: 't', targetKeyCaps: ['KeyT'], attempts: [{ startAt: 5000, endAt: 5250, pressedKeyCups: ['KeyT'] }] },
    { targetSymbol: 'h', targetKeyCaps: ['KeyH'], attempts: [{ startAt: 5250, endAt: 5500, pressedKeyCups: ['KeyH'] }] },
    { targetSymbol: 'e', targetKeyCaps: ['KeyE'], attempts: [
        { startAt: 5500, endAt: 5800, pressedKeyCups: ['KeyR'] }, // Error
        { startAt: 5850, endAt: 6100, pressedKeyCups: ['KeyE'] }
    ]},
    { targetSymbol: ' ', targetKeyCaps: ['Space'], attempts: [{ startAt: 6100, endAt: 6350, pressedKeyCups: ['Space'] }] },
    { targetSymbol: 'c', targetKeyCaps: ['KeyC'], attempts: [{ startAt: 6350, endAt: 6600, pressedKeyCups: ['KeyC'] }] },
    { targetSymbol: 'a', targetKeyCaps: ['KeyA'], attempts: [{ startAt: 6600, endAt: 6850, pressedKeyCups: ['KeyA'] }] },
    { targetSymbol: 't', targetKeyCaps: ['KeyT'], attempts: [
        { startAt: 6850, endAt: 7100, pressedKeyCups: ['KeyG'] }, // Error
        { startAt: 7150, endAt: 7500, pressedKeyCups: ['KeyT'] }
    ]},
    { targetSymbol: ' ', targetKeyCaps: ['Space'], attempts: [{ startAt: 7500, endAt: 7800, pressedKeyCups: ['Space'] }] },
    { targetSymbol: 'r', targetKeyCaps: ['KeyR'], attempts: [{ startAt: 7800, endAt: 8300, pressedKeyCups: ['KeyR'] }] },
    { targetSymbol: 'n', targetKeyCaps: ['KeyN'], attempts: [{ startAt: 8300, endAt: 9000, pressedKeyCups: ['KeyN'] }] },
]);


export const GoodPerformance: Story = {
  args: {
    stream: goodPerformanceStream,
    dictionary: mockDictionary,
  },
};

export const AveragePerformance: Story = {
  args: {
    stream: averagePerformanceStream,
    dictionary: mockDictionary,
  },
};

export const EmptyStream: Story = {
  args: {
    stream: [],
    dictionary: mockDictionary,
  },
};

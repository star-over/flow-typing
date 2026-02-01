import React from 'react';
import { Dictionary, TypingStream } from '@/interfaces/types';
import { calculateLessonStats } from '@/lib/stats-calculator';

interface LessonStatsDisplayProps {
  stream: TypingStream;
  dictionary: Dictionary;
}

const StatItem = ({ label, value, unit }: { label: string; value: string | number; unit?: string }) => (
  <div className="flex flex-col items-center justify-center p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
    <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
      {value}
      {unit && <span className="text-lg font-medium text-slate-600 dark:text-slate-300 ml-1">{unit}</span>}
    </p>
  </div>
);

export const LessonStatsDisplay: React.FC<LessonStatsDisplayProps> = ({ stream, dictionary }) => {
  // Do not render anything if the stream is empty or not yet populated
  if (!stream || stream.length === 0 || stream.every((s) => s.attempts.length === 0)) {
    return null;
  }

  const stats = calculateLessonStats(stream);
  const { stats_card } = dictionary;

  return (
    <div className="w-full max-w-2xl mx-auto p-4 bg-white dark:bg-slate-900 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{stats_card.title}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatItem label={stats_card.cpm} value={stats.cpm} unit={stats_card.units.cpm} />
        <StatItem label={stats_card.wpm} value={stats.wpm} unit={stats_card.units.wpm} />
        <StatItem label={stats_card.accuracy} value={stats.accuracy} unit={stats_card.units.accuracy} />
        <StatItem label={stats_card.duration} value={stats.durationInSeconds} unit={stats_card.units.duration} />
      </div>
    </div>
  );
};

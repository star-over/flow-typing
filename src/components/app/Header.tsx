import React from 'react';

interface HeaderProps {
  title: string;
  appStateLabel: string;
  appStateValue: string;
}

export const Header: React.FC<HeaderProps> = ({ title, appStateLabel, appStateValue }) => {
  return (
    <header className="flex flex-col items-center text-center">
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="text-lg">
        {appStateLabel}: <code className="font-mono bg-gray-200 dark:bg-gray-800 p-1 rounded">{appStateValue}</code>
      </p>
    </header>
  );
};

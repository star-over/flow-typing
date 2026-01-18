// src/components/ui/user-preferences-page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useUserPreferencesStore } from '@/store/user-preferences.store';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPreferences } from '@/interfaces/user-preferences';
import { Dictionary } from '@/interfaces/types';

interface UserPreferencesPageProps {
  onBack: () => void;
  dictionary: Dictionary['user_preferences'];
}

export function UserPreferencesPage({ onBack, dictionary }: UserPreferencesPageProps) {
  const { language, keyboardLayout, updateUserPreferences } = useUserPreferencesStore();
  const router = useRouter();

  const handleLanguageChange = (value: UserPreferences['language']) => {
    updateUserPreferences({ language: value });
    router.refresh();
  };

  const handleKeyboardLayoutChange = (value: UserPreferences['keyboardLayout']) => {
    updateUserPreferences({ keyboardLayout: value });
  };

  return (
    <div className="container mx-auto p-4 max-w-md">
      <h1 className="text-3xl font-bold mb-6">{dictionary.title}</h1>

      <div className="mb-4">
        <label htmlFor="language-select" className="block text-sm font-medium text-gray-700 mb-1">
          {dictionary.language_label}
        </label>
        <Select
          value={language}
          onValueChange={handleLanguageChange}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={dictionary.language_placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="ru">Русский</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mb-4">
        <label htmlFor="keyboard-layout-select" className="block text-sm font-medium text-gray-700 mb-1">
          {dictionary.keyboard_layout_label}
        </label>
        <Select
          value={keyboardLayout}
          onValueChange={handleKeyboardLayoutChange}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={dictionary.keyboard_layout_placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="qwerty">QWERTY (English)</SelectItem>
            <SelectItem value="йцукен">ЙЦУКЕН (Русский)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <button onClick={onBack} className="p-2 mt-4 bg-red-500 text-white rounded">
        {dictionary.back_button}
      </button>
    </div>
  );
}

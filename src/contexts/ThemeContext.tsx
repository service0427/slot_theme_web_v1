import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { simpleTheme } from '@/themes/simple';
import { luxuryTheme } from '@/themes/luxury';
import { modernTheme } from '@/themes/modern';
import { Theme } from '@/themes/types';

type ThemeType = 'simple' | 'modern' | 'luxury';

interface ThemeContextType {
  currentTheme: ThemeType;
  theme: Theme;
  setTheme: (themeName: ThemeType) => void;
  availableThemes: Array<{
    key: ThemeType;
    name: string;
    description: string;
    preview?: string;
  }>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const themes: Record<ThemeType, Theme> = {
  simple: simpleTheme,
  modern: modernTheme,
  luxury: luxuryTheme,
};

const availableThemes = [
  {
    key: 'simple' as ThemeType,
    name: '심플 테마',
    description: '깔끔하고 심플한 디자인',
    preview: 'bg-gradient-to-br from-white to-gray-100'
  },
  {
    key: 'modern' as ThemeType,
    name: '모던 테마', 
    description: '현대적이고 트렌디한 중간 단계',
    preview: 'bg-gradient-to-br from-violet-100 to-indigo-200'
  },
  {
    key: 'luxury' as ThemeType,
    name: '럭셔리 테마',
    description: '고급스럽고 화려한 비즈니스',
    preview: 'bg-gradient-to-br from-slate-800 to-blue-900'
  }
];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<ThemeType>(() => {
    // 로컬 스토리지에서 저장된 테마 불러오기
    const saved = localStorage.getItem('selectedTheme');
    return (saved as ThemeType) || 'simple';
  });

  const setTheme = (themeName: ThemeType) => {
    setCurrentTheme(themeName);
    localStorage.setItem('selectedTheme', themeName);
  };

  const theme = themes[currentTheme];

  const value: ThemeContextType = {
    currentTheme,
    theme,
    setTheme,
    availableThemes,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
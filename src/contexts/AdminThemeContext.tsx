import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { simpleTheme } from '@/themes/simple';
import { luxuryTheme } from '@/themes/luxury';
import { modernTheme } from '@/themes/modern';
import { Theme } from '@/themes/types';
import { useAuthContext } from '@/adapters/react';
import { LayoutConfig } from '@/components/base/BaseMainLayout';
import { simpleLayoutPresets } from '@/themes/simple/styles/layoutStyles';
import { modernLayoutPresets } from '@/themes/modern/styles/layoutStyles';
import { luxuryLayoutPresets } from '@/themes/luxury/styles/layoutStyles';

type ThemeType = 'simple' | 'modern' | 'luxury';
type LayoutPreset = 'classic' | 'modern' | 'minimal' | 'dashboard';

interface AdminThemeContextType {
  currentTheme: ThemeType;
  theme: Theme;
  setGlobalTheme: (themeName: ThemeType) => void;
  currentLayout: LayoutPreset;
  setGlobalLayout: (layout: LayoutPreset) => void;
  getLayoutConfig: () => LayoutConfig;
  availableThemes: Array<{
    key: ThemeType;
    name: string;
    description: string;
    preview?: string;
  }>;
  availableLayouts: Array<{
    key: LayoutPreset;
    name: string;
    description: string;
    preview?: string;
  }>;
  isAdmin: boolean;
  previewTheme: ThemeType | null;
  setPreviewTheme: (themeName: ThemeType | null) => void;
  previewLayout: LayoutPreset | null;
  setPreviewLayout: (layout: LayoutPreset | null) => void;
  isPreviewMode: boolean;
}

const AdminThemeContext = createContext<AdminThemeContextType | undefined>(undefined);

const themes: Record<ThemeType, Theme> = {
  simple: simpleTheme,
  modern: modernTheme,
  luxury: luxuryTheme,
};

const layoutPresets: Record<ThemeType, Record<LayoutPreset, LayoutConfig>> = {
  simple: simpleLayoutPresets,
  modern: modernLayoutPresets,
  luxury: luxuryLayoutPresets,
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

const availableLayouts = [
  {
    key: 'classic' as LayoutPreset,
    name: '클래식 레이아웃',
    description: '왼쪽 사이드바 + 기본 헤더',
    preview: 'bg-gradient-to-r from-blue-500 to-blue-600'
  },
  {
    key: 'modern' as LayoutPreset,
    name: '모던 레이아웃',
    description: '상단 네비게이션 + 카드형 콘텐츠',
    preview: 'bg-gradient-to-r from-purple-500 to-purple-600'
  },
  {
    key: 'minimal' as LayoutPreset,
    name: '미니멀 레이아웃',
    description: '사이드바 숨김 + 풀스크린',
    preview: 'bg-gradient-to-r from-gray-400 to-gray-500'
  },
  {
    key: 'dashboard' as LayoutPreset,
    name: '대시보드 레이아웃',
    description: '오른쪽 사이드바 + 넓은 콘텐츠',
    preview: 'bg-gradient-to-r from-amber-500 to-amber-600'
  }
];

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();
  const location = useLocation();
  const isAdmin = user?.role === 'operator';
  
  const [currentTheme, setCurrentTheme] = useState<ThemeType>(() => {
    // 관리자가 설정한 전역 테마만 사용
    const globalTheme = localStorage.getItem('globalTheme');
    return (globalTheme as ThemeType) || 'simple';
  });
  
  const [currentLayout, setCurrentLayout] = useState<LayoutPreset>(() => {
    const globalLayout = localStorage.getItem('globalLayout');
    // 초기화 시점에는 globalLayout 우선 사용
    return (globalLayout as LayoutPreset) || 'classic';
  });
  
  const [previewTheme, setPreviewTheme] = useState<ThemeType | null>(null);
  const [previewLayout, setPreviewLayout] = useState<LayoutPreset | null>(null);
  const isPreviewMode = (previewTheme !== null || previewLayout !== null) && isAdmin;

  // 전역 테마 설정 (관리자만 가능)
  const setGlobalTheme = (themeName: ThemeType) => {
    if (!isAdmin) return;
    
    localStorage.setItem('globalTheme', themeName);
    setCurrentTheme(themeName);
    
    // 전역 테마 변경 이벤트 발생
    window.dispatchEvent(new CustomEvent('globalThemeChange', { 
      detail: { theme: themeName } 
    }));
  };

  // 전역 레이아웃 설정 (관리자만 가능)
  const setGlobalLayout = (layout: LayoutPreset) => {
    if (!isAdmin) return;
    
    localStorage.setItem('globalLayout', layout);
    setCurrentLayout(layout);
    
    // 전역 레이아웃 변경 이벤트 발생
    window.dispatchEvent(new CustomEvent('globalLayoutChange', { 
      detail: { layout } 
    }));
  };

  // user 정보 로드 후 전역 테마 다시 로드
  useEffect(() => {
    const globalTheme = localStorage.getItem('globalTheme');
    const globalLayout = localStorage.getItem('globalLayout');
    
    if (globalTheme) {
      setCurrentTheme(globalTheme as ThemeType);
    }
    if (globalLayout) {
      setCurrentLayout(globalLayout as LayoutPreset);
    }
  }, [user]);

  // 전역 테마 및 레이아웃 변경 이벤트 리스너
  useEffect(() => {
    const handleGlobalThemeChange = (event: CustomEvent) => {
      if (!isAdmin) {
        setCurrentTheme(event.detail.theme);
      }
    };
    
    const handleGlobalLayoutChange = (event: CustomEvent) => {
      if (!isAdmin) {
        setCurrentLayout(event.detail.layout);
      }
    };

    window.addEventListener('globalThemeChange', handleGlobalThemeChange as EventListener);
    window.addEventListener('globalLayoutChange', handleGlobalLayoutChange as EventListener);
    
    return () => {
      window.removeEventListener('globalThemeChange', handleGlobalThemeChange as EventListener);
      window.removeEventListener('globalLayoutChange', handleGlobalLayoutChange as EventListener);
    };
  }, [isAdmin]);

  // 전역 테마 로드 및 미리보기 상태 관리
  useEffect(() => {
    if (!isAdmin) {
      // 일반 사용자거나 로그아웃한 경우 미리보기 상태 초기화
      setPreviewTheme(null);
      setPreviewLayout(null);
      
      const globalTheme = localStorage.getItem('globalTheme');
      const globalLayout = localStorage.getItem('globalLayout');
      if (globalTheme) {
        setCurrentTheme(globalTheme as ThemeType);
      }
      if (globalLayout) {
        setCurrentLayout(globalLayout as LayoutPreset);
      }
    }
  }, [isAdmin]);

  // 페이지 이동 시 최신 설정 확인 (일반 사용자만)
  useEffect(() => {
    if (!isAdmin) {
      const latestTheme = localStorage.getItem('globalTheme');
      const latestLayout = localStorage.getItem('globalLayout');
      
      if (latestTheme && latestTheme !== currentTheme) {
        setCurrentTheme(latestTheme as ThemeType);
      }
      if (latestLayout && latestLayout !== currentLayout) {
        setCurrentLayout(latestLayout as LayoutPreset);
      }
    }
  }, [location.pathname, isAdmin]);

  // 관리자인 경우에만 미리보기 적용, 일반 사용자는 항상 전역 설정 사용
  const activeTheme = (isAdmin && previewTheme) ? previewTheme : currentTheme;
  const activeLayout = (isAdmin && previewLayout) ? previewLayout : currentLayout;
  const theme = themes[activeTheme];
  

  // 현재 테마에 맞는 레이아웃 설정 가져오기
  const getLayoutConfig = (): LayoutConfig => {
    const config = layoutPresets[activeTheme][activeLayout];
    return config;
  };

  const value: AdminThemeContextType = {
    currentTheme: activeTheme, // activeTheme을 currentTheme으로 전달
    theme,
    setGlobalTheme,
    currentLayout: activeLayout, // activeLayout을 currentLayout으로 전달
    setGlobalLayout,
    getLayoutConfig,
    availableThemes,
    availableLayouts,
    isAdmin,
    previewTheme,
    setPreviewTheme,
    previewLayout,
    setPreviewLayout,
    isPreviewMode,
  };

  return (
    <AdminThemeContext.Provider value={value}>
      {children}
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme(): AdminThemeContextType {
  const context = useContext(AdminThemeContext);
  if (context === undefined) {
    throw new Error('useAdminTheme must be used within a AdminThemeProvider');
  }
  return context;
}
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { systemSettingsService, SystemSettingsResponse } from '@/adapters/services/ApiSystemSettingsService';
import { useAuthContext } from '@/adapters/react';
import { simpleTheme } from '@/themes/simple';
import { luxuryTheme } from '@/themes/luxury';
import { modernTheme } from '@/themes/modern';
import { Theme } from '@/themes/types';
import { LayoutConfig } from '@/components/base/BaseMainLayout';
import { simpleLayoutPresets } from '@/themes/simple/styles/layoutStyles';
import { modernLayoutPresets } from '@/themes/modern/styles/layoutStyles';
import { luxuryLayoutPresets } from '@/themes/luxury/styles/layoutStyles';

type ThemeType = 'simple' | 'modern' | 'luxury';
type LayoutPreset = 'classic' | 'modern' | 'minimal' | 'dashboard';

interface SystemSettingsContextType {
  // 설정 데이터
  settings: SystemSettingsResponse;
  isLoading: boolean;
  error: string | null;
  
  // 테마 관련
  currentTheme: ThemeType;
  theme: Theme;
  setGlobalTheme: (themeName: ThemeType) => Promise<void>;
  
  // 레이아웃 관련
  currentLayout: LayoutPreset;
  setGlobalLayout: (layout: LayoutPreset) => Promise<void>;
  getLayoutConfig: () => LayoutConfig;
  
  // 미리보기 (관리자용)
  previewTheme: ThemeType | null;
  setPreviewTheme: (themeName: ThemeType | null) => void;
  previewLayout: LayoutPreset | null;
  setPreviewLayout: (layout: LayoutPreset | null) => void;
  isPreviewMode: boolean;
  
  // 설정 관리
  getSetting: (key: string, category?: string) => any;
  updateSetting: (key: string, value: any, category: string) => Promise<void>;
  updateMultipleSettings: (settings: Array<{ key: string; value: any; category: string }>) => Promise<void>;
  refreshSettings: () => Promise<void>;
  
  // 사용 가능한 옵션들
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
  
  // 권한
  isAdmin: boolean;
  
  // 사이트 정보
  companyName: string;
  siteTitle: string;
}

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined);

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

export function SystemSettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();
  const location = useLocation();
  const isAdmin = user?.role === 'operator';
  
  const [settings, setSettings] = useState<SystemSettingsResponse>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 테마와 레이아웃 상태
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('simple');
  const [currentLayout, setCurrentLayout] = useState<LayoutPreset>('classic');
  
  // 미리보기 상태 (관리자용)
  const [previewTheme, setPreviewTheme] = useState<ThemeType | null>(null);
  const [previewLayout, setPreviewLayout] = useState<LayoutPreset | null>(null);
  
  // 설정 로드
  const loadSettings = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await systemSettingsService.getAllSettings(forceRefresh);
      setSettings(data);
      
      // 테마와 레이아웃 설정 적용
      if (data.theme?.globalTheme) {
        setCurrentTheme(data.theme.globalTheme);
      }
      if (data.theme?.globalLayout) {
        setCurrentLayout(data.theme.globalLayout);
      }
      
      // 사이트 타이틀 업데이트
      if (data.business?.siteTitle) {
        document.title = data.business.siteTitle;
      }
    } catch (err) {
      console.error('Failed to load system settings:', err);
      setError('설정을 불러오는데 실패했습니다.');
      
      // 오류 시 기본값 사용
      setCurrentTheme('simple');
      setCurrentLayout('classic');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 앱 시작 시 설정 로드
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // 페이지 이동 시 최신 설정 확인
  useEffect(() => {
    // 페이지 이동할 때마다 서버에서 최신 설정 가져오기 (캐시 무시)
    const checkForUpdates = async () => {
      try {
        // forceRefresh=true로 캐시를 무시하고 최신 데이터 가져오기
        const latestSettings = await systemSettingsService.getAllSettings(true);
        
        // 테마가 변경되었는지 확인
        if (latestSettings.theme?.globalTheme && latestSettings.theme.globalTheme !== currentTheme) {
          setCurrentTheme(latestSettings.theme.globalTheme);
        }
        
        // 레이아웃이 변경되었는지 확인
        if (latestSettings.theme?.globalLayout && latestSettings.theme.globalLayout !== currentLayout) {
          setCurrentLayout(latestSettings.theme.globalLayout);
        }
        
        // 전체 설정 업데이트
        setSettings(latestSettings);
        
        // 사이트 타이틀 업데이트
        if (latestSettings.business?.siteTitle) {
          document.title = latestSettings.business.siteTitle;
        }
      } catch (err) {
        console.error('Failed to check for settings updates:', err);
      }
    };
    
    checkForUpdates();
  }, [location.pathname]);

  // 시스템 설정 변경 이벤트 리스너
  useEffect(() => {
    const handleSettingsChange = async (event: CustomEvent) => {
      // 설정이 변경된 경우 즉시 새로고침 (관리자 포함)
      await loadSettings(true); // 캐시 무시하고 강제 새로고침
    };

    window.addEventListener('systemSettingsChanged', handleSettingsChange as EventListener);
    
    return () => {
      window.removeEventListener('systemSettingsChanged', handleSettingsChange as EventListener);
    };
  }, [isAdmin, loadSettings]);

  // 전역 테마 설정 (관리자만)
  const setGlobalTheme = async (themeName: ThemeType) => {
    if (!isAdmin) return;
    
    try {
      await systemSettingsService.updateSetting('globalTheme', themeName, 'theme');
      // API가 성공하면 systemSettingsChanged 이벤트가 발생해서 자동으로 loadSettings가 호출됨
    } catch (err) {
      console.error('Failed to update theme:', err);
      throw err;
    }
  };

  // 전역 레이아웃 설정 (관리자만)
  const setGlobalLayout = async (layout: LayoutPreset) => {
    if (!isAdmin) return;
    
    try {
      await systemSettingsService.updateSetting('globalLayout', layout, 'theme');
      // API가 성공하면 systemSettingsChanged 이벤트가 발생해서 자동으로 loadSettings가 호출됨
    } catch (err) {
      console.error('Failed to update layout:', err);
      throw err;
    }
  };

  // 설정 값 가져오기
  const getSetting = (key: string, category?: string): any => {
    if (category && settings[category as keyof SystemSettingsResponse]) {
      const result = settings[category as keyof SystemSettingsResponse]![key];
      return result;
    }
    
    // 카테고리가 없으면 모든 카테고리에서 검색
    for (const cat of Object.keys(settings)) {
      const categorySettings = settings[cat as keyof SystemSettingsResponse];
      if (categorySettings && key in categorySettings) {
        return categorySettings[key];
      }
    }

    return undefined;
  };

  // 단일 설정 업데이트
  const updateSetting = async (key: string, value: any, category: string) => {
    if (!isAdmin) {
      throw new Error('Only administrators can update settings');
    }
    
    await systemSettingsService.updateSetting(key, value, category);
    await loadSettings();
  };

  // 여러 설정 업데이트
  const updateMultipleSettings = async (settingsToUpdate: Array<{ key: string; value: any; category: string }>) => {
    if (!isAdmin) {
      throw new Error('Only administrators can update settings');
    }
    
    await systemSettingsService.updateSettings(settingsToUpdate);
    // API가 성공하면 systemSettingsChanged 이벤트가 발생해서 자동으로 loadSettings가 호출됨
  };

  // 설정 새로고침
  const refreshSettings = async () => {
    await loadSettings();
  };

  // 미리보기 모드 확인
  const isPreviewMode = (previewTheme !== null || previewLayout !== null) && isAdmin;
  
  // 실제 적용될 테마와 레이아웃
  const activeTheme = (isAdmin && previewTheme) ? previewTheme : currentTheme;
  const activeLayout = (isAdmin && previewLayout) ? previewLayout : currentLayout;
  const theme = themes[activeTheme];

  // 현재 테마에 맞는 레이아웃 설정 가져오기
  const getLayoutConfig = (): LayoutConfig => {
    return layoutPresets[activeTheme][activeLayout];
  };

  const value: SystemSettingsContextType = {
    // 설정 데이터
    settings,
    isLoading,
    error,
    
    // 테마 관련
    currentTheme: activeTheme,
    theme,
    setGlobalTheme,
    
    // 레이아웃 관련
    currentLayout: activeLayout,
    setGlobalLayout,
    getLayoutConfig,
    
    // 미리보기
    previewTheme,
    setPreviewTheme,
    previewLayout,
    setPreviewLayout,
    isPreviewMode,
    
    // 설정 관리
    getSetting,
    updateSetting,
    updateMultipleSettings,
    refreshSettings,
    
    // 사용 가능한 옵션들
    availableThemes,
    availableLayouts,
    
    // 권한
    isAdmin,
    
    // 사이트 정보
    companyName: settings.business?.companyName || '마케팅의정석',
    siteTitle: settings.business?.siteTitle || 'Simple Slot - 유연한 디자인 시스템',
  };

  return (
    <SystemSettingsContext.Provider value={value}>
      {children}
    </SystemSettingsContext.Provider>
  );
}

export function useSystemSettings(): SystemSettingsContextType {
  const context = useContext(SystemSettingsContext);
  if (context === undefined) {
    throw new Error('useSystemSettings must be used within a SystemSettingsProvider');
  }
  return context;
}
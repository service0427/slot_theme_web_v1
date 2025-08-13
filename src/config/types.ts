export interface SiteConfig {
  // 기본 정보
  siteName: string;
  theme: 'simple' | 'luxury' | 'gaming' | 'corporate';
  
  // UI 동작 설정
  cashChargeMode: 'modal' | 'page';
  cashHistoryLocation: 'sidebar' | 'page' | 'balance-click';
  
  // 기능 ON/OFF
  features: {
    cashHistory: boolean;
    ranking: boolean;
    slotManagement: boolean;
  };
  
  // 메뉴 설정
  menus: {
    user: MenuItem[];
    admin: MenuItem[];
  };
}

export interface MenuItem {
  id: string;
  label: string;
  path?: string;
  icon?: string;
  action?: string;
  visible: boolean;
}

export interface ConfigContextType {
  config: SiteConfig;
  updateConfig: (newConfig: Partial<SiteConfig>) => void;
  isFeatureEnabled: (feature: keyof SiteConfig['features']) => boolean;
}
import { createContext, useContext, ReactNode } from 'react';
import { loadChatConfig } from '@/config/chatConfig';

export interface MenuItem {
  id: string;
  label: string;
  path?: string;
  icon?: string;
  visible: boolean;
  children?: MenuItem[];
}

export interface SlotField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'url' | 'email' | 'number';
  enabled: boolean;
  required: boolean;
  placeholder?: string;
  order: number;
}

export interface SiteConfig {
  siteName: string;
  siteUrl: string;
  cashChargeMode: 'modal' | 'page';
  useCashSystem: boolean;
  defaultSlotPrice: number;
  features: {
    analytics: boolean;
    websocket: boolean;
    debug: boolean;
  };
  menus: {
    user: MenuItem[];
    admin: MenuItem[];
  };
  slotFields: SlotField[];
}

const defaultConfig: SiteConfig = {
  siteName: import.meta.env.VITE_SITE_NAME || '마케팅의정석',
  siteUrl: import.meta.env.VITE_SITE_URL || 'http://localhost:5173',
  cashChargeMode: (import.meta.env.VITE_CASH_CHARGE_MODE as 'modal' | 'page') || 'modal',
  useCashSystem: import.meta.env.VITE_USE_CASH_SYSTEM === 'true',
  defaultSlotPrice: parseInt(import.meta.env.VITE_DEFAULT_SLOT_PRICE) || 50000,
  features: {
    analytics: false,
    websocket: false,
    debug: false,
  },
  menus: {
    user: [
      { id: 'slots', label: '광고 슬롯', path: '/slots', visible: true },
      { id: 'cash-history', label: '캐시 내역', path: '/cash-history', visible: true },
      { id: 'profile', label: '내 정보', path: '/profile', visible: true },
      { id: 'announcements', label: '공지사항', path: '/announcements', visible: true },
    ],
    admin: [
      { id: 'admin-dashboard', label: '관리자 대시보드', path: '/admin', visible: true },
      { id: 'slot-approve', label: '슬롯 승인', path: '/admin/slots', visible: true },
      { id: 'cash-approve', label: '캐시 승인', path: '/admin/cash', visible: true },
      { id: 'user-manage', label: '사용자 관리', path: '/admin/users', visible: true },
      { id: 'chat-manage', label: '채팅 관리', path: '/admin/chat', visible: loadChatConfig().enabled },
      { id: 'system-settings', label: '시스템 설정', path: '/admin/settings', visible: true },
      { id: 'admin-notifications', label: '알림 발송', path: '/admin/notifications', visible: true },
      { id: 'admin-notification-history', label: '알림 내역', path: '/admin/notification-history', visible: true },
      { id: 'admin-announcements', label: '공지사항 관리', path: '/admin/announcements', visible: true },
    ],
  },
  slotFields: [
    // 기본적으로 비활성화 - API에서 가져온 필드만 사용하도록
    { id: 'keywords', label: '키워드', type: 'text', enabled: false, required: false, placeholder: '키워드', order: 1 },
    { id: 'landingUrl', label: '랜딩 URL', type: 'url', enabled: false, required: false, placeholder: 'https://example.com', order: 2 },
    { id: 'mid', label: 'MID', type: 'text', enabled: false, required: false, placeholder: 'MID-123456', order: 3 },
  ],
};

const ConfigContext = createContext<{
  config: SiteConfig;
  updateConfig: (updates: Partial<SiteConfig>) => void;
  isFeatureEnabled: (feature: keyof SiteConfig['features']) => boolean;
}>({
  config: defaultConfig,
  updateConfig: () => {},
  isFeatureEnabled: () => false,
});

interface ConfigProviderProps {
  children: ReactNode;
  initialConfig?: Partial<SiteConfig>;
}

export function ConfigProvider({ children, initialConfig }: ConfigProviderProps) {
  const baseConfig = { ...defaultConfig, ...initialConfig };
  
  // 캐시 시스템 OFF일 때 메뉴 조정
  const config: SiteConfig = {
    ...baseConfig,
    menus: {
      user: baseConfig.menus.user.filter(menu => {
        // 캐시 시스템 OFF일 때 캐시 내역 숨김
        if (menu.id === 'cash-history' && !baseConfig.useCashSystem) {
          return false;
        }
        return menu.visible;
      }),
      admin: baseConfig.menus.admin.filter(menu => {
        // 캐시 시스템 OFF일 때 캐시 승인 숨김
        if (menu.id === 'cash-approve' && !baseConfig.useCashSystem) {
          return false;
        }
        return menu.visible;
      }),
    }
  };

  const updateConfig = (updates: Partial<SiteConfig>) => {
    // 실제 구현에서는 상태 업데이트 로직 추가
  };

  const isFeatureEnabled = (feature: keyof SiteConfig['features']) => {
    return config.features[feature];
  };

  return (
    <ConfigContext.Provider value={{ config, updateConfig, isFeatureEnabled }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within ConfigProvider');
  }
  return context;
}
import { createContext, useContext, ReactNode, useMemo } from 'react';
import { useSystemSettings } from './SystemSettingsContext';
import { useAuthContext } from '@/adapters/react/hooks/useAuthContext';

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
    cashHistory: boolean;
    ranking: boolean;
    slotManagement: boolean;
    chatEnabled: boolean;
  };
  menus: {
    user: MenuItem[];
    admin: MenuItem[];
  };
  slotFields: SlotField[];
  // 비즈니스 설정
  minCashCharge: number;
  maxCashCharge: number;
  maxSlotsPerUser: number;
  slotAutoApproval: boolean;
  cashAutoApproval: boolean;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  // 알림 설정
  notificationEnabled: boolean;
  notificationSound: boolean;
  notificationAutoRead: boolean;
  notificationDuration: number;
}

const EnhancedConfigContext = createContext<{
  config: SiteConfig;
  isFeatureEnabled: (feature: keyof SiteConfig['features']) => boolean;
  isLoading: boolean;
}>({
  config: {} as SiteConfig,
  isFeatureEnabled: () => false,
  isLoading: true,
});

interface EnhancedConfigProviderProps {
  children: ReactNode;
}

export function EnhancedConfigProvider({ children }: EnhancedConfigProviderProps) {
  const { getSetting, settings, isLoading } = useSystemSettings();
  const { user } = useAuthContext();
  
  // SystemSettings에서 값을 가져와서 SiteConfig 생성
  const config = useMemo<SiteConfig>(() => {
    // 로딩 중일 때는 기본값 사용
    if (isLoading) {
      return {
        siteName: import.meta.env.VITE_SITE_NAME || '마케팅의정석',
        siteUrl: import.meta.env.VITE_SITE_URL || 'http://localhost:5173',
        useCashSystem: true,
        cashChargeMode: 'modal' as const,
        defaultSlotPrice: 50000,
        minCashCharge: 10000,
        maxCashCharge: 1000000,
        maxSlotsPerUser: 1000,
        slotAutoApproval: false,
        cashAutoApproval: false,
        maintenanceMode: false,
        registrationEnabled: true,
        features: {
          analytics: false,
          websocket: false,
          debug: false,
          cashHistory: true,
          ranking: true,
          slotManagement: true,
          chatEnabled: false,
        },
        notificationEnabled: true,
        notificationSound: true,
        notificationAutoRead: false,
        notificationDuration: 5000,
        menus: { user: [], admin: [] },
        slotFields: []
      };
    }
    
    // 실제 설정값 사용
    const defaultConfig: SiteConfig = {
      siteName: import.meta.env.VITE_SITE_NAME || '마케팅의정석',
      siteUrl: import.meta.env.VITE_SITE_URL || 'http://localhost:5173',
      
      // 비즈니스 설정 (DB에서)
      useCashSystem: getSetting('useCashSystem', 'business') ?? true,
      cashChargeMode: getSetting('cashChargeMode', 'business') ?? 'modal',
      defaultSlotPrice: getSetting('defaultSlotPrice', 'business') ?? 50000,
      minCashCharge: getSetting('minCashCharge', 'business') ?? 10000,
      maxCashCharge: getSetting('maxCashCharge', 'business') ?? 1000000,
      maxSlotsPerUser: getSetting('maxSlotsPerUser', 'business') ?? 1000,
      slotAutoApproval: getSetting('slotAutoApproval', 'business') ?? false,
      cashAutoApproval: getSetting('cashAutoApproval', 'business') ?? false,
      maintenanceMode: getSetting('maintenanceMode', 'business') ?? false,
      registrationEnabled: getSetting('registrationEnabled', 'business') ?? true,
      
      // 기능 플래그 (DB에서)
      features: {
        analytics: false,
        websocket: false,
        debug: false,
        cashHistory: getSetting('featureCashHistory', 'feature') ?? true,
        ranking: getSetting('featureRanking', 'feature') ?? true,
        slotManagement: getSetting('featureSlotManagement', 'feature') ?? true,
        chatEnabled: getSetting('chatEnabled', 'feature') ?? false,
      },
      
      // 알림 설정 (DB에서)
      notificationEnabled: getSetting('notificationEnabled', 'feature') ?? true,
      notificationSound: getSetting('notificationSound', 'feature') ?? true,
      notificationAutoRead: getSetting('notificationAutoRead', 'feature') ?? false,
      notificationDuration: getSetting('notificationDuration', 'feature') ?? 5000,
      
      menus: {
        user: [],
        admin: []
      },
      slotFields: []
    };
    
    // 캐시 시스템 설정에 따른 메뉴 구성
    const userMenus: MenuItem[] = [
      { 
        id: 'slots', 
        label: '광고 슬롯', 
        path: '/slots', 
        visible: user?.role !== 'operator'  // 운영자는 광고슬롯 메뉴 숨김
      },
      { 
        id: 'cash-history', 
        label: '캐시 내역', 
        path: '/cash-history', 
        visible: defaultConfig.useCashSystem && defaultConfig.features.cashHistory 
      },
      { id: 'profile', label: '내 정보', path: '/profile', visible: true },
      { 
        id: 'ranking', 
        label: '랭킹', 
        path: '/ranking', 
        visible: defaultConfig.features.ranking 
      },
      { id: 'announcements', label: '공지사항', path: '/announcements', visible: true },
    ];
    
    const adminMenus: MenuItem[] = [
      { id: 'admin-dashboard', label: '관리자 대시보드', path: '/admin', visible: true },
      { 
        id: 'slot-approve', 
        label: getSetting('slotOperationMode', 'business') === 'pre-allocation' ? '슬롯 관리' : '슬롯 승인', 
        path: '/admin/slots', 
        visible: defaultConfig.features.slotManagement 
      },
      { 
        id: 'cash-approve', 
        label: '캐시 승인', 
        path: '/admin/cash', 
        visible: defaultConfig.useCashSystem 
      },
      { id: 'user-manage', label: '사용자 관리', path: '/admin/users', visible: true },
      { 
        id: 'chat-manage', 
        label: '채팅 관리', 
        path: '/admin/chat', 
        visible: defaultConfig.features.chatEnabled 
      },
      { id: 'system-settings', label: '시스템 설정', path: '/admin/settings', visible: true },
      { id: 'admin-notifications', label: '알림 발송', path: '/admin/notifications', visible: true },
      { id: 'admin-notification-history', label: '알림 내역', path: '/admin/notification-history', visible: true },
      { id: 'admin-announcements', label: '공지사항 관리', path: '/admin/announcements', visible: true },
    ];
    
    // 사용자 권한에 따른 메뉴 반환
    let finalMenus = {
      user: userMenus.filter(m => m.visible),
      admin: adminMenus.filter(m => m.visible)
    };

    // 운영자인 경우 광고슬롯 메뉴 숨기고 관리자 메뉴는 유지
    if (user?.role === 'operator') {
      // 운영자는 광고슬롯 메뉴 제외
      const operatorUserMenus = userMenus.filter(m => m.id !== 'slots' && m.visible);
      
      finalMenus = {
        user: operatorUserMenus,
        admin: adminMenus.filter(m => m.visible)  // 관리자 메뉴는 그대로 (슬롯 관리 포함)
      };
    }

    return {
      ...defaultConfig,
      menus: finalMenus
    };
  }, [settings, getSetting, isLoading, user]);
  
  const isFeatureEnabled = (feature: keyof SiteConfig['features']) => {
    return config.features[feature] ?? false;
  };
  
  return (
    <EnhancedConfigContext.Provider value={{ config, isFeatureEnabled, isLoading }}>
      {children}
    </EnhancedConfigContext.Provider>
  );
}

export function useEnhancedConfig() {
  const context = useContext(EnhancedConfigContext);
  if (context === undefined) {
    throw new Error('useEnhancedConfig must be used within a EnhancedConfigProvider');
  }
  return context;
}
import { SiteConfig } from './types';

export const defaultConfig: SiteConfig = {
  siteName: import.meta.env.VITE_SITE_NAME || '마케팅의정석',
  theme: (import.meta.env.VITE_THEME as SiteConfig['theme']) || 'simple',
  
  cashChargeMode: (import.meta.env.VITE_CASH_CHARGE_MODE as 'modal' | 'page') || 'modal',
  cashHistoryLocation: (import.meta.env.VITE_CASH_HISTORY_LOCATION as 'sidebar' | 'page' | 'balance-click') || 'sidebar',
  
  features: {
    cashHistory: import.meta.env.VITE_FEATURE_CASH_HISTORY === 'true',
    ranking: import.meta.env.VITE_FEATURE_RANKING === 'true',
    slotManagement: import.meta.env.VITE_FEATURE_SLOT_MANAGEMENT === 'true',
  },
  
  menus: {
    user: [
      {
        id: 'slots',
        label: '슬롯관리',
        path: '/slots',
        visible: true,
      },
      {
        id: 'ranking',
        label: '순위확인',
        path: '/ranking',
        visible: true,
      },
      {
        id: 'cash-history',
        label: '캐시내역',
        path: '/cash-history',
        visible: true,
      },
    ],
    admin: [
      {
        id: 'admin-slots',
        label: '슬롯 관리',
        path: '/admin/slots',
        visible: true,
      },
      {
        id: 'admin-users',
        label: '회원 관리',
        path: '/admin/users',
        visible: true,
      },
      {
        id: 'admin-cash',
        label: '캐시 승인',
        path: '/admin/cash-approve',
        visible: true,
      },
    ],
  },
};
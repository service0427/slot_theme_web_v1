// 알림 시스템 설정
export interface NotificationConfig {
  enabled: boolean; // 알림 기능 사용 여부
  position: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  defaultAutoClose: boolean; // 기본 자동 닫힘
  defaultDuration: number; // 기본 표시 시간 (ms)
  maxVisible: number; // 동시 표시 최대 개수
  sound: boolean; // 알림음
  animation: 'slide' | 'fade' | 'bounce'; // 애니메이션 타입
  themes: {
    simple: NotificationTheme;
    modern: NotificationTheme;
    luxury: NotificationTheme;
  };
}

// 테마별 알림 스타일
export interface NotificationTheme {
  containerClass: string;
  toastClass: {
    info: string;
    success: string;
    warning: string;
    error: string;
    custom: string;
  };
  titleClass: string;
  messageClass: string;
  actionButtonClass: {
    primary: string;
    secondary: string;
    danger: string;
  };
  closeButtonClass: string;
  iconClass: string;
}

// 기본 설정
const defaultNotificationConfig: NotificationConfig = {
  enabled: true,
  position: 'top-right',
  defaultAutoClose: true,
  defaultDuration: 5000,
  maxVisible: 3,
  sound: true,
  animation: 'slide',
  themes: {
    simple: {
      containerClass: 'fixed z-50 pointer-events-none',
      toastClass: {
        info: 'bg-blue-500 text-white',
        success: 'bg-green-500 text-white',
        warning: 'bg-yellow-500 text-white',
        error: 'bg-red-500 text-white',
        custom: 'bg-gray-700 text-white'
      },
      titleClass: 'font-bold text-lg',
      messageClass: 'text-sm mt-1',
      actionButtonClass: {
        primary: 'bg-white text-blue-500 px-3 py-1 rounded font-medium',
        secondary: 'bg-gray-200 text-gray-700 px-3 py-1 rounded',
        danger: 'bg-red-600 text-white px-3 py-1 rounded'
      },
      closeButtonClass: 'text-white hover:text-gray-200',
      iconClass: 'text-white'
    },
    modern: {
      containerClass: 'fixed z-50 pointer-events-none',
      toastClass: {
        info: 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg',
        success: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg',
        warning: 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg',
        error: 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg',
        custom: 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg'
      },
      titleClass: 'font-bold text-lg',
      messageClass: 'text-sm mt-1 opacity-90',
      actionButtonClass: {
        primary: 'bg-white/20 backdrop-blur text-white px-4 py-1.5 rounded-lg font-medium hover:bg-white/30',
        secondary: 'bg-black/20 text-white px-4 py-1.5 rounded-lg hover:bg-black/30',
        danger: 'bg-red-600/80 text-white px-4 py-1.5 rounded-lg hover:bg-red-700/80'
      },
      closeButtonClass: 'text-white/80 hover:text-white',
      iconClass: 'text-white'
    },
    luxury: {
      containerClass: 'fixed z-50 pointer-events-none',
      toastClass: {
        info: 'bg-white border-2 border-blue-300 text-gray-800 shadow-xl',
        success: 'bg-white border-2 border-green-300 text-gray-800 shadow-xl',
        warning: 'bg-white border-2 border-amber-300 text-gray-800 shadow-xl',
        error: 'bg-white border-2 border-red-300 text-gray-800 shadow-xl',
        custom: 'bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 text-gray-800 shadow-xl'
      },
      titleClass: 'font-bold text-lg text-gray-900',
      messageClass: 'text-sm mt-1 text-gray-600',
      actionButtonClass: {
        primary: 'bg-gradient-to-r from-amber-400 to-yellow-400 text-white px-4 py-1.5 rounded-lg font-medium shadow-md',
        secondary: 'bg-gray-100 text-gray-700 px-4 py-1.5 rounded-lg hover:bg-gray-200',
        danger: 'bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-1.5 rounded-lg shadow-md'
      },
      closeButtonClass: 'text-gray-400 hover:text-gray-600',
      iconClass: 'text-amber-500'
    }
  }
};

// 로컬 스토리지 키
const NOTIFICATION_CONFIG_KEY = 'notificationConfig';

// 설정 로드
export const loadNotificationConfig = (): NotificationConfig => {
  try {
    const saved = localStorage.getItem(NOTIFICATION_CONFIG_KEY);
    if (saved) {
      return { ...defaultNotificationConfig, ...JSON.parse(saved) };
    }
  } catch (error) {
    console.error('Failed to load notification config:', error);
  }
  return defaultNotificationConfig;
};

// 설정 저장
export const saveNotificationConfig = (config: Partial<NotificationConfig>) => {
  try {
    const current = loadNotificationConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(NOTIFICATION_CONFIG_KEY, JSON.stringify(updated));
    
    // 설정 변경 이벤트 발생
    window.dispatchEvent(new CustomEvent('notificationConfigChanged', { detail: updated }));
  } catch (error) {
    console.error('Failed to save notification config:', error);
  }
};

// 설정 초기화
export const resetNotificationConfig = () => {
  try {
    localStorage.removeItem(NOTIFICATION_CONFIG_KEY);
    window.dispatchEvent(new CustomEvent('notificationConfigChanged', { detail: defaultNotificationConfig }));
  } catch (error) {
    console.error('Failed to reset notification config:', error);
  }
};
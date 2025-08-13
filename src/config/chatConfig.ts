export interface ChatConfig {
  // 채팅 기능 전체 활성화 여부
  enabled: boolean;
  
  // 테마별 채팅 UI 표시 설정
  themes: {
    simple: {
      enabled: boolean;
      showChatButton: boolean;
      position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    };
    modern: {
      enabled: boolean;
      showSupportManager: boolean;
      allowCardView: boolean;
    };
    luxury: {
      enabled: boolean;
      showSupportManager: boolean;
      allowCardView: boolean;
      showVIPFeatures: boolean;
    };
  };
  
  // 자동 응답 설정
  autoReply: {
    enabled: boolean;
    delay: number; // milliseconds
    messages: string[];
  };
  
  // 실시간 업데이트 설정
  realtime: {
    enabled: boolean;
    pollingInterval: number; // milliseconds
    messagePolling: number; // milliseconds
  };
  
  // 알림 설정
  notifications: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
  };
  
  // API 설정
  api: {
    baseUrl: string;
    timeout: number; // milliseconds
  };
}

// 기본 설정
export const defaultChatConfig: ChatConfig = {
  enabled: false, // 전체 채팅 기능 비활성화
  
  themes: {
    simple: {
      enabled: true,
      showChatButton: true,
      position: 'bottom-right'
    },
    modern: {
      enabled: true,
      showSupportManager: true,
      allowCardView: false // 카드뷰 비활성화
    },
    luxury: {
      enabled: true,
      showSupportManager: true,
      allowCardView: true,
      showVIPFeatures: true
    }
  },
  
  autoReply: {
    enabled: false, // 자동응답 기본값 false
    delay: 1000,
    messages: [
      '문의 주셔서 감사합니다. 곧 담당자가 연결됩니다.',
      '잠시만 기다려주세요.',
      '상담원 연결 중입니다.'
    ]
  },
  
  realtime: {
    enabled: true,
    pollingInterval: 5000,
    messagePolling: 2000
  },
  
  notifications: {
    enabled: true,
    sound: false,
    desktop: false
  },
  
  api: {
    baseUrl: `${import.meta.env.VITE_API_URL || 'http://localhost:8001/api'}/chat`,
    timeout: 30000
  }
};

// 환경 변수로부터 설정 로드
export const loadChatConfig = (): ChatConfig => {
  // localStorage에서 커스텀 설정 로드
  const customConfig = localStorage.getItem('chatConfig');
  if (customConfig) {
    try {
      const parsed = JSON.parse(customConfig);
      return { ...defaultChatConfig, ...parsed };
    } catch (error) {
      console.error('Failed to parse chat config:', error);
    }
  }
  
  // 환경 변수에서 설정 오버라이드
  const config = { ...defaultChatConfig };
  
  // VITE 환경 변수 체크
  if (import.meta.env.VITE_CHAT_ENABLED !== undefined) {
    config.enabled = import.meta.env.VITE_CHAT_ENABLED === 'true';
  }
  
  if (import.meta.env.VITE_CHAT_API_URL) {
    config.api.baseUrl = import.meta.env.VITE_CHAT_API_URL;
  }
  
  return config;
};

// 설정 저장
export const saveChatConfig = (config: Partial<ChatConfig>): void => {
  const currentConfig = loadChatConfig();
  const newConfig = { ...currentConfig, ...config };
  localStorage.setItem('chatConfig', JSON.stringify(newConfig));
  
  // 설정 변경 이벤트 발생
  window.dispatchEvent(new CustomEvent('chatConfigChanged', { detail: newConfig }));
};

// 설정 리셋
export const resetChatConfig = (): void => {
  localStorage.removeItem('chatConfig');
  window.dispatchEvent(new CustomEvent('chatConfigChanged', { detail: defaultChatConfig }));
};
import { useState, useEffect } from 'react';
import { ChatConfig, loadChatConfig, saveChatConfig, resetChatConfig } from '@/config/chatConfig';

export const useChatConfig = () => {
  const [config, setConfig] = useState<ChatConfig>(loadChatConfig());

  useEffect(() => {
    // 설정 변경 이벤트 리스너
    const handleConfigChange = (event: CustomEvent<ChatConfig>) => {
      setConfig(event.detail);
    };

    window.addEventListener('chatConfigChanged', handleConfigChange as EventListener);

    return () => {
      window.removeEventListener('chatConfigChanged', handleConfigChange as EventListener);
    };
  }, []);

  const updateConfig = (newConfig: Partial<ChatConfig>) => {
    saveChatConfig(newConfig);
    setConfig(loadChatConfig());
  };

  const resetConfig = () => {
    resetChatConfig();
    setConfig(loadChatConfig());
  };

  // 테마별 채팅 활성화 여부 확인
  const isChatEnabledForTheme = (theme: 'simple' | 'modern' | 'luxury'): boolean => {
    return config.enabled && config.themes[theme].enabled;
  };

  // 현재 테마 확인 후 채팅 활성화 여부 반환
  const isChatEnabled = (): boolean => {
    if (!config.enabled) return false;
    
    // 현재 테마 가져오기
    const currentTheme = localStorage.getItem('adminTheme') || 'simple';
    
    if (currentTheme === 'simple' || currentTheme === 'modern' || currentTheme === 'luxury') {
      return config.themes[currentTheme].enabled;
    }
    
    return false;
  };

  return {
    config,
    updateConfig,
    resetConfig,
    isChatEnabledForTheme,
    isChatEnabled
  };
};
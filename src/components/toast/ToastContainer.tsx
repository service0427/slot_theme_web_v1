import { useEffect, useState } from 'react';
import { NotificationModel } from '@/core/models/Notification';
import { loadNotificationConfig } from '@/config/notificationConfig';
import { useSystemSettings } from '@/contexts/SystemSettingsContext';
import { Toast } from './Toast';

interface ToastContainerProps {
  notifications: NotificationModel[];
  onDismiss: (id: string) => void;
  onAction: (id: string, actionIndex: number) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  notifications,
  onDismiss,
  onAction
}) => {
  const { currentTheme } = useSystemSettings();
  const [config, setConfig] = useState(loadNotificationConfig());
  const [visibleToasts, setVisibleToasts] = useState<NotificationModel[]>([]);

  // 설정 변경 감지
  useEffect(() => {
    const handleConfigChange = (event: CustomEvent) => {
      setConfig(event.detail);
    };

    window.addEventListener('notificationConfigChanged', handleConfigChange as EventListener);
    return () => {
      window.removeEventListener('notificationConfigChanged', handleConfigChange as EventListener);
    };
  }, []);

  // 표시할 토스트 필터링 (최대 개수 제한)
  useEffect(() => {
    const undismissedNotifications = notifications.filter(n => !n.dismissedAt);
    setVisibleToasts(undismissedNotifications.slice(0, config.maxVisible));
  }, [notifications, config.maxVisible]);

  if (!config.enabled || visibleToasts.length === 0) {
    return null;
  }

  // 위치별 클래스 매핑
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4'
  };

  const containerClass = `${config.themes[currentTheme].containerClass} ${positionClasses[config.position]}`;

  return (
    <div className={containerClass}>
      <div className="space-y-3">
        {visibleToasts.map((notification, index) => (
          <Toast
            key={notification.id}
            notification={notification}
            config={config}
            theme={currentTheme}
            index={index}
            onDismiss={onDismiss}
            onAction={onAction}
          />
        ))}
      </div>
    </div>
  );
};
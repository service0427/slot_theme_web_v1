import { useEffect, useState } from 'react';
import { NotificationModel, NotificationType } from '@/core/models/Notification';
import { NotificationConfig } from '@/config/notificationConfig';
import { X, Info, CheckCircle, AlertTriangle, AlertCircle, Sparkles } from 'lucide-react';

interface ToastProps {
  notification: NotificationModel;
  config: NotificationConfig;
  theme: 'simple' | 'modern' | 'luxury';
  index: number;
  onDismiss: (id: string) => void;
  onAction: (id: string, actionIndex: number) => void;
}

export const Toast: React.FC<ToastProps> = ({
  notification,
  config,
  theme,
  index,
  onDismiss,
  onAction
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  // 마운트 시 애니메이션
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 100);
    return () => clearTimeout(timer);
  }, [index]);

  // 자동 닫기 타이머
  useEffect(() => {
    if (notification.autoClose && notification.duration) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, notification.duration);

      return () => clearTimeout(timer);
    }
  }, [notification.autoClose, notification.duration]);

  const handleDismiss = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onDismiss(notification.id);
    }, 300); // 애니메이션 시간
  };

  const handleAction = (actionIndex: number) => {
    onAction(notification.id, actionIndex);
    handleDismiss();
  };

  // 아이콘 매핑
  const getIcon = () => {
    if (notification.icon) {
      return <span className="text-xl">{notification.icon}</span>;
    }

    switch (notification.type) {
      case NotificationType.SUCCESS:
        return <CheckCircle className="w-5 h-5" />;
      case NotificationType.WARNING:
        return <AlertTriangle className="w-5 h-5" />;
      case NotificationType.ERROR:
        return <AlertCircle className="w-5 h-5" />;
      case NotificationType.CUSTOM:
        return <Sparkles className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  // 애니메이션 클래스
  const getAnimationClass = () => {
    const baseClass = 'transform transition-all duration-300 ease-out';
    
    if (isLeaving) {
      switch (config.animation) {
        case 'slide':
          return `${baseClass} translate-x-full opacity-0`;
        case 'fade':
          return `${baseClass} opacity-0`;
        case 'bounce':
          return `${baseClass} scale-75 opacity-0`;
        default:
          return `${baseClass} opacity-0`;
      }
    }

    if (!isVisible) {
      switch (config.animation) {
        case 'slide':
          return `${baseClass} translate-x-full opacity-0`;
        case 'fade':
          return `${baseClass} opacity-0`;
        case 'bounce':
          return `${baseClass} scale-75 opacity-0`;
        default:
          return `${baseClass} opacity-0`;
      }
    }

    return baseClass;
  };

  const themeConfig = config.themes[theme];
  const typeClass = themeConfig.toastClass[notification.type];

  return (
    <div
      className={`
        ${getAnimationClass()}
        ${typeClass}
        rounded-lg p-4 max-w-sm min-w-72 shadow-lg pointer-events-auto
        ${notification.priority === 'high' ? 'ring-2 ring-current ring-opacity-20' : ''}
      `}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {/* 아이콘 */}
        <div className={`flex-shrink-0 ${themeConfig.iconClass}`}>
          {getIcon()}
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 min-w-0">
          <h4 className={themeConfig.titleClass}>
            {notification.title}
          </h4>
          <p className={themeConfig.messageClass}>
            {notification.message}
          </p>

          {/* 액션 버튼들 */}
          {notification.actions && notification.actions.length > 0 && (
            <div className="flex gap-2 mt-3">
              {notification.actions.map((action, actionIndex) => (
                <button
                  key={actionIndex}
                  onClick={() => handleAction(actionIndex)}
                  className={`
                    ${themeConfig.actionButtonClass[action.style || 'primary']}
                    text-xs transition-all duration-200 hover:scale-105
                  `}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 닫기 버튼 */}
        <button
          onClick={handleDismiss}
          className={`
            ${themeConfig.closeButtonClass}
            flex-shrink-0 w-6 h-6 flex items-center justify-center
            rounded transition-colors duration-200
          `}
          aria-label="알림 닫기"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 자동 닫기 프로그레스 바 */}
      {notification.autoClose && notification.duration && (
        <div className="mt-2 h-1 bg-black/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-current opacity-60 rounded-full"
            style={{
              animation: `toast-progress ${notification.duration}ms linear forwards`
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes toast-progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
};
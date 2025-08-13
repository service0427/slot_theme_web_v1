import { useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Bell, X, Check } from 'lucide-react';
import { NotificationType } from '@/core/models/Notification';

export function NotificationCenter() {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead,
    loadNotifications 
  } = useNotifications();
  
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const handleOpenModal = () => {
    setIsOpen(true);
    loadNotifications();
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.readAt;
    return true;
  });

  const getTypeColor = (type: NotificationType) => {
    switch (type) {
      case NotificationType.SUCCESS: return 'bg-green-50 text-green-700 border-green-200';
      case NotificationType.WARNING: return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case NotificationType.ERROR: return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <>
      {/* Simple 테마 - 미니멀한 알림 버튼 */}
      <button
        onClick={handleOpenModal}
        className="fixed bottom-20 right-4 p-3 bg-white border-2 border-gray-300 text-gray-700 rounded-full shadow-md hover:shadow-lg transition-all duration-200 z-40"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Simple 테마 - 깔끔한 알림 패널 */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black bg-opacity-25"
            onClick={() => setIsOpen(false)}
          />
          
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-lg max-h-[70vh] flex flex-col">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">알림</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 필터 */}
            <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 rounded text-sm ${
                    filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'
                  }`}
                >
                  전체
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`px-3 py-1 rounded text-sm ${
                    filter === 'unread' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'
                  }`}
                >
                  안읽음
                </button>
              </div>
              
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  모두 읽음
                </button>
              )}
            </div>

            {/* 알림 목록 */}
            <div className="flex-1 overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                  <Bell className="w-8 h-8 mb-2 text-gray-300" />
                  <p>알림이 없습니다</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredNotifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`p-3 ${!notification.readAt ? 'bg-blue-100 hover:bg-blue-200 border-l-4 border-blue-500' : 'bg-gray-50 hover:bg-gray-100'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <h4 className={`font-medium text-sm ${!notification.readAt ? 'text-gray-900 font-bold' : 'text-gray-600'}`}>
                            {notification.title}
                          </h4>
                          <p className={`text-sm mt-1 ${!notification.readAt ? 'text-gray-700' : 'text-gray-500'}`}>
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-400">
                              {formatTime(notification.createdAt)}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded border ${getTypeColor(notification.type)}`}>
                              {notification.type}
                            </span>
                          </div>
                        </div>
                        
                        {!notification.readAt && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="p-1 hover:bg-gray-200 rounded"
                            title="읽음 표시"
                          >
                            <Check className="w-4 h-4 text-gray-500" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
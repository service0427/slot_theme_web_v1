import { useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Bell, X, Check, Sparkles } from 'lucide-react';
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

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.SUCCESS: return '✅';
      case NotificationType.WARNING: return '⚠️';
      case NotificationType.ERROR: return '❌';
      default: return '💬';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '방금';
    if (minutes < 60) return `${minutes}분`;
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}시간`;
    const days = Math.floor(diff / 86400000);
    return `${days}일`;
  };

  return (
    <>
      {/* Modern 테마 - 그라데이션 알림 버튼 */}
      <button
        onClick={handleOpenModal}
        className="fixed bottom-24 right-6 p-4 bg-gradient-to-br from-purple-500 to-blue-600 text-white rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 z-40"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full min-w-6 h-6 flex items-center justify-center px-1 font-bold animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Modern 테마 - 모던한 알림 패널 */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[75vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
            {/* 헤더 - 그라데이션 배경 */}
            <div className="bg-gradient-to-r from-purple-500 to-blue-600 text-white p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6" />
                  <h2 className="text-xl font-bold">알림 센터</h2>
                  {unreadCount > 0 && (
                    <span className="bg-white/20 backdrop-blur text-white text-sm px-2 py-1 rounded-full">
                      {unreadCount}개 새 알림
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 필터 */}
            <div className="flex items-center justify-between px-5 py-3 bg-gray-50">
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filter === 'all' 
                      ? 'bg-gradient-to-r from-purple-500 to-blue-600 text-white shadow-md' 
                      : 'bg-white text-gray-700 hover:shadow-sm'
                  }`}
                >
                  전체
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filter === 'unread' 
                      ? 'bg-gradient-to-r from-purple-500 to-blue-600 text-white shadow-md' 
                      : 'bg-white text-gray-700 hover:shadow-sm'
                  }`}
                >
                  안읽음
                </button>
              </div>
              
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors"
                >
                  모두 읽음
                </button>
              )}
            </div>

            {/* 알림 목록 */}
            <div className="flex-1 overflow-y-auto p-3">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <div className="p-4 bg-gray-100 rounded-full mb-4">
                    <Bell className="w-10 h-10" />
                  </div>
                  <p className="text-lg">알림이 없습니다</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredNotifications.map((notification, index) => (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-xl border transition-all hover:shadow-md hover:scale-[1.01] ${
                        !notification.readAt 
                          ? 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200' 
                          : 'bg-white border-gray-200'
                      }`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl flex-shrink-0">
                          {getTypeIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1">
                          <h4 className={`font-semibold ${!notification.readAt ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notification.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-3 mt-3">
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                              {formatTime(notification.createdAt)} 전
                            </span>
                            {notification.sender === 'operator' && (
                              <span className="text-xs px-2 py-1 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 text-white">
                                운영자
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {!notification.readAt && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="p-2 hover:bg-green-100 rounded-lg transition-colors group"
                            title="읽음 표시"
                          >
                            <Check className="w-5 h-5 text-gray-500 group-hover:text-green-600" />
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
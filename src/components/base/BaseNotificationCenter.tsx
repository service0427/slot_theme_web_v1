import { useState, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Bell, X, Check } from 'lucide-react';
import { NotificationType } from '@/core/models/Notification';

export function BaseNotificationCenter() {
  console.log('[BaseNotificationCenter] 컴포넌트 렌더링');
  
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    dismiss,
    loadNotifications 
  } = useNotifications();
  
  console.log('[BaseNotificationCenter] 알림 수:', notifications.length);
  console.log('[BaseNotificationCenter] 읽지 않은 알림:', unreadCount);
  
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // 모달을 열 때 알림 목록 새로고침
  const handleOpenModal = () => {
    setIsOpen(true);
    loadNotifications(); // 최신 알림 로드
  };

  // 필터링된 알림 목록 - dismissed된 알림은 제외
  const filteredNotifications = notifications.filter(n => {
    // dismissed된 알림은 표시하지 않음
    if (n.dismissedAt) {
      return false;
    }
    
    if (filter === 'unread') {
      return !n.readAt;
    }
    return true;
  });

  // 알림 타입별 색상
  const getTypeColor = (type: NotificationType) => {
    switch (type) {
      case NotificationType.SUCCESS:
        return 'bg-green-100 text-green-800 border-green-200';
      case NotificationType.WARNING:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case NotificationType.ERROR:
        return 'bg-red-100 text-red-800 border-red-200';
      case NotificationType.CUSTOM:
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };
  
  // 알림 타입 한글 라벨
  const getTypeLabel = (type: NotificationType) => {
    switch (type) {
      case NotificationType.SUCCESS:
        return '성공';
      case NotificationType.WARNING:
        return '경고';
      case NotificationType.ERROR:
        return '오류';
      case NotificationType.CUSTOM:
        return '사용자 정의';
      case NotificationType.INFO:
        return '정보';
      default:
        return '알림';
    }
  };

  // 알림 타입별 아이콘
  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.SUCCESS:
        return '✅';
      case NotificationType.WARNING:
        return '⚠️';
      case NotificationType.ERROR:
        return '❌';
      case NotificationType.CUSTOM:
        return '✨';
      default:
        return '📋';
    }
  };

  // 시간 포맷
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
      {/* 알림 버튼 (플로팅) */}
      <button
        onClick={handleOpenModal}
        className="fixed bottom-24 right-6 p-4 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 text-white rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-300 z-40 backdrop-blur-sm animate-pulse"
      >
        <Bell className={`w-6 h-6 transition-transform duration-300 ${isOpen ? 'rotate-12' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-gradient-to-r from-red-400 to-pink-500 text-white text-xs rounded-full w-7 h-7 flex items-center justify-center font-bold shadow-lg animate-bounce">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 알림 패널 */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          {/* 배경 오버레이 */}
          <div 
            className="absolute inset-0 bg-gradient-to-br from-black/30 via-purple-900/20 to-indigo-900/30 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          {/* 알림 컨테이너 */}
          <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 w-full max-w-2xl max-h-[80vh] flex flex-col transform animate-in slide-in-from-bottom-5 duration-500">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-6 border-b border-gradient-to-r from-purple-100 via-blue-100 to-indigo-100">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-gradient-to-br from-blue-400 to-purple-600 rounded-xl text-white">
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">알림</h2>
                  {unreadCount > 0 && (
                    <span className="text-sm text-gray-600">
                      {unreadCount}개의 새로운 알림이 있습니다
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 rounded-xl transition-all duration-300 group"
              >
                <X className="w-6 h-6 text-gray-500 group-hover:text-red-500 transition-colors" />
              </button>
            </div>

            {/* 필터 및 액션 */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-gray-50/50 via-blue-50/30 to-purple-50/50 backdrop-blur-sm">
              <div className="flex gap-3">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    filter === 'all' 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105' 
                      : 'bg-white/80 text-gray-700 hover:bg-white hover:shadow-md hover:scale-105 border border-gray-200'
                  }`}
                >
                  전체
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    filter === 'unread' 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105' 
                      : 'bg-white/80 text-gray-700 hover:bg-white hover:shadow-md hover:scale-105 border border-gray-200'
                  }`}
                >
                  안읽음
                </button>
              </div>
              
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-4 py-2 bg-gradient-to-r from-green-400 to-emerald-500 text-white text-sm font-semibold rounded-xl hover:from-green-500 hover:to-emerald-600 transform hover:scale-105 transition-all duration-300 shadow-lg"
                >
                  모두 읽음 표시
                </button>
              )}
            </div>

            {/* 알림 목록 */}
            <div className="flex-1 overflow-y-auto p-2">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <div className="p-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mb-4">
                    <Bell className="w-12 h-12 text-gray-400" />
                  </div>
                  <p className="text-lg font-medium">알림이 없습니다</p>
                  <p className="text-sm text-gray-400 mt-1">새로운 알림이 도착하면 여기에 표시됩니다</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.map((notification, index) => (
                    <div
                      key={notification.id}
                      className={`p-5 rounded-2xl border transition-all duration-300 hover:shadow-lg hover:scale-[1.02] transform ${
                        !notification.readAt 
                          ? 'bg-gradient-to-br from-blue-800 via-indigo-800 to-purple-800 border-blue-900 shadow-2xl ring-4 ring-blue-600/80 text-white' 
                          : 'bg-gray-300 border-gray-600 hover:bg-gray-400 opacity-40'
                      } animate-in slide-in-from-left duration-500`}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-start gap-4">
                        {/* 타입 아이콘 */}
                        <div className="flex-shrink-0 mt-1">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                            !notification.readAt 
                              ? 'bg-gradient-to-br from-yellow-500 to-orange-600 shadow-2xl ring-3 ring-white' 
                              : 'bg-gradient-to-br from-gray-500 to-gray-600 opacity-30'
                          }`}>
                            <span className="text-white filter drop-shadow-sm">
                              {getTypeIcon(notification.type)}
                            </span>
                          </div>
                        </div>

                        {/* 알림 내용 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className={`font-bold text-lg ${
                                  !notification.readAt ? 'text-white' : 'text-gray-400'
                                }`}>
                                  {notification.title}
                                </h4>
                                {!notification.readAt && (
                                  <span className="px-3 py-1 bg-gradient-to-r from-red-600 to-red-500 text-white text-sm font-bold rounded-full shadow-lg animate-bounce border-2 border-white">
                                    🔥 NEW
                                  </span>
                                )}
                              </div>
                              <p className={`mt-2 leading-relaxed ${
                                !notification.readAt ? 'text-white/90' : 'text-gray-300'
                              }`}>
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-3 mt-4">
                                <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                  {formatTime(notification.createdAt)}
                                </span>
                                <span className={`text-xs px-3 py-1 rounded-full font-semibold ${getTypeColor(notification.type)}`}>
                                  {getTypeLabel(notification.type)}
                                </span>
                                {notification.sender === 'operator' && (
                                  <span className="text-xs px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-semibold shadow-sm">
                                    ✨ 운영자
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* 액션 버튼 - 읽음 표시만 */}
                            <div className="flex items-center gap-2">
                              {!notification.readAt && (
                                <button
                                  onClick={() => markAsRead(notification.id)}
                                  className="p-2 hover:bg-green-100 rounded-xl transition-all duration-300 group"
                                  title="읽음 표시"
                                >
                                  <Check className="w-5 h-5 text-gray-600 group-hover:text-green-600 transition-colors" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* 액션 버튼들 */}
                          {notification.actions && notification.actions.length > 0 && (
                            <div className="flex gap-3 mt-4 pt-3 border-t border-gray-100">
                              {notification.actions.map((action, index) => (
                                <button
                                  key={index}
                                  onClick={() => {
                                    action.action();
                                    if (!notification.readAt) {
                                      markAsRead(notification.id);
                                    }
                                  }}
                                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 shadow-sm ${
                                    action.style === 'primary' 
                                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg'
                                      : action.style === 'danger'
                                      ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white hover:from-red-600 hover:to-pink-700 shadow-lg'
                                      : 'bg-gradient-to-r from-gray-200 to-gray-300 text-gray-700 hover:from-gray-300 hover:to-gray-400 border border-gray-300'
                                  }`}
                                >
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
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
import { useState } from 'react';
import { NotificationType, CreateNotificationDto } from '@/core/models/Notification';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuthContext } from '@/adapters/react';

export function BaseNotificationTestPage() {
  const { user } = useAuthContext();
  const { notifications, unreadCount, generateTestNotifications } = useNotifications();
  const [formData, setFormData] = useState<CreateNotificationDto>({
    type: NotificationType.INFO,
    title: '테스트 알림',
    message: '이것은 테스트 알림입니다.',
    recipientId: user?.id || 'user1',
    autoClose: true,
    duration: 5000
  });

  const handleInputChange = (field: keyof CreateNotificationDto, value: any) => {
    console.log(`[handleInputChange] ${field}:`, value);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSendNotification = async () => {
    try {
      console.log('발송할 알림 데이터 (formData):', formData);
      console.log('autoClose 값:', formData.autoClose, typeof formData.autoClose);
      
      // API를 통해 알림 발송
      const { ApiNotificationService } = await import('@/adapters/services/ApiNotificationService');
      const notificationService = ApiNotificationService.getInstance();
      
      // formData를 API 형식에 맞게 변환 (autoClose는 제거하고 auto_close만 사용)
      const { autoClose, ...restData } = formData;
      const notificationData = {
        ...restData,
        auto_close: autoClose,  // autoClose를 auto_close로 변환
        recipientId: formData.recipientId || 'all'
      };
      
      console.log('변환된 알림 데이터 (notificationData):', notificationData);
      console.log('auto_close 값:', notificationData.auto_close, typeof notificationData.auto_close);
      
      await notificationService.send(notificationData);
      
      // 성공 메시지 (옵션)
      alert('알림이 성공적으로 발송되었습니다!');
    } catch (error) {
      console.error('알림 발송 실패:', error);
      alert('알림 발송에 실패했습니다.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">알림 시스템 테스트</h1>
        
        {/* 현재 상태 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-blue-900 mb-2">현재 상태</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-blue-700">총 알림 수:</span>
              <span className="ml-2 font-bold text-blue-900">{notifications.length}</span>
            </div>
            <div>
              <span className="text-sm text-blue-700">읽지 않은 알림:</span>
              <span className="ml-2 font-bold text-blue-900">{unreadCount}</span>
            </div>
          </div>
        </div>

        {/* 빠른 테스트 */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-green-900 mb-4">빠른 테스트</h2>
          <button
            onClick={generateTestNotifications}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            🧪 테스트 알림 5개 생성 (2초 간격)
          </button>
        </div>

        {/* 커스텀 알림 생성 */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h2 className="font-semibold text-amber-900 mb-4">커스텀 알림 생성</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                알림 타입
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={NotificationType.INFO}>정보 (INFO)</option>
                <option value={NotificationType.SUCCESS}>성공 (SUCCESS)</option>
                <option value={NotificationType.WARNING}>경고 (WARNING)</option>
                <option value={NotificationType.ERROR}>오류 (ERROR)</option>
                <option value={NotificationType.CUSTOM}>커스텀 (CUSTOM)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                수신자 ID
              </label>
              <input
                type="text"
                value={formData.recipientId}
                onChange={(e) => handleInputChange('recipientId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="user1 또는 'all'"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              제목
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="알림 제목"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              내용
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="알림 내용"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoClose"
                checked={formData.autoClose}
                onChange={(e) => handleInputChange('autoClose', e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="autoClose" className="text-sm font-medium text-gray-700">
                자동 닫기
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                표시 시간 (ms)
              </label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="5000"
                disabled={!formData.autoClose}
              />
            </div>
          </div>

          <button
            onClick={handleSendNotification}
            className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors"
          >
            📢 알림 발송
          </button>
        </div>

        {/* 현재 알림 목록 */}
        {notifications.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
            <h2 className="font-semibold text-gray-900 mb-4">현재 알림 목록</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded border-l-4 ${
                    notification.type === NotificationType.SUCCESS
                      ? 'bg-green-50 border-green-500'
                      : notification.type === NotificationType.WARNING
                      ? 'bg-yellow-50 border-yellow-500'
                      : notification.type === NotificationType.ERROR
                      ? 'bg-red-50 border-red-500'
                      : 'bg-blue-50 border-blue-500'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{notification.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      <div className="flex gap-4 text-xs text-gray-500 mt-2">
                        <span>타입: {notification.type}</span>
                        <span>생성: {notification.createdAt.toLocaleTimeString()}</span>
                        {notification.readAt && (
                          <span>읽음: {notification.readAt.toLocaleTimeString()}</span>
                        )}
                        {notification.dismissedAt && (
                          <span>닫음: {notification.dismissedAt.toLocaleTimeString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!notification.readAt && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      )}
                      {notification.dismissedAt && (
                        <span className="text-xs text-gray-400">닫힘</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
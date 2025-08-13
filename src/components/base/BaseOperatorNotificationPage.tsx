import { useState, useEffect, useRef } from 'react';
import { NotificationType, CreateNotificationDto, NotificationSender } from '@/core/models/Notification';
import { ApiNotificationService } from '@/adapters/services/ApiNotificationService';
import { useAuthContext } from '@/adapters/react';
import { ApiUserService } from '@/adapters/services/ApiUserService';
import { User } from '@/core/models/User';

export function BaseOperatorNotificationPage() {
  const { user } = useAuthContext();
  const [notificationService] = useState(() => ApiNotificationService.getInstance());
  const [userService] = useState(() => new ApiUserService());
  
  const [formData, setFormData] = useState<CreateNotificationDto>({
    type: NotificationType.INFO,
    title: '',
    message: '',
    recipientId: 'all',
    autoClose: true,
    duration: 5000
  });

  const [recipientType, setRecipientType] = useState<'all' | 'selected'>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 사용자 목록 로드
  useEffect(() => {
    const loadUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const result = await userService.getUsers({ 
          role: 'user', // 일반 사용자만
          limit: 100 
        });
        if (result.success && result.data) {
          setAllUsers(result.data.users);
        }
      } catch (error) {
        console.error('Failed to load users:', error);
      } finally {
        setIsLoadingUsers(false);
      }
    };
    
    if (user?.role === 'operator') {
      loadUsers();
    }
  }, [user]);

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 필터링된 사용자 목록
  const filteredUsers = allUsers.filter(user => 
    !selectedUsers.includes(user.id) &&
    (user.fullName && user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
     user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // 관리자 권한 체크
  if (user?.role !== 'operator') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800">접근 권한 없음</h2>
          <p className="text-red-600">이 페이지는 운영자만 접근할 수 있습니다.</p>
        </div>
      </div>
    );
  }

  const handleInputChange = (field: keyof CreateNotificationDto, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddUser = (userId: string) => {
    setSelectedUsers(prev => [...prev, userId]);
    setSearchTerm('');
    setShowUserDropdown(false);
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(prev => prev.filter(id => id !== userId));
  };

  const handleSendNotification = async () => {
    if (!formData.title || !formData.message) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }

    if (recipientType === 'selected' && selectedUsers.length === 0) {
      alert('알림을 받을 사용자를 선택해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      console.log('[OperatorNotificationPage] 알림 발송 시작');
      console.log('recipientType:', recipientType);
      console.log('selectedUsers:', selectedUsers);
      console.log('formData:', formData);
      
      // autoClose를 auto_close로 변환
      const { autoClose, ...restData } = formData;
      const dataToSend = {
        ...restData,
        auto_close: autoClose,
        sender: NotificationSender.OPERATOR
      };
      
      console.log('[OperatorNotificationPage] 발송 데이터:', dataToSend);
      console.log('[OperatorNotificationPage] auto_close 값:', dataToSend.auto_close, typeof dataToSend.auto_close);
      
      if (recipientType === 'all') {
        const result = await notificationService.send({ ...dataToSend, recipientId: 'all' });
        console.log('[OperatorNotificationPage] 전체 알림 발송 결과:', result);
      } else {
        // 여러 사용자 선택 시 배열로 한 번에 발송
        const result = await notificationService.send({ ...dataToSend, recipientId: selectedUsers });
        console.log('[OperatorNotificationPage] 그룹 알림 발송 결과:', result);
      }

      alert('알림이 성공적으로 발송되었습니다.');
      
      // 폼 초기화
      setFormData({
        type: NotificationType.INFO,
        title: '',
        message: '',
        recipientId: 'all',
        autoClose: true,
        duration: 5000
      });
      setSelectedUsers([]);
      setRecipientType('all');
    } catch (error) {
      console.error('Failed to send notification:', error);
      alert('알림 발송에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendPresetNotification = async (preset: 'maintenance' | 'event' | 'warning') => {
    let notification: any;

    switch (preset) {
      case 'maintenance':
        notification = {
          type: NotificationType.WARNING,
          title: '시스템 점검 안내',
          message: '오늘 오후 2시부터 1시간 동안 시스템 점검이 예정되어 있습니다. 서비스 이용에 참고하시기 바랍니다.',
          recipientId: 'all',
          sender: NotificationSender.OPERATOR,
          auto_close: false,  // autoClose를 auto_close로 변경
          priority: 'high'
        };
        break;
      case 'event':
        notification = {
          type: NotificationType.SUCCESS,
          title: '🎉 특별 이벤트 시작!',
          message: '지금 참여하시면 특별한 혜택을 받을 수 있습니다. 자세한 내용은 이벤트 페이지를 확인해주세요.',
          recipientId: 'all',
          sender: NotificationSender.OPERATOR,
          auto_close: true,  // autoClose를 auto_close로 변경
          duration: 8000,
          priority: 'normal'
        };
        break;
      case 'warning':
        notification = {
          type: NotificationType.ERROR,
          title: '⚠️ 중요 공지사항',
          message: '서비스 이용 중 문제가 발생하면 즉시 고객센터로 연락해주시기 바랍니다.',
          recipientId: 'all',
          sender: NotificationSender.OPERATOR,
          auto_close: false,  // autoClose를 auto_close로 변경
          priority: 'high'
        };
        break;
    }

    setIsLoading(true);
    try {
      await notificationService.send(notification);
      alert(`${notification.title} 알림이 발송되었습니다.`);
    } catch (error) {
      console.error('Failed to send preset notification:', error);
      alert('알림 발송에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">운영자 알림 발송</h1>
        
        {/* 빠른 발송 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-blue-900 mb-4">빠른 발송</h2>
          <div className="flex gap-3">
            <button
              onClick={() => handleSendPresetNotification('maintenance')}
              disabled={isLoading}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
            >
              🔧 점검 안내
            </button>
            <button
              onClick={() => handleSendPresetNotification('event')}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              🎉 이벤트 알림
            </button>
            <button
              onClick={() => handleSendPresetNotification('warning')}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              ⚠️ 중요 공지
            </button>
          </div>
        </div>

        {/* 커스텀 알림 생성 */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h2 className="font-semibold text-gray-900 mb-4">커스텀 알림 생성</h2>
          
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
                <option value={NotificationType.INFO}>📋 정보 (INFO)</option>
                <option value={NotificationType.SUCCESS}>✅ 성공 (SUCCESS)</option>
                <option value={NotificationType.WARNING}>⚠️ 경고 (WARNING)</option>
                <option value={NotificationType.ERROR}>❌ 오류 (ERROR)</option>
                <option value={NotificationType.CUSTOM}>✨ 커스텀 (CUSTOM)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                수신자
              </label>
              <select
                value={recipientType}
                onChange={(e) => {
                  setRecipientType(e.target.value as 'all' | 'selected');
                  setSelectedUsers([]);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">전체 사용자</option>
                <option value="selected">선택한 사용자</option>
              </select>
            </div>
          </div>

          {recipientType === 'selected' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                사용자 선택
              </label>
              
              {/* 선택된 사용자 태그 */}
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedUsers.map(userId => {
                    const user = allUsers.find(u => u.id === userId);
                    return (
                      <span
                        key={userId}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                      >
                        {user?.fullName} ({user?.email})
                        <button
                          onClick={() => handleRemoveUser(userId)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* 사용자 검색 드롭다운 */}
              <div className="relative" ref={dropdownRef}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowUserDropdown(true);
                  }}
                  onFocus={() => setShowUserDropdown(true)}
                  placeholder="이름 또는 이메일로 검색..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                
                {showUserDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {isLoadingUsers ? (
                      <div className="px-4 py-3 text-gray-500 text-center">
                        사용자 목록 로딩 중...
                      </div>
                    ) : filteredUsers.length > 0 ? (
                      filteredUsers.map(user => (
                        <div
                          key={user.id}
                          onClick={() => handleAddUser(user.id)}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        >
                          <div className="font-medium">{user.fullName}</div>
                          <div className="text-sm text-gray-600">{user.email}</div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-gray-500 text-center">
                        {searchTerm ? '검색 결과가 없습니다' : '사용자가 없습니다'}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {selectedUsers.length === 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  검색하여 사용자를 선택하세요. 여러 명을 선택할 수 있습니다.
                </p>
              )}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              제목
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="알림 제목을 입력하세요"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              내용
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="알림 내용을 입력하세요"
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
                min="1000"
                max="30000"
                step="1000"
              />
            </div>
          </div>

          <button
            onClick={handleSendNotification}
            disabled={isLoading || !formData.title || !formData.message}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '발송 중...' : '📢 알림 발송'}
          </button>
        </div>

        {/* 사용법 안내 */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
          <h3 className="font-semibold text-amber-900 mb-2">📖 사용법 안내</h3>
          <ul className="text-sm text-amber-800 space-y-1">
            <li>• <strong>빠른 발송:</strong> 미리 정의된 템플릿으로 즉시 알림을 발송할 수 있습니다.</li>
            <li>• <strong>전체 발송:</strong> 모든 접속 중인 사용자에게 알림이 전송됩니다.</li>
            <li>• <strong>선택 발송:</strong> 드롭다운에서 사용자를 검색하고 선택하여 특정 사용자들에게만 발송합니다.</li>
            <li>• <strong>자동 닫기:</strong> 체크하면 지정된 시간 후 알림이 자동으로 사라집니다.</li>
            <li>• <strong>알림 타입:</strong> 타입에 따라 색상과 아이콘이 달라집니다.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
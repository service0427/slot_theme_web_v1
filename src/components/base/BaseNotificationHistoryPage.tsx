import { useState, useEffect } from 'react';
import { ApiNotificationService } from '@/adapters/services/ApiNotificationService';
import { NotificationModel, NotificationType, NotificationSender } from '@/core/models/Notification';
import { useAuthContext } from '@/adapters/react';
import { ApiUserService } from '@/adapters/services/ApiUserService';
import { User } from '@/core/models/User';
import { Clock, Users, User as UserIcon, AlertCircle, CheckCircle, Info, XCircle, Sparkles, Megaphone, Calendar, Send, ChevronDown } from 'lucide-react';

export function BaseNotificationHistoryPage() {
  const { user } = useAuthContext();
  const [notificationService] = useState(() => ApiNotificationService.getInstance());
  const [userService] = useState(() => new ApiUserService());
  const [notifications, setNotifications] = useState<NotificationModel[]>([]);
  const [users, setUsers] = useState<Map<string, User>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'all'>('all');
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    message: '',
    priority: 'normal' as 'low' | 'normal' | 'high',
    pinned: false
  });
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  // 관리자 권한 체크
  if (user?.role !== 'operator') {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800">접근 권한 없음</h2>
          <p className="text-red-600">이 페이지는 운영자만 접근할 수 있습니다.</p>
        </div>
      </div>
    );
  }

  // 알림 내역 로드
  useEffect(() => {
    loadNotifications();
    loadUsers();
  }, [filter, typeFilter]);

  const loadUsers = async () => {
    try {
      const result = await userService.getUsers({ limit: 1000 });
      if (result.success && result.data) {
        const userMap = new Map<string, User>();
        result.data.users.forEach(user => {
          userMap.set(user.id, user);
        });
        setUsers(userMap);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      // 날짜 필터 적용
      let fromDate: Date | undefined;
      const now = new Date();
      
      switch (filter) {
        case 'today':
          fromDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          fromDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          fromDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
      }

      // 관리자는 getAllNotifications 사용
      const result = await (notificationService as ApiNotificationService).getAllNotifications({
        type: typeFilter === 'all' ? undefined : typeFilter,
        fromDate,
        limit: 100
      });
      
      setNotifications(result);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 시간 포맷
  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // 상대 시간 포맷
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(diff / 86400000);
    if (days < 7) return `${days}일 전`;
    return formatDateTime(date);
  };

  // 수신자 이름 가져오기
  const getRecipientName = (notification: NotificationModel) => {
    const recipientId = notification.recipientId;
    
    if (!recipientId || recipientId === 'all') return '전체 사용자';
    
    // 그룹 알림인 경우
    if (recipientId === 'group') {
      const metadata = notification.metadata as any;
      if (metadata?.recipientIds) {
        const count = metadata.recipientCount || metadata.recipientIds.length;
        return `선택된 ${count}명`;
      }
      return '그룹';
    }
    
    const user = users.get(recipientId);
    if (user) {
      return `${user.fullName || user.email || recipientId}`;
    }
    // recipientId가 이메일 형식인 경우
    if (recipientId.includes('@')) {
      return recipientId;
    }
    return 'Unknown';
  };

  // 그룹 수신자 목록 가져오기
  const getGroupRecipients = (notification: NotificationModel) => {
    const metadata = notification.metadata as any;
    if (metadata?.recipientIds && Array.isArray(metadata.recipientIds)) {
      return metadata.recipientIds.map((id: string) => {
        const user = users.get(id);
        return user ? (user.fullName || user.email || id) : id;
      });
    }
    return [];
  };

  // 공지사항 발송
  const handleSendAnnouncement = async () => {
    if (!announcementForm.title || !announcementForm.message) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }

    try {
      await notificationService.send({
        type: announcementForm.priority === 'high' ? NotificationType.WARNING : NotificationType.INFO,
        title: `📢 ${announcementForm.pinned ? '[중요] ' : ''}${announcementForm.title}`,
        message: announcementForm.message,
        recipientId: 'all',
        sender: NotificationSender.OPERATOR,
        auto_close: !announcementForm.pinned,
        duration: announcementForm.pinned ? 0 : 10000,
        metadata: {
          isAnnouncement: true,
          priority: announcementForm.priority,
          pinned: announcementForm.pinned
        }
      });
      
      alert('공지사항이 발송되었습니다.');
      setShowAnnouncementModal(false);
      setAnnouncementForm({ title: '', message: '', priority: 'normal', pinned: false });
      loadNotifications();
    } catch (error) {
      console.error('Failed to send announcement:', error);
      alert('공지사항 발송에 실패했습니다.');
    }
  };

  // 타입별 아이콘 (통계와 일치)
  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.SUCCESS:
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case NotificationType.WARNING:
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case NotificationType.ERROR:
        return <XCircle className="w-5 h-5 text-red-600" />;
      case NotificationType.CUSTOM:
        return <Sparkles className="w-5 h-5 text-purple-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  // 타입별 배경색
  const getTypeBg = (type: NotificationType) => {
    switch (type) {
      case NotificationType.SUCCESS:
        return 'bg-green-50 border-green-200';
      case NotificationType.WARNING:
        return 'bg-yellow-50 border-yellow-200';
      case NotificationType.ERROR:
        return 'bg-red-50 border-red-200';
      case NotificationType.CUSTOM:
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  // 통계 계산
  const stats = {
    total: notifications.length,
    byType: {
      info: notifications.filter(n => n.type === NotificationType.INFO).length,
      success: notifications.filter(n => n.type === NotificationType.SUCCESS).length,
      warning: notifications.filter(n => n.type === NotificationType.WARNING).length,
      error: notifications.filter(n => n.type === NotificationType.ERROR).length,
      custom: notifications.filter(n => n.type === NotificationType.CUSTOM).length,
    },
    recipients: {
      all: notifications.filter(n => n.recipientId === 'all').length,
      individual: notifications.filter(n => n.recipientId !== 'all').length,
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">알림 발송 내역</h1>
          <button
            onClick={() => setShowAnnouncementModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2"
          >
            <Megaphone className="w-5 h-5" />
            공지사항 작성
          </button>
        </div>
        
        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">정보 알림</p>
                <p className="text-2xl font-bold text-blue-900">{stats.byType.info}</p>
              </div>
              <Info className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">성공 알림</p>
                <p className="text-2xl font-bold text-green-900">{stats.byType.success}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 font-medium">경고 알림</p>
                <p className="text-2xl font-bold text-yellow-900">{stats.byType.warning}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">전체 발송</p>
                <p className="text-2xl font-bold text-purple-900">{stats.recipients.all}</p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* 필터 */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setFilter('today')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'today' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              오늘
            </button>
            <button
              onClick={() => setFilter('week')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'week' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              일주일
            </button>
            <button
              onClick={() => setFilter('month')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'month' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              한달
            </button>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as NotificationType | 'all')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">모든 타입</option>
            <option value={NotificationType.INFO}>정보</option>
            <option value={NotificationType.SUCCESS}>성공</option>
            <option value={NotificationType.WARNING}>경고</option>
            <option value={NotificationType.ERROR}>오류</option>
            <option value={NotificationType.CUSTOM}>커스텀</option>
          </select>
        </div>

        {/* 알림 목록 */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              로딩 중...
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              발송된 알림이 없습니다.
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-y">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    타입
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    제목
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    수신자
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    발송 시간
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {notifications.map(notification => (
                  <tr key={notification.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        {getTypeIcon(notification.type)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900">
                          {notification.title}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {notification.message}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {notification.recipientId === 'all' ? (
                          <>
                            <Users className="w-4 h-4 text-purple-500" />
                            <span className="text-sm font-medium text-purple-700 bg-purple-50 px-2 py-1 rounded">전체 사용자</span>
                          </>
                        ) : notification.recipientId === 'group' ? (
                          <div className="relative">
                            <button
                              onClick={() => setExpandedGroupId(expandedGroupId === notification.id ? null : notification.id)}
                              className="flex items-center gap-2 hover:bg-gray-50 rounded px-2 py-1 transition-colors"
                            >
                              <Users className="w-4 h-4 text-green-500" />
                              <span className="text-sm font-medium text-green-700 bg-green-50 px-2 py-1 rounded">
                                {getRecipientName(notification)}
                              </span>
                              <ChevronDown className={`w-4 h-4 text-green-600 transition-transform ${expandedGroupId === notification.id ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {/* 툴팁 박스 */}
                            {expandedGroupId === notification.id && (
                              <div className="absolute z-10 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                                <div className="text-sm font-semibold text-gray-700 mb-2">수신자 목록:</div>
                                <div className="space-y-1 max-h-48 overflow-y-auto">
                                  {getGroupRecipients(notification).map((recipient, idx) => (
                                    <div key={idx} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded">
                                      <UserIcon className="w-3 h-3 text-gray-400" />
                                      <span className="text-xs text-gray-600">{recipient}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <UserIcon className="w-4 h-4 text-blue-500" />
                            <span className="text-sm text-gray-700">{getRecipientName(notification)}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-sm text-gray-900">
                            {notification.createdAt ? formatDateTime(notification.createdAt) : '-'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {notification.createdAt ? formatRelativeTime(notification.createdAt) : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {notification.readAt && (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                            읽음
                          </span>
                        )}
                        {notification.dismissedAt && (
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                            닫음
                          </span>
                        )}
                        {!notification.readAt && !notification.dismissedAt && (
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                            발송됨
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 공지사항 작성 모달 */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAnnouncementModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Megaphone className="w-6 h-6 text-purple-600" />
                공지사항 작성
              </h2>
              <button
                onClick={() => setShowAnnouncementModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  제목
                </label>
                <input
                  type="text"
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="공지사항 제목을 입력하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  내용
                </label>
                <textarea
                  value={announcementForm.message}
                  onChange={(e) => setAnnouncementForm(prev => ({ ...prev, message: e.target.value }))}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="공지사항 내용을 입력하세요"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    중요도
                  </label>
                  <select
                    value={announcementForm.priority}
                    onChange={(e) => setAnnouncementForm(prev => ({ ...prev, priority: e.target.value as 'low' | 'normal' | 'high' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="low">낮음</option>
                    <option value="normal">보통</option>
                    <option value="high">높음</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="pinned"
                    checked={announcementForm.pinned}
                    onChange={(e) => setAnnouncementForm(prev => ({ ...prev, pinned: e.target.checked }))}
                    className="mr-2"
                  />
                  <label htmlFor="pinned" className="text-sm font-medium text-gray-700">
                    상단 고정 (자동 닫기 비활성화)
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAnnouncementModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSendAnnouncement}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                발송
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import { 
  NotificationService,
  NotificationModel,
  CreateNotificationDto,
  NotificationFilter,
  NotificationStats,
  NotificationType
} from '@/core/models/Notification';
import { EventEmitter } from '@/core/utils/EventEmitter';

type NotificationEvents = {
  [key: string]: any;
};

export class ApiNotificationService implements NotificationService {
  private static instance: ApiNotificationService;
  private apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
  private eventEmitter = new EventEmitter<NotificationEvents>();
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastFetchTime: Date = new Date();

  private constructor() {
    // 로그인 상태일 때만 폴링 시작
    if (this.isAuthenticated()) {
      this.startPolling();
    }
  }

  static getInstance(): ApiNotificationService {
    if (!ApiNotificationService.instance) {
      ApiNotificationService.instance = new ApiNotificationService();
    }
    return ApiNotificationService.instance;
  }

  private isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  public startPolling(): void {
    // 이미 폴링 중이면 중복 시작 방지
    if (this.pollingInterval) {
      return;
    }

    // 로그인하지 않은 상태면 폴링하지 않음
    if (!this.isAuthenticated()) {
      return;
    }

    // 운영자는 알림 폴링하지 않음
    const userDataStr = localStorage.getItem('user');
    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        if (userData.role === 'operator') {
          return;
        }
      } catch (error) {
        console.error('User data parsing error:', error);
      }
    }

    // 5초마다 새로운 알림 체크
    this.pollingInterval = setInterval(async () => {
      // 매번 인증 상태 체크
      if (!this.isAuthenticated()) {
        this.stopPolling();
        return;
      }

      // 운영자는 알림 폴링하지 않음
      const userDataStr = localStorage.getItem('user');
      if (userDataStr) {
        try {
          const userData = JSON.parse(userDataStr);
          if (userData.role === 'operator') {
            this.stopPolling();
            return;
          }
        } catch (error) {
          console.error('User data parsing error:', error);
        }
      }

      try {
        const response = await fetch(`${this.apiUrl}/notifications?isRead=false`, {
          headers: this.getAuthHeaders()
        });

        if (response.status === 401) {
          // 인증 실패 시 폴링 중지
          this.stopPolling();
          return;
        }

        if (response.ok) {
          const data = await response.json();
          const notifications = data.notifications || [];
          
          // 마지막 체크 이후의 새 알림만 필터링
          const newNotifications = notifications.filter((n: any) => 
            new Date(n.created_at) > this.lastFetchTime
          );

          // 새 알림이 있으면 이벤트 발생
          newNotifications.forEach((notification: NotificationModel) => {
            if (notification.recipientId === 'all') {
              this.eventEmitter.emit('notification:all', notification);
            } else {
              this.eventEmitter.emit(`notification:${notification.recipientId}`, notification);
            }
          });

          if (newNotifications.length > 0) {
            this.lastFetchTime = new Date();
          }
        }
      } catch (error) {
        // 폴링 오류 무시
      }
    }, 5000);
  }

  public stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  async send(notification: CreateNotificationDto): Promise<NotificationModel> {
    try {
      
      const response = await fetch(`${this.apiUrl}/notifications`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(notification)
      });

      if (!response.ok) {
        throw new Error('Failed to send notification');
      }

      const data = await response.json();
      return data.notification || data;
    } catch (error) {
      throw error;
    }
  }

  async getNotifications(filter?: NotificationFilter): Promise<NotificationModel[]> {
    try {
      const params = new URLSearchParams();
      
      if (filter) {
        if (filter.type) params.append('type', filter.type);
        if (filter.isRead !== undefined) params.append('isRead', String(filter.isRead));
        if (filter.limit) params.append('limit', String(filter.limit));
      }

      const response = await fetch(`${this.apiUrl}/notifications?${params}`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      
      // 서버 응답을 NotificationModel 형식으로 변환
      const notifications = (data.notifications || []).map((n: any) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        sender: n.sender,
        recipientId: n.recipient_id,
        createdAt: new Date(n.created_at),
        readAt: n.read_at ? new Date(n.read_at) : null,
        dismissedAt: n.dismissed_at ? new Date(n.dismissed_at) : null,
        priority: n.priority,
        autoClose: n.auto_close,
        duration: n.duration,
        icon: n.icon,
        metadata: n.metadata // metadata 필드 추가
      }));
      
      return notifications;
    } catch (error) {
      return [];
    }
  }

  async getNotification(id: string): Promise<NotificationModel | null> {
    try {
      const response = await fetch(`${this.apiUrl}/notifications/${id}`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.notification || null;
    } catch (error) {
      return null;
    }
  }

  async markAsRead(id: string): Promise<void> {
    try {
      // 바로 읽음 처리 시도 (404는 정상 케이스로 처리)
      const response = await fetch(`${this.apiUrl}/notifications/${id}/read`, {
        method: 'PUT',
        headers: this.getAuthHeaders()
      });

      // 404는 이미 삭제된 알림이므로 정상 처리
      if (!response.ok && response.status !== 404) {
        // 404가 아닌 다른 에러만 처리
        const error = await response.json();
        throw new Error(error.error || 'Failed to mark as read');
      }
    } catch (error) {
      // 네트워크 에러나 다른 오류는 조용히 무시
      // console.error는 제거하여 콘솔을 깨끗하게 유지
    }
  }

  async dismiss(id: string): Promise<void> {
    // API에서는 dismiss를 별도로 구현하지 않았으므로 읽음 처리로 대체
    await this.markAsRead(id);
  }

  async markAllAsRead(recipientId: string): Promise<void> {
    try {
      await fetch(`${this.apiUrl}/notifications/mark-all-read`, {
        method: 'PUT',
        headers: this.getAuthHeaders()
      });
    } catch (error) {
      // 오류 무시
    }
  }

  async deleteNotification(id: string): Promise<void> {
    try {
      await fetch(`${this.apiUrl}/notifications/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
    } catch (error) {
      // 오류 무시
    }
  }

  async getStats(recipientId: string): Promise<NotificationStats> {
    try {
      const response = await fetch(`${this.apiUrl}/notifications/unread-count`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      const unreadCount = data.count || 0;

      // 전체 통계는 별도 API 호출로 가져올 수 있지만, 지금은 간단히 처리
      return {
        total: 0,
        unread: unreadCount,
        byType: {
          [NotificationType.INFO]: 0,
          [NotificationType.SUCCESS]: 0,
          [NotificationType.WARNING]: 0,
          [NotificationType.ERROR]: 0,
          [NotificationType.CUSTOM]: 0
        }
      };
    } catch (error) {
      return {
        total: 0,
        unread: 0,
        byType: {
          [NotificationType.INFO]: 0,
          [NotificationType.SUCCESS]: 0,
          [NotificationType.WARNING]: 0,
          [NotificationType.ERROR]: 0,
          [NotificationType.CUSTOM]: 0
        }
      };
    }
  }

  subscribe(recipientId: string, callback: (notification: NotificationModel) => void): () => void {
    // 개인 알림 구독
    const personalUnsubscribe = this.eventEmitter.on(`notification:${recipientId}`, callback);
    
    // 전체 알림 구독
    const allUnsubscribe = this.eventEmitter.on('notification:all', callback);

    // 구독 해제 함수
    return () => {
      personalUnsubscribe();
      allUnsubscribe();
    };
  }

  async sendSystemNotification(
    recipientId: string | 'all',
    type: NotificationType,
    title: string,
    message: string
  ): Promise<void> {
    await this.send({
      type,
      title,
      message,
      recipientId,
      sender: 'system',
      autoClose: type === NotificationType.INFO || type === NotificationType.SUCCESS,
      duration: type === NotificationType.ERROR ? 10000 : 5000,
      priority: type === NotificationType.ERROR ? 'high' : 'normal'
    });
  }

  // 관리자용: 모든 알림 내역 조회
  async getAllNotifications(filter?: any): Promise<NotificationModel[]> {
    try {
      const params = new URLSearchParams();
      
      if (filter) {
        if (filter.sender) params.append('sender', filter.sender);
        if (filter.type) params.append('type', filter.type);
        if (filter.fromDate) params.append('fromDate', filter.fromDate.toISOString());
        if (filter.toDate) params.append('toDate', filter.toDate.toISOString());
        if (filter.limit) params.append('limit', String(filter.limit));
      }

      const response = await fetch(`${this.apiUrl}/notifications/all?${params}`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch all notifications');
      }

      const data = await response.json();
      
      // 서버 응답을 NotificationModel 형식으로 변환
      const notifications = (data.notifications || []).map((n: any) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        sender: n.sender,
        recipientId: n.recipient_id,
        createdAt: new Date(n.created_at),
        readAt: n.read_at ? new Date(n.read_at) : null,
        dismissedAt: n.dismissed_at ? new Date(n.dismissed_at) : null,
        priority: n.priority,
        autoClose: n.auto_close,
        duration: n.duration,
        icon: n.icon,
        metadata: n.metadata // metadata 필드 추가
      }));
      
      return notifications;
    } catch (error) {
      return [];
    }
  }

  // 클린업
  destroy(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}
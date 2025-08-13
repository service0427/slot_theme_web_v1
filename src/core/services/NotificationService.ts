import { 
  NotificationModel, 
  CreateNotificationDto, 
  NotificationFilter,
  NotificationStats,
  NotificationType,
  NotificationSender 
} from '../models/Notification';
import { EventEmitter } from '../utils/EventEmitter';

// 알림 이벤트 타입 정의
type NotificationEvents = {
  [key: string]: any;
};

export interface NotificationService {
  // 알림 발송
  send(notification: CreateNotificationDto): Promise<NotificationModel>;
  
  // 알림 목록 조회
  getNotifications(filter?: NotificationFilter): Promise<NotificationModel[]>;
  
  // 특정 알림 조회
  getNotification(id: string): Promise<NotificationModel | null>;
  
  // 알림 읽음 처리
  markAsRead(id: string): Promise<void>;
  
  // 알림 닫기 (dismiss)
  dismiss(id: string): Promise<void>;
  
  // 모든 알림 읽음 처리
  markAllAsRead(recipientId: string): Promise<void>;
  
  // 알림 삭제
  deleteNotification(id: string): Promise<void>;
  
  // 알림 통계
  getStats(recipientId: string): Promise<NotificationStats>;
  
  // 실시간 알림 구독
  subscribe(recipientId: string, callback: (notification: NotificationModel) => void): () => void;
  
  // 시스템 알림 발송 헬퍼
  sendSystemNotification(
    recipientId: string | 'all',
    type: NotificationType,
    title: string,
    message: string
  ): Promise<void>;
}

// Mock 구현 (나중에 실제 API로 교체)
export class MockNotificationService implements NotificationService {
  private static instance: MockNotificationService;
  private notifications: Map<string, NotificationModel> = new Map();
  private eventEmitter = new EventEmitter<NotificationEvents>();
  private nextId = 1;
  private storageKey = 'mock_notifications';
  private storageEventKey = 'notification_event';

  constructor() {
    // localStorage에서 기존 알림 로드
    this.loadFromStorage();
    
    // 다른 탭/창에서의 알림 수신을 위한 storage 이벤트 리스너
    window.addEventListener('storage', this.handleStorageEvent.bind(this));
  }

  // 싱글톤 패턴 적용
  static getInstance(): MockNotificationService {
    if (!MockNotificationService.instance) {
      MockNotificationService.instance = new MockNotificationService();
    }
    return MockNotificationService.instance;
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.notifications.clear();
        data.forEach((n: any) => {
          n.createdAt = new Date(n.createdAt);
          if (n.readAt) n.readAt = new Date(n.readAt);
          if (n.dismissedAt) n.dismissedAt = new Date(n.dismissedAt);
          this.notifications.set(n.id, n);
        });
        // 가장 큰 ID 찾기
        const ids = Array.from(this.notifications.keys())
          .map(id => parseInt(id.replace('notif_', '')))
          .filter(n => !isNaN(n));
        if (ids.length > 0) {
          this.nextId = Math.max(...ids) + 1;
        }
      }
    } catch (error) {
      console.error('Failed to load notifications from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const data = Array.from(this.notifications.values());
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save notifications to storage:', error);
    }
  }

  private handleStorageEvent(event: StorageEvent): void {
    if (event.key === this.storageEventKey && event.newValue) {
      try {
        const notification = JSON.parse(event.newValue);
        notification.createdAt = new Date(notification.createdAt);
        
        console.log('[NotificationService] Storage 이벤트로 알림 수신:', notification);
        
        // 로컬 맵에 추가
        this.notifications.set(notification.id, notification);
        
        // 구독자들에게 알림
        if (notification.recipientId === 'all') {
          this.eventEmitter.emit('notification:all', notification);
        } else {
          this.eventEmitter.emit(`notification:${notification.recipientId}`, notification);
        }
      } catch (error) {
        console.error('Failed to handle storage event:', error);
      }
    } else if (event.key === this.storageKey) {
      // 전체 알림 목록이 변경된 경우 다시 로드
      this.loadFromStorage();
    }
  }

  async send(dto: CreateNotificationDto): Promise<NotificationModel> {
    const notification: NotificationModel = {
      id: `notif_${this.nextId++}`,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      sender: dto.sender || NotificationSender.SYSTEM, // dto의 sender 사용
      recipientId: dto.recipientId,
      autoClose: dto.autoClose ?? true,
      duration: dto.duration ?? 5000,
      actions: dto.actions,
      priority: dto.priority ?? 'normal',
      icon: dto.icon,
      createdAt: new Date()
    };

    console.log('[NotificationService] 알림 발송:', notification);
    this.notifications.set(notification.id, notification);
    
    // localStorage에 저장
    this.saveToStorage();
    
    // 다른 탭/창에 알림 전파
    localStorage.setItem(this.storageEventKey, JSON.stringify(notification));
    setTimeout(() => localStorage.removeItem(this.storageEventKey), 100);
    
    console.log('[NotificationService] 저장된 알림 수:', this.notifications.size);

    // 실시간 알림 이벤트 발생
    if (dto.recipientId === 'all') {
      console.log('[NotificationService] 전체 알림 이벤트 발생');
      this.eventEmitter.emit('notification:all', notification);
    } else {
      console.log(`[NotificationService] 개인 알림 이벤트 발생: notification:${dto.recipientId}`);
      this.eventEmitter.emit(`notification:${dto.recipientId}`, notification);
    }

    return notification;
  }

  async getNotifications(filter?: NotificationFilter): Promise<NotificationModel[]> {
    let notifications = Array.from(this.notifications.values());
    console.log('[NotificationService] getNotifications - 전체 알림 수:', notifications.length);
    console.log('[NotificationService] getNotifications - 필터:', filter);

    if (filter) {
      if (filter.recipientId) {
        notifications = notifications.filter(n => 
          n.recipientId === filter.recipientId || n.recipientId === 'all'
        );
        console.log(`[NotificationService] recipientId 필터 후 알림 수: ${notifications.length}`);
      }
      if (filter.type) {
        notifications = notifications.filter(n => n.type === filter.type);
      }
      if (filter.sender) {
        notifications = notifications.filter(n => n.sender === filter.sender);
      }
      if (filter.isRead !== undefined) {
        notifications = notifications.filter(n => 
          filter.isRead ? n.readAt !== undefined : n.readAt === undefined
        );
      }
      if (filter.fromDate) {
        notifications = notifications.filter(n => n.createdAt >= filter.fromDate!);
      }
      if (filter.toDate) {
        notifications = notifications.filter(n => n.createdAt <= filter.toDate!);
      }
    }

    // 최신순 정렬
    notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (filter?.limit) {
      notifications = notifications.slice(0, filter.limit);
    }

    return notifications;
  }

  async getNotification(id: string): Promise<NotificationModel | null> {
    return this.notifications.get(id) || null;
  }

  async markAsRead(id: string): Promise<void> {
    const notification = this.notifications.get(id);
    if (notification && !notification.readAt) {
      notification.readAt = new Date();
      this.saveToStorage(); // localStorage에 저장
      this.eventEmitter.emit(`notification:read:${notification.recipientId}`, notification);
    }
  }

  async dismiss(id: string): Promise<void> {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.dismissedAt = new Date();
      this.saveToStorage(); // localStorage에 저장
      this.eventEmitter.emit(`notification:dismissed:${notification.recipientId}`, notification);
    }
  }

  async markAllAsRead(recipientId: string): Promise<void> {
    this.notifications.forEach(notification => {
      if ((notification.recipientId === recipientId || notification.recipientId === 'all') 
          && !notification.readAt) {
        notification.readAt = new Date();
      }
    });
    this.saveToStorage(); // localStorage에 저장
    this.eventEmitter.emit(`notification:allRead:${recipientId}`, null);
  }

  async deleteNotification(id: string): Promise<void> {
    const notification = this.notifications.get(id);
    if (notification) {
      this.notifications.delete(id);
      this.saveToStorage(); // localStorage에 저장
      this.eventEmitter.emit(`notification:deleted:${notification.recipientId}`, notification);
    }
  }

  async getStats(recipientId: string): Promise<NotificationStats> {
    const userNotifications = await this.getNotifications({ recipientId });
    
    const stats: NotificationStats = {
      total: userNotifications.length,
      unread: userNotifications.filter(n => !n.readAt).length,
      byType: {
        [NotificationType.INFO]: 0,
        [NotificationType.SUCCESS]: 0,
        [NotificationType.WARNING]: 0,
        [NotificationType.ERROR]: 0,
        [NotificationType.CUSTOM]: 0
      }
    };

    userNotifications.forEach(n => {
      stats.byType[n.type]++;
    });

    return stats;
  }

  subscribe(recipientId: string, callback: (notification: NotificationModel) => void): () => void {
    console.log(`[NotificationService] 구독 시작: ${recipientId}`);
    
    // 개인 알림 구독
    const personalUnsubscribe = this.eventEmitter.on(`notification:${recipientId}`, (notification) => {
      console.log(`[NotificationService] 개인 알림 콜백 실행: ${recipientId}`, notification);
      callback(notification);
    });

    // 전체 알림 구독
    const allUnsubscribe = this.eventEmitter.on('notification:all', (notification) => {
      console.log(`[NotificationService] 전체 알림 콜백 실행: ${recipientId}`, notification);
      callback(notification);
    });

    // 구독 해제 함수
    return () => {
      console.log(`[NotificationService] 구독 해제: ${recipientId}`);
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
      autoClose: type === NotificationType.INFO || type === NotificationType.SUCCESS,
      duration: type === NotificationType.ERROR ? 10000 : 5000,
      priority: type === NotificationType.ERROR ? 'high' : 'normal'
    });
  }

  // 테스트용 메서드
  generateTestNotifications(recipientId: string, count: number = 5): void {
    const types = Object.values(NotificationType);
    const titles = [
      '슬롯 승인 완료',
      '캐시 충전 완료',
      '새로운 메시지',
      '시스템 점검 안내',
      '이벤트 당첨'
    ];
    const messages = [
      '요청하신 슬롯이 승인되었습니다.',
      '50,000원이 충전되었습니다.',
      '운영자로부터 새로운 메시지가 도착했습니다.',
      '오늘 오후 2시부터 30분간 시스템 점검이 예정되어 있습니다.',
      '축하합니다! 이벤트에 당첨되셨습니다.'
    ];

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        this.send({
          type: types[i % types.length],
          title: titles[i % titles.length],
          message: messages[i % messages.length],
          recipientId,
          autoClose: i % 2 === 0,
          duration: 5000 + (i * 1000),
          actions: i % 3 === 0 ? [
            { label: '확인', action: () => console.log('확인 클릭'), style: 'primary' },
            { label: '취소', action: () => console.log('취소 클릭'), style: 'secondary' }
          ] : undefined
        });
      }, i * 2000); // 2초 간격으로 발송
    }
  }
}
// 알림 타입
export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  CUSTOM = 'custom'
}

// 알림 발송자 타입
export enum NotificationSender {
  SYSTEM = 'system',
  OPERATOR = 'operator'
}

// 알림 액션 (버튼)
export interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

// 알림 모델
export interface NotificationModel {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  sender: NotificationSender | string; // system, operator, 또는 특정 사용자 ID
  recipientId: string | 'all'; // 특정 사용자 ID 또는 전체
  autoClose: boolean; // 자동 닫힘 여부
  duration?: number; // 자동 닫힘 시간 (ms)
  actions?: NotificationAction[]; // 액션 버튼들
  priority?: 'low' | 'normal' | 'high'; // 우선순위
  icon?: string; // 커스텀 아이콘
  metadata?: { // 추가 메타데이터
    isAnnouncement?: boolean;
    pinned?: boolean;
    [key: string]: any;
  };
  createdAt: Date;
  readAt?: Date;
  dismissedAt?: Date; // 사용자가 닫은 시간
}

// 알림 생성 DTO
export interface CreateNotificationDto {
  type: NotificationType;
  title: string;
  message: string;
  recipientId: string | string[] | 'all';  // 배열도 허용
  sender?: NotificationSender | string; // 발송자 정보 추가
  autoClose?: boolean;
  duration?: number;
  actions?: NotificationAction[];
  priority?: 'low' | 'normal' | 'high';
  icon?: string;
  metadata?: { // 추가 메타데이터
    isAnnouncement?: boolean;
    pinned?: boolean;
    [key: string]: any;
  };
}

// 알림 목록 필터
export interface NotificationFilter {
  recipientId?: string;
  type?: NotificationType;
  sender?: string;
  isRead?: boolean;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
}

// 알림 통계
export interface NotificationStats {
  total: number;
  unread: number;
  byType: {
    [key in NotificationType]: number;
  };
}
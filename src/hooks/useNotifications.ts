import { useState, useEffect, useCallback } from 'react';
import { NotificationModel, NotificationFilter } from '@/core/models/Notification';
import { ApiNotificationService } from '@/adapters/services/ApiNotificationService';
import { useAuthContext } from '@/adapters/react';
import { socketService } from '@/services/socketService';

// 싱글톤 서비스 인스턴스 - API 서비스 사용
const notificationService = ApiNotificationService.getInstance();

export const useNotifications = () => {
  const { user } = useAuthContext();
  const [notifications, setNotifications] = useState<NotificationModel[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [shownNotificationIds, setShownNotificationIds] = useState<Set<string>>(new Set());

  // 알림 목록 로드
  const loadNotifications = useCallback(async (filter?: NotificationFilter) => {
    if (!user?.id) return;
    
    // 운영자는 알림을 로드하지 않음
    if (user.role === 'operator') {
      setNotifications([]);
      setUnreadCount(0);
      // 폴링도 중지
      notificationService.stopPolling();
      return;
    }
    
    setIsLoading(true);
    try {
      const userFilter: NotificationFilter = {
        recipientId: user.id,
        ...filter
      };
      const result = await notificationService.getNotifications(userFilter);
      
      // localStorage에서 이미 표시된 알림 ID 가져오기 (state 대신 직접 읽기)
      const storedIds = localStorage.getItem(`shown_notifications_${user.id}`);
      const shownIds = storedIds ? new Set(JSON.parse(storedIds)) : new Set();
      
      // 이미 표시된 알림은 dismissed 상태로 설정
      // 읽은 알림은 자동으로 dismissed 처리
      const processedNotifications = result.map(n => ({
        ...n,
        dismissedAt: n.readAt ? new Date() : n.dismissedAt
      }));
      
      setNotifications(processedNotifications);
      
      // 읽지 않은 알림 개수 계산
      const unread = processedNotifications.filter(n => !n.readAt).length;
      setUnreadCount(unread);
    } catch (error) {
      // 오류 발생 시 조용히 처리
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // 초기 로드 및 이미 표시된 알림 ID 복원
  useEffect(() => {
    if (user?.id) {
      // 운영자는 알림을 로드하지 않음
      if (user.role === 'operator') {
        setNotifications([]);
        setUnreadCount(0);
        // 폴링도 중지
        notificationService.stopPolling();
        return;
      }
      
      // localStorage에서 이미 표시된 알림 ID 복원
      const storedIds = localStorage.getItem(`shown_notifications_${user.id}`);
      if (storedIds) {
        try {
          const ids = JSON.parse(storedIds);
          setShownNotificationIds(new Set(ids));
        } catch (e) {
          // 파싱 오류 무시
        }
      }
      
      loadNotifications();
    }
  }, [user?.id, user?.role, loadNotifications]);

  // 알림음 재생 함수를 먼저 정의
  const playNotificationSound = useCallback(() => {
    try {
      // Web Audio API를 사용한 간단한 알림음
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      // 알림음 재생 실패는 조용히 무시
    }
  }, []);

  // WebSocket 연결 및 실시간 알림 구독
  useEffect(() => {
    if (!user?.id) {
      socketService.disconnect();
      return;
    }
    
    // 운영자는 실시간 알림 구독하지 않음
    if (user.role === 'operator') {
      return;
    }
    
    // WebSocket 연결
    socketService.connect(user.id);

    // 실시간 알림 수신 리스너 등록
    socketService.onNewNotification((newNotification) => {
      
      // NotificationModel 형식으로 변환
      const notification: NotificationModel = {
        id: newNotification.id,
        type: newNotification.type,
        title: newNotification.title,
        message: newNotification.message,
        sender: newNotification.sender,
        recipientId: newNotification.recipient_id,
        createdAt: new Date(newNotification.created_at),
        readAt: newNotification.read_at ? new Date(newNotification.read_at) : null,
        dismissedAt: newNotification.dismissed_at ? new Date(newNotification.dismissed_at) : null,
        priority: newNotification.priority,
        autoClose: newNotification.auto_close,
        duration: newNotification.duration,
        icon: newNotification.icon
      };

      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // 새로운 알림을 표시된 알림 목록에 추가
      setShownNotificationIds(prev => {
        const newSet = new Set(prev);
        newSet.add(notification.id);
        // localStorage에 저장
        localStorage.setItem(`shown_notifications_${user.id}`, JSON.stringify(Array.from(newSet)));
        return newSet;
      });
      
      // 알림음 재생
      playNotificationSound();
    });

    return () => {
      socketService.offNewNotification();
      socketService.disconnect();
    };
  }, [user?.id, playNotificationSound]);

  // 알림 읽음 처리
  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev =>
        prev.map(n =>
          n.id === id ? { ...n, readAt: new Date(), dismissedAt: new Date() } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      // 오류 무시
    }
  }, []);

  // 알림 닫기
  const dismiss = useCallback(async (id: string) => {
    // 먼저 UI에서 제거
    setNotifications(prev =>
      prev.map(n =>
        n.id === id ? { ...n, dismissedAt: new Date() } : n
      )
    );
    
    // 표시된 알림 목록에 추가
    setShownNotificationIds(prev => {
      const newSet = new Set(prev);
      newSet.add(id);
      // localStorage에 저장
      if (user?.id) {
        localStorage.setItem(`shown_notifications_${user.id}`, JSON.stringify(Array.from(newSet)));
      }
      return newSet;
    });
    
    // API 호출은 백그라운드에서 조용히 처리 (에러 무시)
    notificationService.dismiss(id).catch(() => {
      // 404 등의 오류는 무시
    });
  }, [user?.id]);

  // 모든 알림 읽음 처리
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      await notificationService.markAllAsRead(user.id);
      setNotifications(prev =>
        prev.map(n => ({ ...n, readAt: n.readAt || new Date(), dismissedAt: n.dismissedAt || new Date() }))
      );
      setUnreadCount(0);
    } catch (error) {
      // 오류 무시
    }
  }, [user?.id]);

  // 알림 삭제
  const deleteNotification = useCallback(async (id: string) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      const notification = notifications.find(n => n.id === id);
      if (notification && !notification.readAt) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      // 오류 무시
    }
  }, [notifications]);

  // 액션 실행
  const executeAction = useCallback(async (notificationId: string, actionIndex: number) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification?.actions && notification.actions[actionIndex]) {
      try {
        notification.actions[actionIndex].action();
        // 액션 실행 후 읽음 처리
        await markAsRead(notificationId);
      } catch (error) {
        // 액션 실행 오류 무시
      }
    }
  }, [notifications, markAsRead]);

  // 테스트용 알림 생성
  const generateTestNotifications = useCallback(() => {
    if (user?.id) {
      notificationService.generateTestNotifications(user.id);
    }
  }, [user?.id]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    dismiss,
    markAllAsRead,
    deleteNotification,
    executeAction,
    loadNotifications,
    generateTestNotifications
  };
};
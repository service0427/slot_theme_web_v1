import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private userId: string | null = null;

  connect(userId: string): void {
    if (this.socket?.connected) {
      return;
    }

    this.userId = userId;
    const socketUrl = import.meta.env.VITE_SITE_URL || 'http://localhost:8001';
    this.socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling']  // polling도 허용
    });

    this.socket.on('connect', () => {
      // 사용자별 룸에 참여
      this.socket?.emit('join_user_room', userId);
    });

    this.socket.on('disconnect', () => {
      // 연결 해제 처리
    });

    this.socket.on('connect_error', (error) => {
      // 연결 오류 무시
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.userId = null;
    }
  }

  // 새로운 알림 수신 리스너 등록
  onNewNotification(callback: (notification: any) => void): void {
    if (this.socket) {
      this.socket.on('new_notification', callback);
    }
  }

  // 새로운 알림 수신 리스너 제거
  offNewNotification(): void {
    if (this.socket) {
      this.socket.off('new_notification');
    }
  }

  // 연결 상태 확인
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // 사용자 ID 가져오기
  getUserId(): string | null {
    return this.userId;
  }
}

export const socketService = new SocketService();
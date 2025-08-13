import { MockNotificationService, NotificationService } from './NotificationService';
import { NotificationType } from '../models/Notification';

export class AutoNotificationService {
  private notificationService: NotificationService;

  constructor(notificationService?: NotificationService) {
    this.notificationService = notificationService || new MockNotificationService();
  }

  // 슬롯 관련 자동 알림
  async onSlotRegistered(userId: string, slotData: { title: string; price: number }) {
    await this.notificationService.send({
      type: NotificationType.INFO,
      title: '슬롯 등록 완료',
      message: `"${slotData.title}" 슬롯이 등록되었습니다. 승인 대기 중입니다.`,
      recipientId: userId,
      autoClose: true,
      duration: 5000,
      priority: 'normal'
    });
  }

  async onSlotApproved(userId: string, slotData: { title: string; approvedPrice: number }) {
    await this.notificationService.send({
      type: NotificationType.SUCCESS,
      title: '🎉 슬롯 승인 완료!',
      message: `"${slotData.title}" 슬롯이 승인되었습니다. 승인 가격: ${slotData.approvedPrice.toLocaleString()}원`,
      recipientId: userId,
      autoClose: false,
      priority: 'high',
      actions: [
        {
          label: '확인',
          action: () => console.log('슬롯 승인 확인'),
          style: 'primary'
        }
      ]
    });
  }

  async onSlotRejected(userId: string, slotData: { title: string; rejectionReason?: string }) {
    await this.notificationService.send({
      type: NotificationType.WARNING,
      title: '슬롯 승인 거절',
      message: `"${slotData.title}" 슬롯이 거절되었습니다.${slotData.rejectionReason ? ` 사유: ${slotData.rejectionReason}` : ''}`,
      recipientId: userId,
      autoClose: false,
      priority: 'high',
      actions: [
        {
          label: '재등록',
          action: () => console.log('슬롯 재등록'),
          style: 'primary'
        },
        {
          label: '확인',
          action: () => console.log('거절 확인'),
          style: 'secondary'
        }
      ]
    });
  }

  // 캐시 관련 자동 알림
  async onCashChargeRequested(userId: string, amount: number) {
    await this.notificationService.send({
      type: NotificationType.INFO,
      title: '캐시 충전 요청 완료',
      message: `${amount.toLocaleString()}원 충전 요청이 접수되었습니다. 승인 대기 중입니다.`,
      recipientId: userId,
      autoClose: true,
      duration: 5000,
      priority: 'normal'
    });
  }

  async onCashChargeApproved(userId: string, amount: number) {
    await this.notificationService.send({
      type: NotificationType.SUCCESS,
      title: '💰 캐시 충전 완료!',
      message: `${amount.toLocaleString()}원이 성공적으로 충전되었습니다.`,
      recipientId: userId,
      autoClose: false,
      priority: 'high',
      icon: '💰'
    });
  }

  async onCashChargeRejected(userId: string, amount: number, reason?: string) {
    await this.notificationService.send({
      type: NotificationType.ERROR,
      title: '캐시 충전 거절',
      message: `${amount.toLocaleString()}원 충전 요청이 거절되었습니다.${reason ? ` 사유: ${reason}` : ''}`,
      recipientId: userId,
      autoClose: false,
      priority: 'high',
      actions: [
        {
          label: '다시 시도',
          action: () => console.log('캐시 충전 재시도'),
          style: 'primary'
        },
        {
          label: '확인',
          action: () => console.log('거절 확인'),
          style: 'secondary'
        }
      ]
    });
  }

  // 채팅 관련 자동 알림
  async onNewChatMessage(userId: string, fromUser: string, roomName?: string) {
    await this.notificationService.send({
      type: NotificationType.INFO,
      title: '💬 새로운 메시지',
      message: `${fromUser}님이 ${roomName ? `${roomName}에서` : ''} 메시지를 보냈습니다.`,
      recipientId: userId,
      autoClose: true,
      duration: 3000,
      priority: 'normal',
      icon: '💬'
    });
  }

  async onChatRoomCreated(userId: string, roomName: string) {
    await this.notificationService.send({
      type: NotificationType.SUCCESS,
      title: '채팅방 생성 완료',
      message: `"${roomName}" 채팅방이 생성되었습니다.`,
      recipientId: userId,
      autoClose: true,
      duration: 5000,
      priority: 'normal'
    });
  }

  // 시스템 관련 자동 알림
  async onSystemMaintenance(message: string = '시스템 점검이 예정되어 있습니다.') {
    await this.notificationService.send({
      type: NotificationType.WARNING,
      title: '🔧 시스템 점검 안내',
      message,
      recipientId: 'all',
      autoClose: false,
      priority: 'high',
      icon: '🔧'
    });
  }

  async onSystemUpdate(version: string, features: string[] = []) {
    const featureText = features.length > 0 ? `\n새로운 기능: ${features.join(', ')}` : '';
    await this.notificationService.send({
      type: NotificationType.INFO,
      title: `🚀 시스템 업데이트 (v${version})`,
      message: `시스템이 업데이트되었습니다.${featureText}`,
      recipientId: 'all',
      autoClose: false,
      priority: 'normal',
      icon: '🚀'
    });
  }

  async onSecurityAlert(userId: string | 'all', alertType: 'login' | 'password' | 'suspicious', details?: string) {
    const titles = {
      login: '🔐 새로운 로그인 감지',
      password: '🔑 비밀번호 변경 요청',
      suspicious: '⚠️ 의심스러운 활동 감지'
    };

    const messages = {
      login: '새로운 위치에서 로그인이 감지되었습니다.',
      password: '비밀번호 변경이 요청되었습니다. 본인이 아닌 경우 즉시 연락하세요.',
      suspicious: '계정에서 의심스러운 활동이 감지되었습니다.'
    };

    await this.notificationService.send({
      type: NotificationType.ERROR,
      title: titles[alertType],
      message: `${messages[alertType]}${details ? ` ${details}` : ''}`,
      recipientId: userId,
      autoClose: false,
      priority: 'high',
      actions: [
        {
          label: '확인',
          action: () => console.log('보안 알림 확인'),
          style: 'primary'
        },
        {
          label: '신고',
          action: () => console.log('보안 문제 신고'),
          style: 'danger'
        }
      ]
    });
  }

  // 이벤트 관련 자동 알림
  async onEventStart(eventName: string, description: string) {
    await this.notificationService.send({
      type: NotificationType.CUSTOM,
      title: `🎉 ${eventName} 시작!`,
      message: description,
      recipientId: 'all',
      autoClose: false,
      priority: 'normal',
      icon: '🎉',
      actions: [
        {
          label: '참여하기',
          action: () => console.log('이벤트 참여'),
          style: 'primary'
        }
      ]
    });
  }

  async onEventWin(userId: string, eventName: string, prize: string) {
    await this.notificationService.send({
      type: NotificationType.SUCCESS,
      title: '🏆 이벤트 당첨!',
      message: `축하합니다! "${eventName}"에서 "${prize}"에 당첨되셨습니다!`,
      recipientId: userId,
      autoClose: false,
      priority: 'high',
      icon: '🏆',
      actions: [
        {
          label: '상품 확인',
          action: () => console.log('상품 확인'),
          style: 'primary'
        }
      ]
    });
  }

  // 사용자 레벨/등급 관련 알림
  async onLevelUp(userId: string, newLevel: number, benefits?: string[]) {
    const benefitText = benefits && benefits.length > 0 ? `\n혜택: ${benefits.join(', ')}` : '';
    await this.notificationService.send({
      type: NotificationType.SUCCESS,
      title: '⭐ 레벨 업!',
      message: `축하합니다! 레벨 ${newLevel}로 승급하셨습니다!${benefitText}`,
      recipientId: userId,
      autoClose: false,
      priority: 'normal',
      icon: '⭐'
    });
  }

  async onVipUpgrade(userId: string, vipLevel: string) {
    await this.notificationService.send({
      type: NotificationType.CUSTOM,
      title: '👑 VIP 승급!',
      message: `축하합니다! ${vipLevel} VIP로 승급하셨습니다. 특별한 혜택을 확인해보세요!`,
      recipientId: userId,
      autoClose: false,
      priority: 'high',
      icon: '👑',
      actions: [
        {
          label: 'VIP 혜택 보기',
          action: () => console.log('VIP 혜택 확인'),
          style: 'primary'
        }
      ]
    });
  }
}

// 싱글톤 인스턴스
export const autoNotificationService = new AutoNotificationService();
import { BaseChatService, CreateMessageParams, CreateRoomParams, ChatResult } from './ChatService';
import { ChatRoom, Message, ChatRoomStatus, MessageStatus, ChatRole } from '../models/Chat';

export class MockChatService extends BaseChatService {
  private rooms: ChatRoom[] = [];
  private messages: Message[] = [];
  private messageSubscribers: Map<string, ((message: Message) => void)[]> = new Map();
  private roomSubscribers: Map<string, ((room: ChatRoom) => void)[]> = new Map();

  constructor() {
    super();
    this.initializeMockData();
  }

  private initializeMockData(): void {
    // 샘플 1대1 문의 채팅방들 생성
    const room1: ChatRoom = {
      id: 'support_room_1',
      name: '홍길동님의 문의',
      participants: ['user_1', 'support_1'],
      lastMessage: '슬롯 예약에 대해 문의가 있습니다.',
      lastMessageTime: new Date(Date.now() - 1000 * 60 * 5), // 5분 전
      unreadCount: 1,
      status: ChatRoomStatus.ACTIVE,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2시간 전
      updatedAt: new Date(Date.now() - 1000 * 60 * 5)
    };

    const room2: ChatRoom = {
      id: 'support_room_2',
      name: '김철수님의 문의',
      participants: ['user_2', 'support_1'],
      lastMessage: '감사합니다!',
      lastMessageTime: new Date(Date.now() - 1000 * 60 * 30), // 30분 전
      unreadCount: 0,
      status: ChatRoomStatus.ACTIVE,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6시간 전
      updatedAt: new Date(Date.now() - 1000 * 60 * 30)
    };

    const room3: ChatRoom = {
      id: 'support_room_3',
      name: '이영희님의 문의',
      participants: ['user_3', 'support_1'],
      lastMessage: '결제 관련해서 궁금한 점이 있어요.',
      lastMessageTime: new Date(Date.now() - 1000 * 60 * 60), // 1시간 전
      unreadCount: 2,
      status: ChatRoomStatus.ACTIVE,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3시간 전
      updatedAt: new Date(Date.now() - 1000 * 60 * 60)
    };

    this.rooms = [room1, room2, room3];

    // 샘플 1대1 문의 메시지들 생성
    this.messages = [
      // support_room_1의 메시지들 (홍길동님 - 읽지 않은 메시지 있음)
      {
        id: 'msg_1',
        roomId: 'support_room_1',
        senderId: 'user_1',
        senderName: '홍길동',
        senderRole: ChatRole.USER,
        content: '안녕하세요. 광고 슬롯 예약에 대해 문의가 있습니다.',
        timestamp: new Date(Date.now() - 1000 * 60 * 20),
        status: MessageStatus.READ
      },
      {
        id: 'msg_2',
        roomId: 'support_room_1',
        senderId: 'support_1',
        senderName: '고객지원팀',
        senderRole: ChatRole.OPERATOR,
        content: '안녕하세요! 광고 슬롯 예약 관련 문의를 도와드리겠습니다. 어떤 부분이 궁금하신가요?',
        timestamp: new Date(Date.now() - 1000 * 60 * 18),
        status: MessageStatus.READ
      },
      {
        id: 'msg_3',
        roomId: 'support_room_1',
        senderId: 'user_1',
        senderName: '홍길동',
        senderRole: ChatRole.USER,
        content: '슬롯 예약 후 승인이 얼마나 걸리나요? 그리고 결제는 언제 이루어지나요?',
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
        status: MessageStatus.DELIVERED
      },

      // support_room_2의 메시지들 (김철수님 - 완료된 문의)
      {
        id: 'msg_4',
        roomId: 'support_room_2',
        senderId: 'user_2',
        senderName: '김철수',
        senderRole: ChatRole.USER,
        content: '캐시 충전이 안 되는데 어떻게 해야 하나요?',
        timestamp: new Date(Date.now() - 1000 * 60 * 45),
        status: MessageStatus.READ
      },
      {
        id: 'msg_5',
        roomId: 'support_room_2',
        senderId: 'support_1',
        senderName: '고객지원팀',
        senderRole: ChatRole.OPERATOR,
        content: '캐시 충전 관련 문제를 확인해보겠습니다. 어떤 결제 방법을 사용하셨나요?',
        timestamp: new Date(Date.now() - 1000 * 60 * 40),
        status: MessageStatus.READ
      },
      {
        id: 'msg_6',
        roomId: 'support_room_2',
        senderId: 'user_2',
        senderName: '김철수',
        senderRole: ChatRole.USER,
        content: '신용카드로 결제했는데 실패했어요.',
        timestamp: new Date(Date.now() - 1000 * 60 * 35),
        status: MessageStatus.READ
      },
      {
        id: 'msg_7',
        roomId: 'support_room_2',
        senderId: 'support_1',
        senderName: '고객지원팀',
        senderRole: ChatRole.OPERATOR,
        content: '확인해보니 결제 승인이 완료되었습니다. 잠시 후 캐시가 반영될 예정입니다.',
        timestamp: new Date(Date.now() - 1000 * 60 * 32),
        status: MessageStatus.READ
      },
      {
        id: 'msg_8',
        roomId: 'support_room_2',
        senderId: 'user_2',
        senderName: '김철수',
        senderRole: ChatRole.USER,
        content: '감사합니다!',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        status: MessageStatus.READ
      },

      // support_room_3의 메시지들 (이영희님 - 새로운 문의)
      {
        id: 'msg_9',
        roomId: 'support_room_3',
        senderId: 'user_3',
        senderName: '이영희',
        senderRole: ChatRole.USER,
        content: '안녕하세요. 결제 관련해서 궁금한 점이 있어요.',
        timestamp: new Date(Date.now() - 1000 * 60 * 65),
        status: MessageStatus.READ
      },
      {
        id: 'msg_10',
        roomId: 'support_room_3',
        senderId: 'user_3',
        senderName: '이영희',
        senderRole: ChatRole.USER,
        content: '환불은 어떻게 받을 수 있나요?',
        timestamp: new Date(Date.now() - 1000 * 60 * 60),
        status: MessageStatus.SENT
      }
    ];
  }

  async createRoom(params: CreateRoomParams): Promise<ChatResult<ChatRoom>> {
    await this.simulateDelay();

    const newRoom: ChatRoom = {
      id: `room_${Date.now()}`,
      name: params.name || `채팅방 ${this.rooms.length + 1}`,
      participants: params.participants,
      status: ChatRoomStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      unreadCount: 0
    };

    this.rooms.push(newRoom);

    // 1대1 문의 채팅에서는 시스템 메시지 없이 바로 시작

    return {
      success: true,
      data: newRoom
    };
  }

  async getRooms(userId: string): Promise<ChatResult<ChatRoom[]>> {
    await this.simulateDelay();

    // 사용자가 참여한 채팅방만 필터링
    const userRooms = this.rooms.filter(room => 
      room.participants.includes(userId)
    );

    return {
      success: true,
      data: userRooms
    };
  }

  async getRoom(roomId: string): Promise<ChatResult<ChatRoom>> {
    await this.simulateDelay();

    const room = this.rooms.find(r => r.id === roomId);
    
    if (!room) {
      return {
        success: false,
        error: '채팅방을 찾을 수 없습니다.'
      };
    }

    return {
      success: true,
      data: room
    };
  }

  async joinRoom(roomId: string, userId: string): Promise<ChatResult<boolean>> {
    await this.simulateDelay();

    const room = this.rooms.find(r => r.id === roomId);
    
    if (!room) {
      return {
        success: false,
        error: '채팅방을 찾을 수 없습니다.'
      };
    }

    if (!room.participants.includes(userId)) {
      room.participants.push(userId);
      room.updatedAt = new Date();
    }

    return {
      success: true,
      data: true
    };
  }

  async leaveRoom(roomId: string, userId: string): Promise<ChatResult<boolean>> {
    await this.simulateDelay();

    const room = this.rooms.find(r => r.id === roomId);
    
    if (!room) {
      return {
        success: false,
        error: '채팅방을 찾을 수 없습니다.'
      };
    }

    room.participants = room.participants.filter(id => id !== userId);
    room.updatedAt = new Date();

    return {
      success: true,
      data: true
    };
  }

  async sendMessage(params: CreateMessageParams): Promise<ChatResult<Message>> {
    await this.simulateDelay();

    // 보내는 사용자가 운영자인지 확인
    const isOperator = params.senderId === 'support_1' || params.senderId.includes('admin') || params.senderId.includes('operator');
    const senderName = isOperator ? '고객지원팀' : '사용자';
    const senderRole = isOperator ? ChatRole.OPERATOR : ChatRole.USER;

    const newMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      roomId: params.roomId,
      senderId: params.senderId,
      senderName,
      senderRole,
      content: params.content,
      timestamp: new Date(),
      status: MessageStatus.SENT
    };

    this.messages.push(newMessage);

    // 채팅방 정보 업데이트
    const room = this.rooms.find(r => r.id === params.roomId);
    if (room) {
      room.lastMessage = params.content;
      room.lastMessageId = newMessage.id;
      room.lastMessageTime = newMessage.timestamp;
      room.updatedAt = new Date();
    }

    // 구독자들에게 알림
    this.notifyMessageSubscribers(params.roomId, newMessage);

    // 간단한 자동 응답 시뮬레이션 (30% 확률)
    if (Math.random() < 0.3) {
      setTimeout(() => {
        this.sendAutoReply(params.roomId);
      }, 1000 + Math.random() * 2000); // 1-3초 후
    }

    return {
      success: true,
      data: newMessage
    };
  }

  private async sendAutoReply(roomId: string): Promise<void> {
    const autoReplies = [
      '네, 확인했습니다.',
      '곧 처리해드리겠습니다.',
      '추가 문의사항이 있으시면 말씀해주세요.',
      '감사합니다.',
      '도움이 되었기를 바랍니다.'
    ];

    const reply = autoReplies[Math.floor(Math.random() * autoReplies.length)];
    
    const autoMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      roomId,
      senderId: 'auto_bot',
      senderName: '자동응답',
      senderRole: ChatRole.OPERATOR,
      content: reply,
      timestamp: new Date(),
      status: MessageStatus.SENT
    };

    this.messages.push(autoMessage);

    // 채팅방 정보 업데이트
    const room = this.rooms.find(r => r.id === roomId);
    if (room) {
      room.lastMessage = reply;
      room.lastMessageId = autoMessage.id;
      room.lastMessageTime = autoMessage.timestamp;
      room.updatedAt = new Date();
      room.unreadCount = (room.unreadCount || 0) + 1;
    }

    // 구독자들에게 알림
    this.notifyMessageSubscribers(roomId, autoMessage);
  }

  async getMessages(roomId: string, limit: number = 50, offset: number = 0): Promise<ChatResult<Message[]>> {
    await this.simulateDelay();

    const roomMessages = this.messages
      .filter(msg => msg.roomId === roomId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .slice(offset, offset + limit);

    return {
      success: true,
      data: roomMessages
    };
  }

  async markMessageAsRead(messageId: string, _userId: string): Promise<ChatResult<boolean>> {
    await this.simulateDelay();

    const message = this.messages.find(msg => msg.id === messageId);
    
    if (!message) {
      return {
        success: false,
        error: '메시지를 찾을 수 없습니다.'
      };
    }

    message.status = MessageStatus.READ;

    return {
      success: true,
      data: true
    };
  }

  async deleteMessage(messageId: string, userId: string): Promise<ChatResult<boolean>> {
    await this.simulateDelay();

    const message = this.messages.find(msg => msg.id === messageId);
    
    if (!message) {
      return {
        success: false,
        error: '메시지를 찾을 수 없습니다.'
      };
    }

    if (message.senderId !== userId) {
      return {
        success: false,
        error: '자신의 메시지만 삭제할 수 있습니다.'
      };
    }

    message.isDeleted = true;

    return {
      success: true,
      data: true
    };
  }

  subscribeToMessages(roomId: string, callback: (message: Message) => void): () => void {
    if (!this.messageSubscribers.has(roomId)) {
      this.messageSubscribers.set(roomId, []);
    }
    
    this.messageSubscribers.get(roomId)!.push(callback);

    // 구독 해제 함수 반환
    return () => {
      const subscribers = this.messageSubscribers.get(roomId);
      if (subscribers) {
        const index = subscribers.indexOf(callback);
        if (index > -1) {
          subscribers.splice(index, 1);
        }
      }
    };
  }

  subscribeToRoomUpdates(userId: string, callback: (room: ChatRoom) => void): () => void {
    if (!this.roomSubscribers.has(userId)) {
      this.roomSubscribers.set(userId, []);
    }
    
    this.roomSubscribers.get(userId)!.push(callback);

    // 구독 해제 함수 반환
    return () => {
      const subscribers = this.roomSubscribers.get(userId);
      if (subscribers) {
        const index = subscribers.indexOf(callback);
        if (index > -1) {
          subscribers.splice(index, 1);
        }
      }
    };
  }

  async getUnreadCount(userId: string): Promise<ChatResult<number>> {
    await this.simulateDelay();

    const userRooms = this.rooms.filter(room => 
      room.participants.includes(userId)
    );

    const totalUnread = userRooms.reduce((total, room) => 
      total + (room.unreadCount || 0), 0
    );

    return {
      success: true,
      data: totalUnread
    };
  }

  async markAllAsRead(roomId: string, _userId: string): Promise<ChatResult<boolean>> {
    await this.simulateDelay();

    const room = this.rooms.find(r => r.id === roomId);
    
    if (!room) {
      return {
        success: false,
        error: '채팅방을 찾을 수 없습니다.'
      };
    }

    // 해당 방의 모든 메시지를 읽음으로 표시
    this.messages
      .filter(msg => msg.roomId === roomId)
      .forEach(msg => {
        msg.status = MessageStatus.READ;
      });

    room.unreadCount = 0;

    return {
      success: true,
      data: true
    };
  }

  private notifyMessageSubscribers(roomId: string, message: Message): void {
    const subscribers = this.messageSubscribers.get(roomId);
    if (subscribers) {
      subscribers.forEach(callback => callback(message));
    }
  }


  private simulateDelay(ms: number = 100 + Math.random() * 400): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
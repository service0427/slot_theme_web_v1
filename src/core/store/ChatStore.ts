import { BaseStore } from './BaseStore';
import { ChatRoom, Message, MessageStatus } from '../models/Chat';
import { IChatService, CreateMessageParams, CreateRoomParams } from '../services/ChatService';

export interface ChatState {
  currentRoomId: string | null;
  rooms: ChatRoom[];
  messages: { [roomId: string]: Message[] };
  loading: boolean;
  error: string | null;
}

export class ChatStore extends BaseStore<ChatState> {
  private chatService: IChatService;

  constructor(chatService: IChatService) {
    super({
      currentRoomId: null,
      rooms: [],
      messages: {},
      loading: false,
      error: null
    });
    this.chatService = chatService;
  }

  // 채팅방 관련 메서드
  async loadRooms(userId: string): Promise<void> {
    this.setState({ loading: true, error: null });
    
    try {
      const result = await this.chatService.getRooms(userId);
      if (result.success && result.data) {
        this.setState({ 
          rooms: result.data,
          loading: false 
        });
      } else {
        this.setState({ 
          error: result.error || '채팅방 목록을 불러오는데 실패했습니다.',
          loading: false 
        });
      }
    } catch (error) {
      this.setState({ 
        error: '채팅방 목록을 불러오는데 실패했습니다.',
        loading: false 
      });
    }
  }

  async createRoom(params: CreateRoomParams): Promise<ChatRoom | null> {
    this.setState({ loading: true, error: null });
    
    try {
      const result = await this.chatService.createRoom(params);
      if (result.success && result.data) {
        // 즉시 UI 업데이트 (Optimistic Update)
        const updatedRooms = [...this.state.rooms, result.data];
        this.setState({ 
          rooms: updatedRooms,
          loading: false 
        });
        return result.data;
      } else {
        this.setState({ 
          error: result.error || '채팅방 생성에 실패했습니다.',
          loading: false 
        });
        return null;
      }
    } catch (error) {
      this.setState({ 
        error: '채팅방 생성에 실패했습니다.',
        loading: false 
      });
      return null;
    }
  }

  async joinRoom(roomId: string, userId: string): Promise<boolean> {
    try {
      const result = await this.chatService.joinRoom(roomId, userId);
      if (result.success) {
        // 현재 방으로 설정
        this.setState({ currentRoomId: roomId });
        
        // 메시지 로드
        await this.loadMessages(roomId);
        return true;
      }
      return false;
    } catch (error) {
      this.setState({ error: '채팅방 참여에 실패했습니다.' });
      return false;
    }
  }

  async setCurrentRoom(roomId: string | null): Promise<void> {
    this.setState({ currentRoomId: roomId });
    
    if (roomId) {
      await this.loadMessages(roomId);
    }
  }

  // 메시지 관련 메서드
  async loadMessages(roomId: string, limit: number = 50): Promise<void> {
    console.log('ChatStore: loadMessages called for roomId:', roomId);
    try {
      const result = await this.chatService.getMessages(roomId, limit);
      console.log('ChatStore: loadMessages result:', result);
      if (result.success && result.data) {
        console.log('ChatStore: Setting messages for room', roomId, 'count:', result.data.length);
        this.setState({ 
          messages: {
            ...this.state.messages,
            [roomId]: result.data
          }
        });
      } else {
        console.error('ChatStore: Failed to load messages:', result.error);
      }
    } catch (error) {
      console.error('ChatStore: Error loading messages:', error);
      this.setState({ error: '메시지를 불러오는데 실패했습니다.' });
    }
  }

  async sendMessage(params: CreateMessageParams): Promise<boolean> {
    const { roomId, content } = params;
    
    // 보내는 사용자가 운영자인지 확인
    const isOperator = params.senderId === 'support_1' || params.senderId.includes('admin') || params.senderId.includes('operator');
    const senderName = isOperator ? '고객지원팀' : '사용자';
    
    // 임시 메시지 생성 (Optimistic Update)
    const tempMessage: Message = {
      id: `temp_${Date.now()}`,
      roomId,
      senderId: params.senderId,
      senderName,
      senderRole: isOperator ? 'operator' as any : 'user' as any,
      content,
      timestamp: new Date(),
      status: MessageStatus.PENDING
    };

    // 즉시 UI 업데이트
    const currentMessages = this.state.messages[roomId] || [];
    this.setState({
      messages: {
        ...this.state.messages,
        [roomId]: [...currentMessages, tempMessage]
      }
    });

    try {
      const result = await this.chatService.sendMessage(params);
      if (result.success && result.data) {
        // 임시 메시지를 실제 메시지로 교체
        const updatedMessages = currentMessages.concat(result.data);
        this.setState({
          messages: {
            ...this.state.messages,
            [roomId]: updatedMessages
          }
        });
        
        // 채팅방 목록의 마지막 메시지 업데이트
        this.updateRoomLastMessage(roomId, result.data);
        return true;
      } else {
        // 실패 시 임시 메시지 제거
        this.setState({
          messages: {
            ...this.state.messages,
            [roomId]: currentMessages
          }
        });
        return false;
      }
    } catch (error) {
      // 오류 시 임시 메시지 제거
      this.setState({
        messages: {
          ...this.state.messages,
          [roomId]: currentMessages
        }
      });
      return false;
    }
  }

  private updateRoomLastMessage(roomId: string, message: Message): void {
    const updatedRooms = this.state.rooms.map(room => 
      room.id === roomId
        ? {
            ...room,
            lastMessage: message.content,
            lastMessageId: message.id,
            lastMessageTime: message.timestamp,
            updatedAt: new Date()
          }
        : room
    );
    
    this.setState({ rooms: updatedRooms });
  }

  // 실시간 구독 메서드
  subscribeToMessages(roomId: string): () => void {
    return this.chatService.subscribeToMessages(roomId, (message: Message) => {
      const currentMessages = this.state.messages[roomId] || [];
      
      // 중복 메시지 체크
      const isDuplicate = currentMessages.some(msg => msg.id === message.id);
      if (!isDuplicate) {
        this.setState({
          messages: {
            ...this.state.messages,
            [roomId]: [...currentMessages, message]
          }
        });
        
        // 채팅방 목록 업데이트
        this.updateRoomLastMessage(roomId, message);
      }
    });
  }

  subscribeToRoomUpdates(userId: string): () => void {
    return this.chatService.subscribeToRoomUpdates(userId, (room: ChatRoom) => {
      const updatedRooms = this.state.rooms.map(r => 
        r.id === room.id ? room : r
      );
      
      // 새로운 방인 경우 추가
      if (!this.state.rooms.find(r => r.id === room.id)) {
        updatedRooms.push(room);
      }
      
      this.setState({ rooms: updatedRooms });
    });
  }

  // 읽음 처리
  async markAllAsRead(roomId: string, userId: string): Promise<void> {
    try {
      const result = await this.chatService.markAllAsRead(roomId, userId);
      if (result.success) {
        // 해당 방의 읽지 않은 메시지 수를 0으로 업데이트
        const updatedRooms = this.state.rooms.map(room => 
          room.id === roomId ? { ...room, unreadCount: 0 } : room
        );
        this.setState({ rooms: updatedRooms });
      }
    } catch (error) {
      console.error('메시지 읽음 처리 실패:', error);
    }
  }

  // 상태 초기화
  clearError(): void {
    this.setState({ error: null });
  }

  clearMessages(roomId: string): void {
    const updatedMessages = { ...this.state.messages };
    delete updatedMessages[roomId];
    this.setState({ messages: updatedMessages });
  }
}
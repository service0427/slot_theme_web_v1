import { 
  IChatService,
  ChatResult,
  CreateMessageParams,
  CreateRoomParams
} from '@/core/services/ChatService';
import { ChatRoom, Message, MessageStatus, ChatRoomStatus } from '@/core/models/Chat';

export class ApiChatService implements IChatService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'http://localhost:8001/api/chat';
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  async createRoom(params: CreateRoomParams): Promise<ChatResult<ChatRoom>> {
    try {
      const response = await fetch(`${this.baseUrl}/rooms`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: error || 'Failed to create chat room' };
      }

      const data = await response.json();
      return { success: true, data: this.transformRoom(data.room) };
    } catch (error) {
      console.error('Error creating chat room:', error);
      return { success: false, error: 'Failed to create chat room' };
    }
  }

  async getRooms(_userId: string): Promise<ChatResult<ChatRoom[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/rooms`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        return { success: false, error: `Failed to fetch chat rooms: ${response.status}` };
      }

      const data = await response.json();
      const rooms = data.rooms.map((room: any) => this.transformRoom(room));
      return { success: true, data: rooms };
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
      return { success: false, error: 'Failed to fetch chat rooms' };
    }
  }

  async getRoom(roomId: string): Promise<ChatResult<ChatRoom>> {
    try {
      const rooms = await this.getRooms(''); // userId not used in this context
      if (rooms.success && rooms.data) {
        const room = rooms.data.find(r => r.id === roomId);
        if (room) {
          return { success: true, data: room };
        }
      }
      return { success: false, error: 'Room not found' };
    } catch (error) {
      return { success: false, error: 'Failed to fetch room' };
    }
  }

  async joinRoom(_roomId: string, _userId: string): Promise<ChatResult<boolean>> {
    // For support chat, users are automatically joined when room is created
    return { success: true, data: true };
  }

  async leaveRoom(_roomId: string, _userId: string): Promise<ChatResult<boolean>> {
    // Not implemented for support chat
    return { success: true, data: true };
  }

  async getMessages(roomId: string, limit?: number, offset?: number): Promise<ChatResult<Message[]>> {
    try {
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (offset) params.append('offset', offset.toString());

      const response = await fetch(
        `${this.baseUrl}/rooms/${roomId}/messages?${params}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders()
        }
      );

      if (!response.ok) {
        return { success: false, error: 'Failed to fetch messages' };
      }

      const data = await response.json();
      const messages = data.messages.map((msg: any) => this.transformMessage(msg));
      return { success: true, data: messages };
    } catch (error) {
      console.error('Error fetching messages:', error);
      return { success: false, error: 'Failed to fetch messages' };
    }
  }

  async sendMessage(params: CreateMessageParams): Promise<ChatResult<Message>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/rooms/${params.roomId}/messages`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ content: params.content })
        }
      );

      if (!response.ok) {
        return { success: false, error: 'Failed to send message' };
      }

      const data = await response.json();
      return { success: true, data: this.transformMessage(data.message) };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, error: 'Failed to send message' };
    }
  }

  async markMessageAsRead(_messageId: string, _userId: string): Promise<ChatResult<boolean>> {
    // Individual message read marking not implemented
    return { success: true, data: true };
  }

  async markAllAsRead(roomId: string, _userId: string): Promise<ChatResult<boolean>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/rooms/${roomId}/read`,
        {
          method: 'PUT',
          headers: this.getAuthHeaders()
        }
      );

      if (!response.ok) {
        return { success: false, error: 'Failed to mark messages as read' };
      }

      return { success: true, data: true };
    } catch (error) {
      console.error('Error marking messages as read:', error);
      return { success: false, error: 'Failed to mark messages as read' };
    }
  }

  async deleteMessage(_messageId: string, _userId: string): Promise<ChatResult<boolean>> {
    // Message deletion not implemented
    return { success: false, error: 'Message deletion not supported' };
  }

  async getUnreadCount(userId: string): Promise<ChatResult<number>> {
    try {
      const roomsResult = await this.getRooms(userId);
      if (roomsResult.success && roomsResult.data) {
        const unreadCount = roomsResult.data.reduce((total, room) => total + (room.unreadCount || 0), 0);
        return { success: true, data: unreadCount };
      }
      return { success: false, error: 'Failed to get unread count' };
    } catch (error) {
      return { success: false, error: 'Failed to get unread count' };
    }
  }

  // Transform API response to domain model
  private transformRoom(apiRoom: any): ChatRoom {
    return {
      id: apiRoom.id,
      name: apiRoom.name || '고객 지원',
      participants: [],
      lastMessage: apiRoom.last_message,
      lastMessageId: apiRoom.last_message_id,
      lastMessageTime: apiRoom.last_message_at ? new Date(apiRoom.last_message_at) : undefined,
      unreadCount: apiRoom.unread_count || 0,
      status: apiRoom.status === 'closed' ? ChatRoomStatus.CLOSED : 
              apiRoom.status === 'archived' ? ChatRoomStatus.ARCHIVED : 
              ChatRoomStatus.ACTIVE,
      createdAt: new Date(apiRoom.created_at),
      updatedAt: new Date(apiRoom.updated_at),
      // 사용자 정보 추가 (creator 객체에서 가져오기)
      user_name: apiRoom.creator?.name || apiRoom.user_name,
      user_email: apiRoom.creator?.email || apiRoom.user_email
    };
  }

  private transformMessage(apiMessage: any): Message {
    const isSystemMessage = apiMessage.type === 'system' || apiMessage.type === 'auto_reply';
    
    return {
      id: apiMessage.id,
      roomId: apiMessage.room_id,
      senderId: isSystemMessage ? null : apiMessage.sender_id,
      senderName: isSystemMessage 
        ? (apiMessage.sender?.name || (apiMessage.type === 'auto_reply' ? '자동 응답' : '시스템'))
        : (apiMessage.sender?.name || apiMessage.sender?.email || 'Unknown'),
      senderRole: isSystemMessage ? 'system' : (apiMessage.sender?.role || 'user'),
      content: apiMessage.content,
      timestamp: new Date(apiMessage.created_at),
      status: apiMessage.is_read ? MessageStatus.READ : MessageStatus.SENT
    };
  }

  // Real-time support (using polling for now)
  subscribeToMessages(roomId: string, callback: (message: Message) => void): () => void {
    let lastMessageId: string | null = null;
    
    const pollInterval = setInterval(async () => {
      try {
        const result = await this.getMessages(roomId, 10);
        if (result.success && result.data && result.data.length > 0) {
          // Find new messages
          const latestMessage = result.data[result.data.length - 1];
          if (lastMessageId && latestMessage.id !== lastMessageId) {
            // Check for new messages after lastMessageId
            const lastIndex = result.data.findIndex(m => m.id === lastMessageId);
            if (lastIndex >= 0 && lastIndex < result.data.length - 1) {
              // Callback for each new message
              for (let i = lastIndex + 1; i < result.data.length; i++) {
                callback(result.data[i]);
              }
            }
          }
          lastMessageId = latestMessage.id;
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000); // Poll every 2 seconds

    // Return cleanup function
    return () => clearInterval(pollInterval);
  }

  subscribeToRoomUpdates(userId: string, callback: (room: ChatRoom) => void): () => void {
    // Room updates polling
    const pollInterval = setInterval(async () => {
      try {
        const result = await this.getRooms(userId);
        if (result.success && result.data) {
          // Callback for each room (let the store handle deduplication)
          result.data.forEach(room => callback(room));
        }
      } catch (error) {
        console.error('Room polling error:', error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }
}
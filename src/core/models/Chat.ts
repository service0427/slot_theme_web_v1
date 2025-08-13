export enum MessageStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed'
}

export enum ChatRole {
  USER = 'user',
  ADMIN = 'admin',
  OPERATOR = 'operator',
  SYSTEM = 'system'
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderRole: ChatRole;
  content: string;
  timestamp: Date;
  status: MessageStatus;
  isDeleted?: boolean;
}

export enum ChatRoomStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  CLOSED = 'closed'
}

export interface ChatRoom {
  id: string;
  name?: string;
  participants: string[];
  lastMessageId?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount?: number;
  status: ChatRoomStatus;
  createdAt: Date;
  updatedAt: Date;
  // 사용자 정보 (채팅방 생성자/참여자 정보)
  user_name?: string;
  user_email?: string;
}

export interface ChatParticipant {
  id: string;
  roomId: string;
  userId: string;
  role: ChatRole;
  joinedAt: Date;
  lastReadMessageId?: string;
  lastSeen?: Date;
}

export class MessageModel implements Message {
  constructor(
    public id: string,
    public roomId: string,
    public senderId: string,
    public senderName: string,
    public senderRole: ChatRole,
    public content: string,
    public timestamp: Date,
    public status: MessageStatus = MessageStatus.PENDING,
    public isDeleted: boolean = false
  ) {}

  markAsRead(): MessageModel {
    return new MessageModel(
      this.id,
      this.roomId,
      this.senderId,
      this.senderName,
      this.senderRole,
      this.content,
      this.timestamp,
      MessageStatus.READ,
      this.isDeleted
    );
  }

  markAsDeleted(): MessageModel {
    return new MessageModel(
      this.id,
      this.roomId,
      this.senderId,
      this.senderName,
      this.senderRole,
      this.content,
      this.timestamp,
      this.status,
      true
    );
  }
}

export class ChatRoomModel implements ChatRoom {
  constructor(
    public id: string,
    public participants: string[],
    public status: ChatRoomStatus,
    public createdAt: Date,
    public updatedAt: Date,
    public name?: string,
    public lastMessageId?: string,
    public lastMessage?: string,
    public lastMessageTime?: Date,
    public unreadCount: number = 0
  ) {}

  addParticipant(userId: string): ChatRoomModel {
    if (this.participants.includes(userId)) {
      return this;
    }
    
    return new ChatRoomModel(
      this.id,
      [...this.participants, userId],
      this.status,
      this.createdAt,
      this.updatedAt,
      this.name,
      this.lastMessageId,
      this.lastMessage,
      this.lastMessageTime,
      this.unreadCount
    );
  }

  updateLastMessage(message: Message): ChatRoomModel {
    return new ChatRoomModel(
      this.id,
      this.participants,
      this.status,
      this.createdAt,
      new Date(),
      this.name,
      message.id,
      message.content,
      message.timestamp,
      this.unreadCount
    );
  }
}
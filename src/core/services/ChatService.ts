import { ChatRoom, Message } from '../models/Chat';

export interface CreateMessageParams {
  roomId: string;
  content: string;
  senderId: string;
}

export interface CreateRoomParams {
  name?: string;
  participants: string[];
}

export interface ChatResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface IChatService {
  // 채팅방 관련
  createRoom(params: CreateRoomParams): Promise<ChatResult<ChatRoom>>;
  getRooms(userId: string): Promise<ChatResult<ChatRoom[]>>;
  getRoom(roomId: string): Promise<ChatResult<ChatRoom>>;
  joinRoom(roomId: string, userId: string): Promise<ChatResult<boolean>>;
  leaveRoom(roomId: string, userId: string): Promise<ChatResult<boolean>>;
  
  // 메시지 관련
  sendMessage(params: CreateMessageParams): Promise<ChatResult<Message>>;
  getMessages(roomId: string, limit?: number, offset?: number): Promise<ChatResult<Message[]>>;
  markMessageAsRead(messageId: string, userId: string): Promise<ChatResult<boolean>>;
  deleteMessage(messageId: string, userId: string): Promise<ChatResult<boolean>>;
  
  // 실시간 기능
  subscribeToMessages(roomId: string, callback: (message: Message) => void): () => void;
  subscribeToRoomUpdates(userId: string, callback: (room: ChatRoom) => void): () => void;
  
  // 읽지 않은 메시지 수
  getUnreadCount(userId: string): Promise<ChatResult<number>>;
  markAllAsRead(roomId: string, userId: string): Promise<ChatResult<boolean>>;
}

export abstract class BaseChatService implements IChatService {
  abstract createRoom(params: CreateRoomParams): Promise<ChatResult<ChatRoom>>;
  abstract getRooms(userId: string): Promise<ChatResult<ChatRoom[]>>;
  abstract getRoom(roomId: string): Promise<ChatResult<ChatRoom>>;
  abstract joinRoom(roomId: string, userId: string): Promise<ChatResult<boolean>>;
  abstract leaveRoom(roomId: string, userId: string): Promise<ChatResult<boolean>>;
  abstract sendMessage(params: CreateMessageParams): Promise<ChatResult<Message>>;
  abstract getMessages(roomId: string, limit?: number, offset?: number): Promise<ChatResult<Message[]>>;
  abstract markMessageAsRead(messageId: string, userId: string): Promise<ChatResult<boolean>>;
  abstract deleteMessage(messageId: string, userId: string): Promise<ChatResult<boolean>>;
  abstract subscribeToMessages(roomId: string, callback: (message: Message) => void): () => void;
  abstract subscribeToRoomUpdates(userId: string, callback: (room: ChatRoom) => void): () => void;
  abstract getUnreadCount(userId: string): Promise<ChatResult<number>>;
  abstract markAllAsRead(roomId: string, userId: string): Promise<ChatResult<boolean>>;
}
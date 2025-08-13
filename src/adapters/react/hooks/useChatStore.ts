import { useEffect, useState, useCallback } from 'react';
import { ChatStore } from '@/core/store/ChatStore';
import { MockChatService } from '@/core/services/MockChatService';
import { ApiChatService } from '@/adapters/services/ApiChatService';
import { CreateMessageParams, CreateRoomParams } from '@/core/services/ChatService';
import { Message } from '@/core/models/Chat';

// 싱글톤 인스턴스
let chatStoreInstance: ChatStore | null = null;

const getChatStore = (): ChatStore => {
  if (!chatStoreInstance) {
    // API 서비스 사용 (Mock 서비스 대신)
    const chatService = new ApiChatService();
    chatStoreInstance = new ChatStore(chatService);
  }
  return chatStoreInstance;
};

export const useChatStore = () => {
  const [store] = useState(getChatStore);
  const [state, setState] = useState(store.getState());

  useEffect(() => {
    const unsubscribe = store.subscribe(setState);
    return unsubscribe;
  }, [store]);

  const loadRooms = useCallback((userId: string) => store.loadRooms(userId), [store]);
  const createRoom = useCallback((params: CreateRoomParams) => store.createRoom(params), [store]);
  const joinRoom = useCallback((roomId: string, userId: string) => store.joinRoom(roomId, userId), [store]);
  const setCurrentRoom = useCallback((roomId: string | null) => store.setCurrentRoom(roomId), [store]);
  const loadMessages = useCallback((roomId: string, limit?: number) => store.loadMessages(roomId, limit), [store]);
  const sendMessage = useCallback((params: CreateMessageParams) => store.sendMessage(params), [store]);
  const markAllAsRead = useCallback((roomId: string, userId: string) => store.markAllAsRead(roomId, userId), [store]);
  const subscribeToMessages = useCallback((roomId: string) => store.subscribeToMessages(roomId), [store]);
  const subscribeToRoomUpdates = useCallback((userId: string) => store.subscribeToRoomUpdates(userId), [store]);
  const clearError = useCallback(() => store.clearError(), [store]);
  const clearMessages = useCallback((roomId: string) => store.clearMessages(roomId), [store]);

  return {
    // 상태
    ...state,
    
    // 채팅방 관련 액션
    loadRooms,
    createRoom,
    joinRoom,
    setCurrentRoom,
    
    // 메시지 관련 액션
    loadMessages,
    sendMessage,
    markAllAsRead,
    
    // 실시간 구독
    subscribeToMessages,
    subscribeToRoomUpdates,
    
    // 유틸리티
    clearError,
    clearMessages
  };
};

// 현재 방의 메시지만 가져오는 훅
export const useCurrentRoomMessages = (): Message[] => {
  const { currentRoomId, messages } = useChatStore();
  
  if (!currentRoomId) {
    return [];
  }
  
  return messages[currentRoomId] || [];
};

// 읽지 않은 메시지 수 계산 훅
export const useUnreadCount = (): number => {
  const { rooms } = useChatStore();
  
  return rooms.reduce((total, room) => total + (room.unreadCount || 0), 0);
};

// 특정 방의 읽지 않은 메시지 수 훅
export const useRoomUnreadCount = (roomId: string): number => {
  const { rooms } = useChatStore();
  
  const room = rooms.find(r => r.id === roomId);
  return room?.unreadCount || 0;
};
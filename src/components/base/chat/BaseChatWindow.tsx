import React, { useEffect, useRef, useState } from 'react';
import { useChatStore, useCurrentRoomMessages } from '@/adapters/react/hooks/useChatStore';
import { ChatRoom } from '@/core/models/Chat';

interface ChatWindowThemeProps {
  containerClass?: string;
  headerClass?: string;
  emptyStateClass?: string;
  errorClass?: string;
  messagesContainerClass?: string;
  scrollButtonClass?: string;
  loadingClass?: string;
}

interface BaseChatWindowProps {
  room: ChatRoom | null;
  currentUserId?: string;
  onClose?: () => void;
  theme?: ChatWindowThemeProps;
  ChatMessageComponent: React.ComponentType<any>;
  ChatInputComponent: React.ComponentType<any>;
}

export const BaseChatWindow: React.FC<BaseChatWindowProps> = ({
  room,
  currentUserId = 'current_user',
  onClose,
  theme = {},
  ChatMessageComponent,
  ChatInputComponent
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  
  const {
    sendMessage,
    markAllAsRead,
    subscribeToMessages,
    loading,
    error
  } = useChatStore();
  
  const messages = useCurrentRoomMessages();

  // 기본 스타일
  const defaultTheme: ChatWindowThemeProps = {
    containerClass: 'flex-1 flex flex-col bg-white',
    headerClass: 'border-b bg-white px-4 py-3 flex items-center justify-between',
    emptyStateClass: 'flex-1 flex items-center justify-center bg-gray-50',
    errorClass: 'bg-red-50 border-l-4 border-red-400 p-3 m-4 rounded',
    messagesContainerClass: 'flex-1 overflow-y-auto p-4 space-y-1',
    scrollButtonClass: 'bg-blue-500 hover:bg-blue-600 text-white rounded-full p-2 shadow-lg transition-colors',
    loadingClass: 'flex justify-center items-center h-32'
  };

  // 테마 병합
  const mergedTheme = { ...defaultTheme, ...theme };

  // 메시지 전송 핸들러
  const handleSendMessage = async (content: string): Promise<boolean> => {
    if (!room) return false;
    
    const success = await sendMessage({
      roomId: room.id,
      content,
      senderId: currentUserId
    });
    
    if (success) {
      setShouldAutoScroll(true);
    }
    
    return success;
  };

  // 자동 스크롤
  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  };

  // 스크롤 위치 확인
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop <= clientHeight + 100;
      setShouldAutoScroll(isAtBottom);
    }
  };

  // 메시지가 변경될 때 자동 스크롤
  useEffect(() => {
    if (shouldAutoScroll) {
      scrollToBottom();
    }
  }, [messages, shouldAutoScroll]);

  // 방이 변경될 때 메시지를 읽음으로 표시
  useEffect(() => {
    if (room && messages.length > 0) {
      markAllAsRead(room.id, currentUserId);
    }
  }, [room, messages.length, markAllAsRead, currentUserId]);

  // 실시간 메시지 구독
  useEffect(() => {
    if (!room) return;
    
    const unsubscribe = subscribeToMessages(room.id);
    return unsubscribe;
  }, [room, subscribeToMessages]);

  if (!room) {
    return (
      <div className={mergedTheme.emptyStateClass}>
        <div className="text-center text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <p className="text-lg font-medium mb-2">채팅방을 선택해주세요</p>
          <p className="text-sm">왼쪽에서 채팅방을 선택하면 대화를 시작할 수 있습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={mergedTheme.containerClass}>
      {/* 채팅방 헤더 */}
      <div className={mergedTheme.headerClass}>
        <div className="flex items-center">
          <h2 className="text-lg font-semibold text-gray-900">
            {room.name || `채팅방 ${room.id.slice(-4)}`}
          </h2>
          <div className="ml-3 flex items-center text-sm text-gray-500">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
            </svg>
            {room.participants.length}명
          </div>
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className={mergedTheme.errorClass}>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* 메시지 영역 */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className={mergedTheme.messagesContainerClass}
        style={{ minHeight: 0 }}
      >
        {loading && messages.length === 0 ? (
          <div className={mergedTheme.loadingClass}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <div className="text-center">
              <p className="mb-2">아직 메시지가 없습니다.</p>
              <p className="text-sm">첫 번째 메시지를 보내보세요!</p>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <ChatMessageComponent
              key={message.id}
              message={message}
              prevMessage={index > 0 ? messages[index - 1] : undefined}
              currentUserId={currentUserId}
              showTime={true}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 스크롤 다운 버튼 */}
      {!shouldAutoScroll && (
        <div className="absolute bottom-16 right-4">
          <button
            onClick={scrollToBottom}
            className={mergedTheme.scrollButtonClass}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </div>
      )}

      {/* 메시지 입력 */}
      <ChatInputComponent
        onSendMessage={handleSendMessage}
        disabled={loading}
        placeholder={`${room.name || '채팅방'}에 메시지 보내기...`}
      />
    </div>
  );
};
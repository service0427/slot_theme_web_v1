import React, { useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/adapters/react/hooks/useChatStore';
import { useAuthContext } from '@/adapters/react';

interface SupportChatThemeProps {
  containerClass?: string;
  headerClass?: string;
  headerIconClass?: string;
  headerTitleClass?: string;
  headerSubtitleClass?: string;
  errorClass?: string;
  messagesContainerClass?: string;
  emptyStateClass?: string;
  emptyStateIconClass?: string;
  scrollButtonClass?: string;
}

interface BaseSupportChatProps {
  className?: string;
  height?: string;
  onClose?: () => void;
  theme?: SupportChatThemeProps;
  ChatMessageComponent: React.ComponentType<any>;
  ChatInputComponent: React.ComponentType<any>;
}

export const BaseSupportChat: React.FC<BaseSupportChatProps> = ({
  className = '',
  height = '500px',
  onClose,
  theme = {},
  ChatMessageComponent,
  ChatInputComponent
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const { user } = useAuthContext();
  
  const {
    currentRoomId,
    messages,
    rooms,
    sendMessage,
    loadRooms,
    createRoom,
    setCurrentRoom,
    loadMessages,
    subscribeToMessages,
    markAllAsRead,
    loading,
    error
  } = useChatStore();

  // 기본 스타일
  const defaultTheme: SupportChatThemeProps = {
    containerClass: 'bg-white rounded-lg shadow-lg overflow-hidden flex flex-col',
    headerClass: 'border-b bg-white px-4 py-3 flex items-center justify-between',
    headerIconClass: 'w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3',
    headerTitleClass: 'text-lg font-semibold text-gray-900',
    headerSubtitleClass: 'text-sm text-gray-500',
    errorClass: 'bg-red-50 border-l-4 border-red-400 p-3 m-4 rounded',
    messagesContainerClass: 'flex-1 overflow-y-auto p-4 space-y-1',
    emptyStateClass: 'flex items-center justify-center h-32 text-gray-500',
    emptyStateIconClass: 'w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4',
    scrollButtonClass: 'bg-blue-500 hover:bg-blue-600 text-white rounded-full p-2 shadow-lg transition-colors'
  };

  // 테마 병합
  const mergedTheme = { ...defaultTheme, ...theme };

  // 현재 방의 메시지들
  const currentMessages = currentRoomId ? messages[currentRoomId] || [] : [];
  
  // 디버깅: 현재 메시지 상태 로그
  console.log('SupportChat: currentMessages', { 
    currentRoomId, 
    messagesCount: currentMessages.length, 
    messages: currentMessages 
  });

  // 사용자의 문의 채팅방 찾기 또는 생성
  useEffect(() => {
    const initializeSupportChat = async () => {
      if (!user || isInitialized) return;

      // 기존 채팅방 로드
      await loadRooms(user.id);
      
      setIsInitialized(true);
    };

    initializeSupportChat();
  }, [user?.id, isInitialized]); // loadRooms 제거

  // 사용자의 문의 채팅방 설정
  useEffect(() => {
    const initializeUserRoom = async () => {
      console.log('SupportChat: initializeUserRoom called', { 
        user: !!user, 
        isInitialized, 
        roomsLength: rooms.length, 
        currentRoomId 
      });
      
      if (!user || !isInitialized || rooms.length === 0) return;

      // 사용자의 첫 번째 채팅방을 현재 방으로 설정
      console.log('SupportChat: Available rooms:', rooms);
      console.log('SupportChat: Current user.id:', user.id);
      
      const userRoom = rooms.find(room => {
        console.log('SupportChat: Checking room:', room);
        // participants 배열이 비어있으므로 createdBy로 확인
        return room.createdBy === user.id;
      });
      console.log('SupportChat: userRoom found:', userRoom);
      
      if (userRoom && currentRoomId !== userRoom.id) {
        console.log('SupportChat: Setting current room to:', userRoom.id);
        await setCurrentRoom(userRoom.id);
      }
    };

    initializeUserRoom();
  }, [user?.id, rooms, isInitialized, currentRoomId]); // setCurrentRoom 제거, currentRoomId 추가

  // 문의 채팅방 생성
  const handleStartChat = async () => {
    if (!user) return null;

    const newRoom = await createRoom({
      name: `${user.fullName}님의 문의`,
      participants: [user.id, 'support_1'] // 사용자 + 지원팀
    });

    if (newRoom) {
      setCurrentRoom(newRoom.id);
    }
    
    return newRoom;
  };

  // 메시지 전송
  const handleSendMessage = async (content: string): Promise<boolean> => {
    let roomId = currentRoomId;
    
    // 채팅방이 없으면 먼저 생성
    if (!roomId) {
      const newRoom = await handleStartChat();
      if (!newRoom) return false;
      roomId = newRoom.id;
    }
    
    const success = await sendMessage({
      roomId,
      content,
      senderId: user?.id || 'current_user'
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

  // 스크롤 이벤트 처리
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop <= clientHeight + 100;
      setShouldAutoScroll(isAtBottom);
    }
  };

  // 메시지 변경 시 자동 스크롤
  useEffect(() => {
    if (shouldAutoScroll) {
      scrollToBottom();
    }
  }, [currentMessages, shouldAutoScroll]);

  // 메시지 읽음 처리
  useEffect(() => {
    if (currentRoomId && user && currentMessages.length > 0) {
      markAllAsRead(currentRoomId, user.id);
    }
  }, [currentRoomId, user?.id, currentMessages.length]); // markAllAsRead 제거

  // 실시간 메시지 구독
  useEffect(() => {
    if (!currentRoomId) return;
    
    const unsubscribe = subscribeToMessages(currentRoomId);
    return unsubscribe;
  }, [currentRoomId]); // subscribeToMessages 제거

  return (
    <div 
      className={`${mergedTheme.containerClass} ${className}`}
      style={{ height }}
    >
      {/* 헤더 */}
      <div className={mergedTheme.headerClass}>
        <div className="flex items-center">
          <div className={mergedTheme.headerIconClass}>
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h2 className={mergedTheme.headerTitleClass}>고객 지원</h2>
            <p className={mergedTheme.headerSubtitleClass}>궁금한 점을 문의해보세요</p>
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
        {loading && currentMessages.length === 0 ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : currentMessages.length === 0 ? (
          <div className={mergedTheme.emptyStateClass}>
            <div className="text-center">
              <div className={mergedTheme.emptyStateIconClass}>
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <p className="text-lg font-medium mb-2">안녕하세요! 👋</p>
              <p className="text-sm">궁금한 점이나 도움이 필요한 사항이 있으시면</p>
              <p className="text-sm">언제든지 문의해주세요.</p>
            </div>
          </div>
        ) : (
          currentMessages.map((message, index) => (
            <ChatMessageComponent
              key={message.id}
              message={message}
              prevMessage={index > 0 ? currentMessages[index - 1] : undefined}
              currentUserId={user?.id || 'current_user'}
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
        placeholder="문의 내용을 입력해주세요..."
      />
    </div>
  );
};
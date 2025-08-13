import React, { useEffect, useState } from 'react';
import { useChatStore, useUnreadCount } from '@/adapters/react/hooks/useChatStore';

interface ChatThemeProps {
  containerClass?: string;
  headerClass?: string;
  roomListClass?: string;
  chatWindowClass?: string;
  errorClass?: string;
  buttonClass?: string;
  unreadBadgeClass?: string;
}

interface BaseChatProps {
  currentUserId?: string;
  className?: string;
  height?: string;
  theme?: ChatThemeProps;
  ChatRoomListComponent: React.ComponentType<any>;
  ChatWindowComponent: React.ComponentType<any>;
}

export const BaseChat: React.FC<BaseChatProps> = ({
  currentUserId = 'current_user',
  className = '',
  height = '600px',
  theme = {},
  ChatRoomListComponent,
  ChatWindowComponent
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [showRoomList, setShowRoomList] = useState(true);
  
  const {
    rooms,
    currentRoomId,
    loading,
    error,
    loadRooms,
    setCurrentRoom,
    subscribeToRoomUpdates,
    clearError
  } = useChatStore();
  
  const unreadCount = useUnreadCount();

  // 기본 스타일
  const defaultTheme: ChatThemeProps = {
    containerClass: 'bg-white rounded-lg shadow-lg overflow-hidden',
    headerClass: 'bg-white border-b px-4 py-3',
    roomListClass: 'bg-gray-50 flex flex-col',
    chatWindowClass: 'flex flex-col relative',
    errorClass: 'bg-red-50 border-l-4 border-red-400 p-3 m-4',
    buttonClass: 'w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors',
    unreadBadgeClass: 'bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-2'
  };

  // 테마 병합
  const mergedTheme = { ...defaultTheme, ...theme };

  // 화면 크기 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 초기 데이터 로드
  useEffect(() => {
    loadRooms(currentUserId);
  }, [loadRooms, currentUserId]);

  // 실시간 채팅방 업데이트 구독
  useEffect(() => {
    const unsubscribe = subscribeToRoomUpdates(currentUserId);
    return unsubscribe;
  }, [subscribeToRoomUpdates, currentUserId]);

  // 방 선택 핸들러
  const handleRoomSelect = (roomId: string) => {
    setCurrentRoom(roomId);
    
    // 모바일에서는 채팅창을 보여주고 룸 리스트를 숨김
    if (isMobile) {
      setShowRoomList(false);
    }
  };

  // 채팅창 닫기 (모바일)
  const handleCloseChat = () => {
    if (isMobile) {
      setShowRoomList(true);
      setCurrentRoom(null);
    }
  };

  // 현재 선택된 방 정보
  const currentRoom = rooms.find((room: any) => room.id === currentRoomId) || null;

  return (
    <div 
      className={`${mergedTheme.containerClass} ${className}`}
      style={{ height }}
    >
      {/* 에러 표시 */}
      {error && (
        <div className={mergedTheme.errorClass}>
          <div className="flex justify-between items-center">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={clearError}
              className="text-red-700 hover:text-red-900"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="flex h-full">
        {/* 채팅방 목록 */}
        <div className={`
          ${isMobile ? (showRoomList ? 'w-full' : 'hidden') : 'w-80 border-r'}
          ${mergedTheme.roomListClass}
        `}>
          {/* 헤더 */}
          <div className={mergedTheme.headerClass}>
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold text-gray-900">채팅</h1>
              {unreadCount > 0 && (
                <div className={mergedTheme.unreadBadgeClass}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </div>
              )}
            </div>
          </div>

          {/* 채팅방 목록 */}
          <div className="flex-1 overflow-y-auto">
            <ChatRoomListComponent
              rooms={rooms}
              currentRoomId={currentRoomId}
              onRoomSelect={handleRoomSelect}
              loading={loading}
            />
          </div>

          {/* 새 채팅방 만들기 버튼 */}
          <div className="border-t bg-white p-4">
            <button className={mergedTheme.buttonClass}>
              새 채팅방 만들기
            </button>
          </div>
        </div>

        {/* 채팅 윈도우 */}
        <div className={`
          ${isMobile ? (showRoomList ? 'hidden' : 'w-full') : 'flex-1'}
          ${mergedTheme.chatWindowClass}
        `}>
          <ChatWindowComponent
            room={currentRoom}
            currentUserId={currentUserId}
            onClose={isMobile ? handleCloseChat : undefined}
          />
        </div>
      </div>
    </div>
  );
};
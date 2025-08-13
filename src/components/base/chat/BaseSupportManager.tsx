import React, { useEffect, useState } from 'react';
import { useChatStore, useUnreadCount } from '@/adapters/react/hooks/useChatStore';
import { useAuthContext } from '@/adapters/react';

interface SupportManagerThemeProps {
  containerClass?: string;
  errorClass?: string;
  roomListSectionClass?: string;
  chatWindowSectionClass?: string;
  headerClass?: string;
  headerTitleClass?: string;
  headerSubtitleClass?: string;
  unreadBadgeClass?: string;
  statsContainerClass?: string;
  statItemClass?: string;
  statValueClass?: string;
  statLabelClass?: string;
  accessDeniedClass?: string;
}

interface BaseSupportManagerProps {
  className?: string;
  height?: string;
  theme?: SupportManagerThemeProps;
  ChatRoomListComponent: React.ComponentType<any>;
  ChatWindowComponent: React.ComponentType<any>;
}

export const BaseSupportManager: React.FC<BaseSupportManagerProps> = ({
  className = '',
  height = '700px',
  theme = {},
  ChatRoomListComponent,
  ChatWindowComponent
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [showRoomList, setShowRoomList] = useState(true);
  
  const { user } = useAuthContext();
  
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
  const defaultTheme: SupportManagerThemeProps = {
    containerClass: 'bg-white rounded-lg shadow-lg overflow-hidden',
    errorClass: 'bg-red-50 border-l-4 border-red-400 p-3 m-4',
    roomListSectionClass: 'bg-gray-50 flex flex-col',
    chatWindowSectionClass: 'flex flex-col relative',
    headerClass: 'bg-white border-b px-4 py-3',
    headerTitleClass: 'text-lg font-semibold text-gray-900',
    headerSubtitleClass: 'text-sm text-gray-500',
    unreadBadgeClass: 'bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-2',
    statsContainerClass: 'border-t bg-white p-4',
    statItemClass: 'p-3 rounded-lg',
    statValueClass: 'text-2xl font-bold',
    statLabelClass: 'text-xs',
    accessDeniedClass: 'flex items-center justify-center h-64 bg-gray-50 rounded-lg'
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

  // 초기 데이터 로드 (운영자의 모든 문의 채팅방)
  useEffect(() => {
    if (user?.role === 'operator') {
      loadRooms('support_1'); // 지원팀 ID로 로드
    }
  }, [user?.role]); // loadRooms 제거

  // 실시간 채팅방 업데이트 구독
  useEffect(() => {
    if (user?.role === 'operator') {
      const unsubscribe = subscribeToRoomUpdates('support_1');
      return unsubscribe;
    }
  }, [user?.role]); // subscribeToRoomUpdates 제거

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

  // 운영자가 아닌 경우 접근 차단
  if (user?.role !== 'operator') {
    return (
      <div className={mergedTheme.accessDeniedClass}>
        <div className="text-center text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className="text-lg font-medium mb-2">접근 권한이 없습니다</p>
          <p className="text-sm">운영자만 문의 관리에 접근할 수 있습니다.</p>
        </div>
      </div>
    );
  }

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

      <div className="flex h-full overflow-hidden">
        {/* 문의 목록 */}
        <div className={`
          ${isMobile ? (showRoomList ? 'w-full' : 'hidden') : 'w-80 border-r'}
          ${mergedTheme.roomListSectionClass}
        `}>
          {/* 헤더 */}
          <div className={mergedTheme.headerClass}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className={mergedTheme.headerTitleClass}>고객 문의 관리</h1>
                <p className={mergedTheme.headerSubtitleClass}>사용자 문의를 관리하세요</p>
              </div>
              {unreadCount > 0 && (
                <div className={mergedTheme.unreadBadgeClass}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </div>
              )}
            </div>
          </div>

          {/* 문의 목록 */}
          <div className="flex-1 overflow-y-auto">
            <ChatRoomListComponent
              rooms={rooms}
              currentRoomId={currentRoomId}
              onRoomSelect={handleRoomSelect}
              loading={loading}
            />
          </div>

          {/* 통계 정보 */}
          <div className={mergedTheme.statsContainerClass}>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className={`${mergedTheme.statItemClass} bg-blue-50`}>
                <div className={`${mergedTheme.statValueClass} text-blue-600`}>{rooms.length}</div>
                <div className={`${mergedTheme.statLabelClass} text-blue-800`}>총 문의</div>
              </div>
              <div className={`${mergedTheme.statItemClass} bg-red-50`}>
                <div className={`${mergedTheme.statValueClass} text-red-600`}>{unreadCount}</div>
                <div className={`${mergedTheme.statLabelClass} text-red-800`}>읽지 않음</div>
              </div>
            </div>
          </div>
        </div>

        {/* 채팅 윈도우 */}
        <div className={`
          ${isMobile ? (showRoomList ? 'hidden' : 'w-full') : 'flex-1'}
          ${mergedTheme.chatWindowSectionClass}
        `}>
          {currentRoom ? (
            <ChatWindowComponent
              room={currentRoom}
              currentUserId={user?.id || 'support_1'}
              onClose={isMobile ? handleCloseChat : undefined}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <p className="text-lg font-medium mb-2">문의를 선택해주세요</p>
                <p className="text-sm">왼쪽에서 처리할 문의를 선택하면 대화를 시작할 수 있습니다.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
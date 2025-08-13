import React from 'react';
import { ChatRoom, ChatRoomStatus } from '@/core/models/Chat';

interface ChatRoomListThemeProps {
  containerClass?: string;
  roomItemClass?: string;
  activeRoomClass?: string;
  loadingClass?: string;
  emptyStateClass?: string;
  roomNameClass?: string;
  lastMessageClass?: string;
  participantCountClass?: string;
  timeClass?: string;
  unreadBadgeClass?: string;
  statusBadgeClass?: string;
}

interface BaseChatRoomListProps {
  rooms: ChatRoom[];
  currentRoomId: string | null;
  onRoomSelect: (roomId: string) => void;
  loading?: boolean;
  theme?: ChatRoomListThemeProps;
}

export const BaseChatRoomList: React.FC<BaseChatRoomListProps> = ({
  rooms,
  currentRoomId,
  onRoomSelect,
  loading = false,
  theme = {}
}) => {
  // 기본 스타일
  const defaultTheme: ChatRoomListThemeProps = {
    containerClass: 'divide-y divide-gray-100',
    roomItemClass: 'p-4 cursor-pointer transition-colors hover:bg-gray-50',
    activeRoomClass: 'bg-blue-50 border-r-2 border-blue-500',
    loadingClass: 'p-4',
    emptyStateClass: 'p-4 text-center text-gray-500',
    roomNameClass: 'text-sm font-medium text-gray-900 truncate',
    lastMessageClass: 'text-sm text-gray-600 truncate',
    participantCountClass: 'flex items-center mt-1 text-xs text-gray-500',
    timeClass: 'text-xs text-gray-500 mb-1',
    unreadBadgeClass: 'bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1',
    statusBadgeClass: 'ml-2 px-2 py-0.5 text-xs rounded'
  };

  // 테마 병합
  const mergedTheme = { ...defaultTheme, ...theme };

  const formatTime = (date?: Date) => {
    if (!date) return '';
    
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes}분 전`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}시간 전`;
    } else {
      return date.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const truncateMessage = (message: string, maxLength: number = 30) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className={mergedTheme.loadingClass}>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className={mergedTheme.emptyStateClass}>
        <div className="mb-2">
          <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <p>참여 중인 채팅방이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className={mergedTheme.containerClass}>
      {rooms.map((room) => (
        <div
          key={room.id}
          onClick={() => onRoomSelect(room.id)}
          className={`${mergedTheme.roomItemClass} ${
            currentRoomId === room.id ? mergedTheme.activeRoomClass : ''
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* 채팅방 이름 */}
              <div className="flex items-center mb-1">
                <h3 className={mergedTheme.roomNameClass}>
                  {room.name || `채팅방 ${room.id.slice(-4)}`}
                </h3>
                {room.status === ChatRoomStatus.ARCHIVED && (
                  <span className={`${mergedTheme.statusBadgeClass} bg-gray-100 text-gray-600`}>
                    보관됨
                  </span>
                )}
                {room.status === ChatRoomStatus.CLOSED && (
                  <span className={`${mergedTheme.statusBadgeClass} bg-red-100 text-red-600`}>
                    종료됨
                  </span>
                )}
              </div>
              
              {/* 마지막 메시지 */}
              <p className={mergedTheme.lastMessageClass}>
                {room.lastMessage ? truncateMessage(room.lastMessage) : '메시지가 없습니다.'}
              </p>
              
              {/* 참여자 수 */}
              <div className={mergedTheme.participantCountClass}>
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                </svg>
                {room.participants.length}명
              </div>
            </div>
            
            <div className="ml-2 flex flex-col items-end">
              {/* 시간 */}
              <span className={mergedTheme.timeClass}>
                {formatTime(room.lastMessageTime)}
              </span>
              
              {/* 읽지 않은 메시지 수 */}
              {(room.unreadCount || 0) > 0 && (
                <div className={mergedTheme.unreadBadgeClass}>
                  {room.unreadCount! > 99 ? '99+' : room.unreadCount}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
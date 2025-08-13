import React from 'react';
import { Message, MessageStatus, ChatRole } from '@/core/models/Chat';

interface ChatMessageStyles {
  systemMessage: string;
  dateDivider: {
    line: string;
    text: string;
  };
  messageContainer: string;
  senderName: string;
  adminBadge: string;
  timeAndStatus: string;
  messageContent: {
    mine: string;
    admin: string;
    other: string;
    deleted: string;
  };
}

interface BaseChatMessageProps {
  message: Message;
  prevMessage?: Message;
  currentUserId?: string;
  showTime?: boolean;
  styles?: ChatMessageStyles;
}

const defaultStyles: ChatMessageStyles = {
  systemMessage: "bg-gray-100 rounded-full px-3 py-1 text-xs text-gray-600",
  dateDivider: {
    line: "flex-1 border-t border-gray-200",
    text: "px-3 text-xs text-gray-500 bg-white"
  },
  messageContainer: "max-w-[85%]",
  senderName: "text-sm font-medium mb-1 text-gray-700",
  adminBadge: "ml-1 bg-blue-100 text-blue-800 text-xs px-1.5 py-0.5 rounded",
  timeAndStatus: "text-xs text-gray-500",
  messageContent: {
    mine: "px-3 py-2 rounded-lg bg-blue-500 text-white rounded-br-none",
    admin: "px-3 py-2 rounded-lg bg-blue-50 text-blue-800 rounded-bl-none border border-blue-200",
    other: "px-3 py-2 rounded-lg bg-gray-100 text-gray-800 rounded-bl-none",
    deleted: "italic opacity-60"
  }
};

export const BaseChatMessage: React.FC<BaseChatMessageProps> = ({
  message,
  prevMessage,
  currentUserId = 'current_user',
  showTime = true,
  styles = defaultStyles
}) => {
  const isMine = message.senderId === currentUserId;
  const isSystem = message.senderRole === ChatRole.SYSTEM;
  const isAdmin = message.senderRole === ChatRole.ADMIN || message.senderRole === ChatRole.OPERATOR;
  
  // 시간 포맷팅
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };
  
  // 날짜 포맷팅
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };
  
  // 날짜가 다른지 확인
  const isDifferentDay = () => {
    if (!prevMessage) return true; // 첫 메시지는 항상 날짜 표시
    
    const prevDate = new Date(prevMessage.timestamp);
    const currDate = new Date(message.timestamp);
    
    return (
      prevDate.getFullYear() !== currDate.getFullYear() ||
      prevDate.getMonth() !== currDate.getMonth() ||
      prevDate.getDate() !== currDate.getDate()
    );
  };
  
  // 시스템 메시지 렌더링
  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className={styles.systemMessage}>
          {message.content}
        </div>
      </div>
    );
  }
  
  // 메시지 상태 표시
  const renderStatus = () => {
    if (!isMine) return null;
    
    switch (message.status) {
      case MessageStatus.PENDING:
        return <span className={styles.timeAndStatus}>전송중</span>;
      case MessageStatus.SENT:
        return <span className={styles.timeAndStatus}>✓</span>;
      case MessageStatus.DELIVERED:
        return <span className={styles.timeAndStatus}>✓✓</span>;
      case MessageStatus.READ:
        return <span className="text-blue-500 text-xs">✓✓</span>;
      case MessageStatus.FAILED:
        return <span className="text-red-500 text-xs">!</span>;
      default:
        return null;
    }
  };
  
  // 이름 표시 여부
  const shouldShowName = () => {
    if (isMine || isSystem) return false;
    return !prevMessage || prevMessage.senderId !== message.senderId;
  };
  
  return (
    <>
      {/* 날짜 구분선 */}
      {isDifferentDay() && (
        <div className="flex items-center my-4">
          <div className={styles.dateDivider.line}></div>
          <div className={styles.dateDivider.text}>
            {formatDate(new Date(message.timestamp))}
          </div>
          <div className={styles.dateDivider.line}></div>
        </div>
      )}
      
      <div className={`flex mb-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div className={`${styles.messageContainer} ${isMine ? 'order-1' : 'order-2'}`}>
        {/* 발신자 이름 */}
        {shouldShowName() && (
          <div className={`${styles.senderName} flex items-center`}>
            {message.senderName}
            {isAdmin && (
              <span className={styles.adminBadge}>
                {message.senderRole === ChatRole.ADMIN ? '관리자' : '운영자'}
              </span>
            )}
          </div>
        )}
        
        <div className="flex items-end">
          {/* 내 메시지인 경우 시간과 상태를 왼쪽에 */}
          {isMine && (
            <div className={`${styles.timeAndStatus} mr-2 mb-1 flex items-center`}>
              {showTime && formatTime(message.timestamp)}
              <span className="ml-1">{renderStatus()}</span>
            </div>
          )}
          
          {/* 메시지 내용 */}
          <div
            className={`max-w-full break-words ${
              isMine
                ? styles.messageContent.mine
                : isAdmin
                  ? styles.messageContent.admin
                  : styles.messageContent.other
            } ${message.isDeleted ? styles.messageContent.deleted : ''}`}
          >
            {message.isDeleted ? '삭제된 메시지입니다.' : message.content}
          </div>
          
          {/* 상대방 메시지인 경우 시간을 오른쪽에 */}
          {!isMine && (
            <div className={`${styles.timeAndStatus} ml-2 mb-1`}>
              {showTime && formatTime(message.timestamp)}
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

// 메모이제이션으로 성능 최적화
export default React.memo(BaseChatMessage, (prevProps, nextProps) => {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.status === nextProps.message.status &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.isDeleted === nextProps.message.isDeleted &&
    prevProps.showTime === nextProps.showTime &&
    prevProps.currentUserId === nextProps.currentUserId
  );
});
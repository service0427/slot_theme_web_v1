import React from 'react';
import { BaseChatRoomList } from '@/components/base/chat/BaseChatRoomList';
import { ChatRoom } from '@/core/models/Chat';

interface ChatRoomListProps {
  rooms: ChatRoom[];
  currentRoomId: string | null;
  onRoomSelect: (roomId: string) => void;
  loading?: boolean;
}

export const ChatRoomList: React.FC<ChatRoomListProps> = (props) => {
  return (
    <BaseChatRoomList {...props} />
  );
};
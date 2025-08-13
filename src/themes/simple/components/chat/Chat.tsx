import React from 'react';
import { BaseChat } from '@/components/base/chat/BaseChat';
import { ChatRoomList } from './ChatRoomList';
import { ChatWindow } from './ChatWindow';

interface ChatProps {
  currentUserId?: string;
  className?: string;
  height?: string;
}

export const Chat: React.FC<ChatProps> = (props) => {
  return (
    <BaseChat
      {...props}
      ChatRoomListComponent={ChatRoomList}
      ChatWindowComponent={ChatWindow}
    />
  );
};
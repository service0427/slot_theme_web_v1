import React from 'react';
import { BaseChatRoomList } from '@/components/base/chat/BaseChatRoomList';
import { luxuryChatStyles } from '../../styles/chatStyles';

export const ChatRoomList: React.FC<any> = (props) => {
  return (
    <BaseChatRoomList
      {...props}
      theme={{
        containerClass: luxuryChatStyles.roomList.container,
        roomItemClass: luxuryChatStyles.roomList.roomItem,
        activeRoomClass: luxuryChatStyles.roomList.roomItemActive,
        roomNameClass: luxuryChatStyles.roomList.roomName,
        lastMessageClass: luxuryChatStyles.roomList.roomMessage,
        timeClass: luxuryChatStyles.roomList.roomTime,
        unreadBadgeClass: luxuryChatStyles.roomList.unreadBadge,
        emptyStateClass: luxuryChatStyles.roomList.emptyState
      }}
    />
  );
};

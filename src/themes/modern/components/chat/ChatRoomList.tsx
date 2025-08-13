import React from 'react';
import { BaseChatRoomList } from '@/components/base/chat/BaseChatRoomList';
import { modernChatStyles } from '../../styles/chatStyles';

export const ChatRoomList: React.FC<any> = (props) => {
  return (
    <BaseChatRoomList
      {...props}
      theme={{
        containerClass: modernChatStyles.roomList.container,
        roomItemClass: modernChatStyles.roomList.roomItem,
        activeRoomClass: modernChatStyles.roomList.roomItemActive,
        roomNameClass: modernChatStyles.roomList.roomName,
        lastMessageClass: modernChatStyles.roomList.roomMessage,
        timeClass: modernChatStyles.roomList.roomTime,
        unreadBadgeClass: modernChatStyles.roomList.unreadBadge,
        emptyStateClass: modernChatStyles.roomList.emptyState
      }}
    />
  );
};

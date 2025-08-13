import React from 'react';
import { BaseSupportManager } from '@/components/base/chat/BaseSupportManager';
import { ChatRoomList } from './ChatRoomList';
import { ChatWindow } from './ChatWindow';

interface SupportManagerProps {
  className?: string;
  height?: string;
}

export const SupportManager: React.FC<SupportManagerProps> = (props) => {
  return (
    <BaseSupportManager
      {...props}
      ChatRoomListComponent={ChatRoomList}
      ChatWindowComponent={ChatWindow}
    />
  );
};
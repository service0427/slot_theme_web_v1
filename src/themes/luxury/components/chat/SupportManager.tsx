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
      theme={{
        containerClass: 'bg-white rounded-2xl shadow-xl overflow-hidden border border-amber-200/50',
        headerClass: 'bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-200 px-5 py-4',
        headerTitleClass: 'text-xl font-bold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent',
        headerSubtitleClass: 'text-sm text-gray-600',
        unreadBadgeClass: 'bg-gradient-to-r from-amber-400 to-yellow-400 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-2 font-bold shadow-md',
        statsContainerClass: 'border-t border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 p-5',
        statItemClass: 'p-3 rounded-xl bg-white border border-amber-200',
        statValueClass: 'text-2xl font-bold text-amber-600',
        statLabelClass: 'text-xs font-medium uppercase tracking-wider text-gray-600',
        roomListSectionClass: 'bg-gradient-to-b from-white to-amber-50/20 flex flex-col',
        chatWindowSectionClass: 'flex flex-col relative bg-white'
      }}
    />
  );
};

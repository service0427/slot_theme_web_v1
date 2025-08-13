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
        containerClass: 'bg-white rounded-2xl shadow-xl overflow-hidden',
        headerClass: 'bg-gradient-to-r from-violet-50 to-indigo-50 border-b px-4 py-3',
        headerTitleClass: 'text-lg font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent',
        headerSubtitleClass: 'text-sm text-slate-600',
        unreadBadgeClass: 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-2',
        statsContainerClass: 'border-t bg-gradient-to-r from-violet-50 to-indigo-50 p-4',
        statItemClass: 'p-3 rounded-xl',
        statValueClass: 'text-2xl font-bold',
        statLabelClass: 'text-xs font-medium'
      }}
    />
  );
};

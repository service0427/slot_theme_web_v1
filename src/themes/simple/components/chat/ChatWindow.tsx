import React from 'react';
import { BaseChatWindow } from '@/components/base/chat/BaseChatWindow';
import ChatMessage from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatRoom } from '@/core/models/Chat';

interface ChatWindowProps {
  room: ChatRoom | null;
  currentUserId?: string;
  onClose?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = (props) => {
  return (
    <BaseChatWindow
      {...props}
      ChatMessageComponent={ChatMessage}
      ChatInputComponent={ChatInput}
    />
  );
};
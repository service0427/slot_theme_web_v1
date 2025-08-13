import React from 'react';
import { BaseSupportChat } from '@/components/base/chat/BaseSupportChat';
import ChatMessage from './ChatMessage';
import { ChatInput } from './ChatInput';

interface SupportChatProps {
  className?: string;
  height?: string;
  onClose?: () => void;
}

export const SupportChat: React.FC<SupportChatProps> = (props) => {
  return (
    <BaseSupportChat
      {...props}
      ChatMessageComponent={ChatMessage}
      ChatInputComponent={ChatInput}
    />
  );
};
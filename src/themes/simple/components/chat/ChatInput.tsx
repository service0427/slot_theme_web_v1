import React from 'react';
import { BaseChatInput } from '@/components/base/chat/BaseChatInput';

interface ChatInputProps {
  onSendMessage: (content: string) => Promise<boolean>;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = (props) => {
  return (
    <BaseChatInput {...props} />
  );
};
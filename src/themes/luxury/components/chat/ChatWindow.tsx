import React from 'react';
import { BaseChatWindow } from '@/components/base/chat/BaseChatWindow';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { luxuryChatStyles } from '../../styles/chatStyles';

export const ChatWindow: React.FC<any> = (props) => {
  return (
    <BaseChatWindow
      {...props}
      ChatMessageComponent={ChatMessage}
      ChatInputComponent={ChatInput}
      theme={{
        containerClass: luxuryChatStyles.window.container,
        headerClass: luxuryChatStyles.window.header,
        messagesContainerClass: luxuryChatStyles.window.messagesContainer
      }}
    />
  );
};

import React from 'react';
import { BaseChatWindow } from '@/components/base/chat/BaseChatWindow';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { modernChatStyles } from '../../styles/chatStyles';

export const ChatWindow: React.FC<any> = (props) => {
  return (
    <BaseChatWindow
      {...props}
      ChatMessageComponent={ChatMessage}
      ChatInputComponent={ChatInput}
      theme={{
        containerClass: modernChatStyles.window.container,
        headerClass: modernChatStyles.window.header,
        messagesContainerClass: modernChatStyles.window.messagesContainer
      }}
    />
  );
};

import { BaseChatTestPage } from '@/components/base/BaseChatTestPage';
import { SupportChat } from '../components/chat/SupportChat';
import { SupportManager } from '../components/chat/SupportManager';

export function ChatTestPage() {
  return (
    <BaseChatTestPage
      SupportChat={SupportChat}
      SupportManager={SupportManager}
    />
  );
}
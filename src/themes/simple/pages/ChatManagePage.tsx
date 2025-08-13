import { BaseChatManagePage } from '@/components/base/BaseChatManagePage';
import { SupportManager } from '../components/chat/SupportManager';

export function ChatManagePage() {
  return (
    <BaseChatManagePage 
      SupportManager={SupportManager}
    />
  );
}
import { BaseChatManagePage } from '@/components/base/BaseChatManagePage';
import { SupportManager } from '../components/chat/SupportManager';

export function ChatManagePage() {
  return (
    <BaseChatManagePage
      SupportManager={SupportManager}
      className="h-full flex flex-col"
      headerClassName="p-6 pb-4 bg-gradient-to-r from-violet-50 to-indigo-50"
      titleClassName="text-2xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent"
      descriptionClassName="text-slate-600 mt-2"
      contentClassName="flex-1 px-6 pb-6"
    />
  );
}
import { BaseChatManagePage } from '@/components/base/BaseChatManagePage';
import { SupportManager } from '../components/chat/SupportManager';

export function ChatManagePage() {
  return (
    <BaseChatManagePage
      SupportManager={SupportManager}
      className="h-full flex flex-col bg-gradient-to-br from-slate-900 to-slate-800"
      headerClassName="p-6 pb-4"
      titleClassName="text-2xl font-bold text-amber-100"
      descriptionClassName="text-amber-200/80 mt-2"
      contentClassName="flex-1 px-6 pb-6"
    />
  );
}
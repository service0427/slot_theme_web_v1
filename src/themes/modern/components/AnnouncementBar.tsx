import { BaseAnnouncementBar } from '@/components/base/BaseAnnouncementBar';
import { Megaphone } from 'lucide-react';

export function AnnouncementBar() {
  return (
    <BaseAnnouncementBar
      className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm shadow-lg"
      iconComponent={
        <div className="animate-pulse">
          <Megaphone size={18} className="text-white" />
        </div>
      }
      closeButtonClassName="text-white hover:bg-white/20 rounded-full"
      titleClassName="font-semibold text-white"
      contentClassName="text-white/95"
    />
  );
}
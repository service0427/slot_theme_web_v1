import { BaseAnnouncementBar } from '@/components/base/BaseAnnouncementBar';
import { Crown } from 'lucide-react';

export function AnnouncementBar() {
  return (
    <BaseAnnouncementBar
      className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 border-y border-amber-300 text-amber-900 shadow-md"
      iconComponent={
        <div className="relative">
          <div className="absolute inset-0 animate-ping">
            <Crown size={16} className="text-amber-500 opacity-75" />
          </div>
          <Crown size={16} className="text-amber-600 relative" />
        </div>
      }
      closeButtonClassName="text-amber-700 hover:bg-amber-200 rounded-full transition-all"
      titleClassName="font-bold text-amber-900"
      contentClassName="text-amber-800"
    />
  );
}
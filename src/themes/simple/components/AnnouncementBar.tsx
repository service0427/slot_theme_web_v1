import { BaseAnnouncementBar } from '@/components/base/BaseAnnouncementBar';
import { Info } from 'lucide-react';

export function AnnouncementBar() {
  return (
    <BaseAnnouncementBar
      className="bg-blue-500 text-white text-sm"
      iconComponent={<Info size={16} className="text-white" />}
      closeButtonClassName="text-white hover:bg-blue-600"
      titleClassName="font-medium"
      contentClassName="text-white/90"
    />
  );
}
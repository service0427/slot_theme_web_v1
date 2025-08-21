import { BaseSlotListPage } from '@/components/base/BaseSlotListPage';
import { SlotRegistrationModal } from '../components/SlotRegistrationModal';
import { SlotBulkRegistrationModal } from '../components/SlotBulkRegistrationModal';
import { UserSlotCard } from '../components/UserSlotCard';
import { UserSlotListItem } from '../components/UserSlotListItem';

export function SlotListPage() {
  // Luxury 테마도 BaseSlotListPage 사용
  return (
    <BaseSlotListPage
      SlotRegistrationModal={SlotRegistrationModal}
      SlotBulkRegistrationModal={SlotBulkRegistrationModal}
      UserSlotCard={UserSlotCard}
      UserSlotListItem={UserSlotListItem}
    />
  );
}
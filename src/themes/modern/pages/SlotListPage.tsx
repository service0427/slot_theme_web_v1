import { BaseSlotListPage } from '@/components/base/BaseSlotListPage';
import { SlotRegistrationModal } from '../components/SlotRegistrationModal';
import { SlotBulkRegistrationModal } from '../components/SlotBulkRegistrationModal';
import { UserSlotCard } from '../components/UserSlotCard';
import { UserSlotListItem } from '../components/UserSlotListItem';

export function SlotListPage() {
  return (
    <BaseSlotListPage
      SlotRegistrationModal={SlotRegistrationModal}
      SlotBulkRegistrationModal={SlotBulkRegistrationModal}
      UserSlotCard={UserSlotCard}
      UserSlotListItem={UserSlotListItem}
    />
  );
}

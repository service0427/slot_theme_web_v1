import { BaseCashChargeModal } from '@/components/base/BaseCashChargeModal';
import { CashChargeForm } from './CashChargeForm';

interface CashChargeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CashChargeModal({ isOpen, onClose }: CashChargeModalProps) {
  return (
    <BaseCashChargeModal 
      isOpen={isOpen}
      onClose={onClose}
      CashChargeForm={CashChargeForm}
    />
  );
}
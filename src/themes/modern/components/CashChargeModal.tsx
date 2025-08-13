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
      overlayClassName="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm"
      modalClassName="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
      titleClassName="text-lg font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent"
    />
  );
}

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
      overlayClassName="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md"
      modalClassName="relative bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6 border border-amber-500/20"
      titleClassName="text-lg font-bold text-amber-100"
      closeButtonClassName="absolute top-4 right-4 text-amber-200 hover:text-amber-100"
    />
  );
}

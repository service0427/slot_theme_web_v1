import { BaseCashChargeForm } from '@/components/base/BaseCashChargeForm';

interface CashChargeFormProps {
  onSubmit: (data: {
    amount: number;
    depositAt: Date;
    accountHolder: string;
  }) => void;
}

export function CashChargeForm({ onSubmit }: CashChargeFormProps) {
  return (
    <BaseCashChargeForm onSubmit={onSubmit} />
  );
}
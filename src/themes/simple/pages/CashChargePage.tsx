import { BaseCashChargePage } from '@/components/base/BaseCashChargePage';
import { CashChargeForm } from '../components/CashChargeForm';

export function CashChargePage() {
  return (
    <BaseCashChargePage 
      CashChargeForm={CashChargeForm}
    />
  );
}
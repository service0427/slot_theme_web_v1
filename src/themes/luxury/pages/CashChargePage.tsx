import { BaseCashChargePage } from '@/components/base/BaseCashChargePage';
import { CashChargeForm } from '../components/CashChargeForm';

export function CashChargePage() {
  return (
    <BaseCashChargePage 
      CashChargeForm={CashChargeForm}
      className="max-w-3xl mx-auto p-12"
      cardClassName="bg-gradient-to-br from-gold-50 via-white to-gold-50 rounded-2xl p-10 mb-10 border-2 border-gold-200 shadow-xl"
      titleClassName="text-4xl font-bold mb-10 text-gold-800 text-center"
      balanceClassName="text-5xl font-bold text-gold-600"
    />
  );
}
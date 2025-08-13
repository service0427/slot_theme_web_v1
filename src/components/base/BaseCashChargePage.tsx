import { useCashContext } from '@/adapters/react';

interface BaseCashChargePageProps {
  CashChargeForm: React.ComponentType<any>;
  className?: string;
  cardClassName?: string;
  titleClassName?: string;
  balanceClassName?: string;
}

export function BaseCashChargePage({ 
  CashChargeForm, 
  className = "max-w-2xl mx-auto p-6",
  cardClassName = "bg-white rounded-lg shadow-md p-6 mb-6",
  titleClassName = "text-2xl font-bold mb-6",
  balanceClassName = "text-3xl font-bold text-blue-600"
}: BaseCashChargePageProps) {
  const { balance, createChargeRequest } = useCashContext();

  const handleSubmit = async (data: any) => {
    const success = await createChargeRequest(data);
    if (success) {
      // 충전 요청 성공 처리
      alert('충전 요청이 완료되었습니다.');
    }
  };

  return (
    <div className={className}>
      <h1 className={titleClassName}>캐시 충전</h1>
      
      <div className={cardClassName}>
        <h2 className="text-lg font-semibold mb-2">현재 잔액</h2>
        <p className={balanceClassName}>
          {balance ? balance.amount.toLocaleString() : '0'}원
        </p>
      </div>

      <CashChargeForm onSubmit={handleSubmit} />
    </div>
  );
}
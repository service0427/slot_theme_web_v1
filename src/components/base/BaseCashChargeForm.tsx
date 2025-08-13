import { useState } from 'react';

interface BaseCashChargeFormProps {
  onSubmit: (data: {
    amount: number;
    depositAt: Date;
    accountHolder: string;
  }) => void;
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
  presetButtonSelectedClassName?: string;
  presetButtonDefaultClassName?: string;
  submitButtonClassName?: string;
  totalSectionClassName?: string;
  totalTextClassName?: string;
  totalAmountClassName?: string;
  presetAmounts?: number[];
}

export function BaseCashChargeForm({
  onSubmit,
  containerClassName = "bg-white rounded-lg shadow-md p-6 space-y-6",
  labelClassName = "block text-sm font-medium text-gray-700 mb-2",
  inputClassName = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500",
  presetButtonSelectedClassName = "py-2 px-3 rounded border bg-blue-600 text-white border-blue-600",
  presetButtonDefaultClassName = "py-2 px-3 rounded border bg-white text-gray-700 border-gray-300 hover:bg-gray-50",
  submitButtonClassName = "w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors",
  totalSectionClassName = "border-t pt-4",
  totalTextClassName = "flex justify-between items-center text-lg font-bold",
  totalAmountClassName = "text-blue-600",
  presetAmounts = [10000, 30000, 50000, 100000, 300000, 500000]
}: BaseCashChargeFormProps) {
  const [amount, setAmount] = useState('');
  const [depositAt, setDepositAt] = useState('');
  const [accountHolder, setAccountHolder] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      amount: parseInt(amount),
      depositAt: new Date(depositAt),
      accountHolder
    });
  };

  return (
    <form onSubmit={handleSubmit} className={containerClassName}>
      <div>
        <label className={labelClassName}>
          충전 금액
        </label>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {presetAmounts.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(preset.toString())}
              className={
                amount === preset.toString()
                  ? presetButtonSelectedClassName
                  : presetButtonDefaultClassName
              }
            >
              {preset.toLocaleString()}원
            </button>
          ))}
        </div>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="직접 입력"
          className={inputClassName}
          required
        />
      </div>

      <div>
        <label className={labelClassName}>
          입금 예정일
        </label>
        <input
          type="datetime-local"
          value={depositAt}
          onChange={(e) => setDepositAt(e.target.value)}
          className={inputClassName}
          required
        />
      </div>

      <div>
        <label className={labelClassName}>
          입금자명
        </label>
        <input
          type="text"
          value={accountHolder}
          onChange={(e) => setAccountHolder(e.target.value)}
          placeholder="홍길동"
          className={inputClassName}
          required
        />
      </div>

      <div className={totalSectionClassName}>
        <div className={totalTextClassName}>
          <span>충전 금액</span>
          <span className={totalAmountClassName}>{amount ? parseInt(amount).toLocaleString() : '0'}원</span>
        </div>
      </div>

      <button
        type="submit"
        className={submitButtonClassName}
      >
        충전 신청
      </button>
    </form>
  );
}
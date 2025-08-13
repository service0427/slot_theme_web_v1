import { BaseUserBalance } from '@/components/base/BaseUserBalance';

interface UserBalanceProps {
  balance: number;
}

export function UserBalance({ balance }: UserBalanceProps) {
  // Simple 테마는 기본 스타일 사용
  return <BaseUserBalance balance={balance} />;
}
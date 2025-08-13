interface UserBalanceStyles {
  container: string;
  label: string;
  amount: string;
}

interface BaseUserBalanceProps {
  balance: number;
  styles?: UserBalanceStyles;
}

const defaultStyles: UserBalanceStyles = {
  container: "bg-white rounded-lg shadow-sm p-4",
  label: "text-sm text-gray-600 mb-1",
  amount: "text-2xl font-bold text-blue-600"
};

export function BaseUserBalance({ balance, styles = defaultStyles }: BaseUserBalanceProps) {
  return (
    <div className={styles.container}>
      <p className={styles.label}>보유 캐시</p>
      <p className={styles.amount}>
        {balance.toLocaleString()}원
      </p>
    </div>
  );
}
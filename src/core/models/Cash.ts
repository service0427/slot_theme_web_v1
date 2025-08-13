export interface Balance {
  userId: string;
  amount: number;
  updatedAt: Date;
}

export interface ChargeRequest {
  id: string;
  userId: string;
  amount: number;
  bonusPercentage: number;
  bonusAmount: number;
  depositAt?: Date;
  accountHolder?: string;
  status: ChargeStatus;
  requestedAt: Date;
  processedAt?: Date;
  processorId?: string;
  rejectionReason?: string;
}

export type ChargeStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface CashTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  balanceType: 'paid' | 'free' | 'mixed';
  description?: string;
  referenceId?: string;
  transactionAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export type TransactionType = 'charge' | 'purchase' | 'refund' | 'withdrawal' | 'bonus' | 'expire';

export class BalanceModel implements Balance {
  constructor(
    public userId: string,
    public amount: number,
    public updatedAt: Date
  ) {}

  canAfford(amount: number): boolean {
    return this.amount >= amount;
  }

  add(amount: number): void {
    this.amount += amount;
    this.updatedAt = new Date();
  }

  subtract(amount: number): void {
    if (!this.canAfford(amount)) {
      throw new Error('잔액이 부족합니다.');
    }
    this.amount -= amount;
    this.updatedAt = new Date();
  }
}
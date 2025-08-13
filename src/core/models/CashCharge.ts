export type CashChargeStatus = 'pending' | 'approved' | 'rejected';

export interface CashCharge {
  id: string;
  userId: string;
  amount: number;
  status: CashChargeStatus;
  depositAt?: Date;
  accountHolder?: string;
  createdAt: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
}
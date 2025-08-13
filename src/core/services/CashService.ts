import { Balance, ChargeRequest, CashTransaction, BalanceModel } from '../models/Cash';
import { CashCharge } from '../models/CashCharge';
import { EventEmitter } from '../utils/EventEmitter';

export interface ChargeRequestParams {
  amount: number;
  depositAt?: Date;
  accountHolder?: string;
}

export interface CashResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ICashService {
  getBalance(userId: string): Promise<CashResult<Balance>>;
  createChargeRequest(userId: string, params: ChargeRequestParams): Promise<CashResult<ChargeRequest>>;
  getChargeRequests(userId?: string): Promise<CashResult<{ requests: ChargeRequest[] }>>;
  getCashHistory(userId?: string): Promise<CashResult<{ history: CashTransaction[] }>>;
  deductBalance(userId: string, amount: number, description: string): Promise<CashResult<void>>;
  onBalanceChange(callback: (balance: Balance) => void): () => void;
  
  // 관리자 기능
  getAllPendingCharges(): Promise<CashResult<CashCharge[]>>;
  approveCashCharge(chargeId: string): Promise<CashResult<void>>;
  rejectCashCharge(chargeId: string): Promise<CashResult<void>>;
}

export abstract class BaseCashService implements ICashService {
  protected balances = new Map<string, BalanceModel>();
  protected eventEmitter = new EventEmitter<{
    balanceChange: Balance;
  }>();

  abstract getBalance(userId: string): Promise<CashResult<Balance>>;
  abstract createChargeRequest(userId: string, params: ChargeRequestParams): Promise<CashResult<ChargeRequest>>;
  abstract getChargeRequests(userId?: string): Promise<CashResult<{ requests: ChargeRequest[] }>>;
  abstract getCashHistory(userId?: string): Promise<CashResult<{ history: CashTransaction[] }>>;
  abstract deductBalance(userId: string, amount: number, description: string): Promise<CashResult<void>>;
  
  // 관리자 기능
  abstract getAllPendingCharges(): Promise<CashResult<CashCharge[]>>;
  abstract approveCashCharge(chargeId: string): Promise<CashResult<void>>;
  abstract rejectCashCharge(chargeId: string): Promise<CashResult<void>>;

  onBalanceChange(callback: (balance: Balance) => void): () => void {
    return this.eventEmitter.on('balanceChange', callback);
  }

  protected updateBalance(userId: string, amount: number): void {
    const balance = this.balances.get(userId);
    if (balance) {
      balance.add(amount);
      this.eventEmitter.emit('balanceChange', balance);
    }
  }
}
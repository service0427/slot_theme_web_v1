import { BaseCashService, ChargeRequestParams, CashResult } from '@/core/services/CashService';
import { Balance, ChargeRequest, CashTransaction, BalanceModel, ChargeStatus, TransactionType } from '@/core/models/Cash';
import { CashCharge, CashChargeStatus } from '@/core/models/CashCharge';
import { autoNotificationService } from '@/core/services/AutoNotificationService';

export class MockCashService extends BaseCashService {
  private chargeRequests: ChargeRequest[] = [];
  private cashCharges: CashCharge[] = []; // CashCharge로 변경
  private cashHistory: CashTransaction[] = [];
  private requestIdCounter = 1;
  private transactionIdCounter = 1;

  constructor() {
    super();
    // Mock 초기 잔액 설정
    this.balances.set('1', new BalanceModel('1', 50000, new Date()));
    
    // Mock 초기 충전 요청 (테스트용)
    this.initMockCharges();
  }

  private initMockCharges() {
    // 테스트용 대기중인 충전 요청들
    const mockCharges = [
      {
        userId: '2',
        amount: 100000,
        depositAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        accountHolder: '김철수'
      },
      {
        userId: '3',
        amount: 50000,
        depositAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        accountHolder: '이영희'
      },
      {
        userId: '4',
        amount: 200000,
        depositAt: new Date(Date.now() - 30 * 60 * 1000),
        accountHolder: '박민수'
      }
    ];

    mockCharges.forEach(charge => {
      const request: ChargeRequest = {
        id: `REQ-${this.requestIdCounter++}`,
        userId: charge.userId,
        amount: charge.amount,
        bonusPercentage: 0,
        bonusAmount: 0,
        depositAt: charge.depositAt,
        accountHolder: charge.accountHolder,
        status: 'pending' as ChargeStatus,
        requestedAt: new Date(charge.depositAt!.getTime() - 10 * 60 * 1000),
      };
      
      const cashCharge: CashCharge = {
        id: request.id,
        userId: charge.userId,
        amount: charge.amount,
        status: 'pending' as CashChargeStatus,
        depositAt: charge.depositAt,
        accountHolder: charge.accountHolder,
        createdAt: request.requestedAt
      };
      
      this.chargeRequests.push(request);
      this.cashCharges.push(cashCharge);
    });
  }

  async getBalance(userId: string): Promise<CashResult<Balance>> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    let balance = this.balances.get(userId);
    if (!balance) {
      balance = new BalanceModel(userId, 0, new Date());
      this.balances.set(userId, balance);
    }
    
    return {
      success: true,
      data: balance
    };
  }

  async createChargeRequest(userId: string, params: ChargeRequestParams): Promise<CashResult<ChargeRequest>> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const request: ChargeRequest = {
      id: `REQ-${this.requestIdCounter++}`,
      userId,
      amount: params.amount,
      bonusPercentage: 0,
      bonusAmount: 0,
      depositAt: params.depositAt,
      accountHolder: params.accountHolder,
      status: 'pending' as ChargeStatus,
      requestedAt: new Date(),
    };
    
    this.chargeRequests.push(request);
    
    // CashCharge 생성
    const cashCharge: CashCharge = {
      id: request.id,
      userId,
      amount: params.amount,
      status: 'pending' as CashChargeStatus,
      depositAt: params.depositAt,
      accountHolder: params.accountHolder,
      createdAt: new Date()
    };
    
    this.cashCharges.push(cashCharge);
    
    // 자동 알림 발송
    try {
      await autoNotificationService.onCashChargeRequested(userId, params.amount);
    } catch (error) {
      console.error('Failed to send cash charge request notification:', error);
    }
    
    return {
      success: true,
      data: request
    };
  }

  async getChargeRequests(userId?: string): Promise<CashResult<{ requests: ChargeRequest[] }>> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const requests = userId 
      ? this.chargeRequests.filter(r => r.userId === userId)
      : this.chargeRequests;
    
    return {
      success: true,
      data: { requests }
    };
  }

  async getCashHistory(userId?: string): Promise<CashResult<{ history: CashTransaction[] }>> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const history = userId
      ? this.cashHistory.filter(h => h.userId === userId)
      : this.cashHistory;
    
    return {
      success: true,
      data: { history }
    };
  }

  async deductBalance(userId: string, amount: number, description: string): Promise<CashResult<void>> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    let balance = this.balances.get(userId);
    if (!balance) {
      return {
        success: false,
        error: '사용자를 찾을 수 없습니다.'
      };
    }
    
    if (balance.amount < amount) {
      return {
        success: false,
        error: '잔액이 부족합니다.'
      };
    }
    
    // 잔액 차감
    balance.subtract(amount);
    this.eventEmitter.emit('balanceChange', balance);
    
    // 거래 내역 추가
    const transaction: CashTransaction = {
      id: `TRX-${this.transactionIdCounter++}`,
      userId,
      type: 'purchase' as TransactionType,
      amount: amount,
      balanceType: 'paid',
      description,
      transactionAt: new Date(),
    };
    
    this.cashHistory.push(transaction);
    
    return { success: true };
  }

  // 관리자 기능
  async getAllPendingCharges(): Promise<CashResult<CashCharge[]>> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const pendingCharges = this.cashCharges.filter(c => c.status === 'pending');
    
    return {
      success: true,
      data: pendingCharges
    };
  }

  async approveCashCharge(chargeId: string): Promise<CashResult<void>> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const charge = this.cashCharges.find(c => c.id === chargeId);
    if (!charge) {
      return {
        success: false,
        error: '충전 요청을 찾을 수 없습니다.'
      };
    }
    
    if (charge.status !== 'pending') {
      return {
        success: false,
        error: '대기 중인 요청만 승인할 수 있습니다.'
      };
    }
    
    // 상태 변경
    charge.status = 'approved';
    charge.approvedAt = new Date();
    
    // chargeRequests도 업데이트
    const request = this.chargeRequests.find(r => r.id === chargeId);
    if (request) {
      request.status = 'approved' as ChargeStatus;
      request.processedAt = new Date();
      request.processorId = 'admin';
    }
    
    // 잔액 업데이트
    this.updateBalance(charge.userId, charge.amount);
    
    // 거래 내역 추가
    const transaction: CashTransaction = {
      id: `TRX-${this.transactionIdCounter++}`,
      userId: charge.userId,
      type: 'charge' as TransactionType,
      amount: charge.amount,
      balanceType: 'paid',
      description: '캐시 충전',
      referenceId: charge.id,
      transactionAt: new Date(),
    };
    
    this.cashHistory.push(transaction);
    
    // 자동 알림 발송
    try {
      await autoNotificationService.onCashChargeApproved(charge.userId, charge.amount);
    } catch (error) {
      console.error('Failed to send cash charge approval notification:', error);
    }
    
    return { success: true };
  }

  async rejectCashCharge(chargeId: string): Promise<CashResult<void>> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const charge = this.cashCharges.find(c => c.id === chargeId);
    if (!charge) {
      return {
        success: false,
        error: '충전 요청을 찾을 수 없습니다.'
      };
    }
    
    if (charge.status !== 'pending') {
      return {
        success: false,
        error: '대기 중인 요청만 거부할 수 있습니다.'
      };
    }
    
    // 상태 변경
    charge.status = 'rejected';
    charge.rejectedAt = new Date();
    
    // chargeRequests도 업데이트
    const request = this.chargeRequests.find(r => r.id === chargeId);
    if (request) {
      request.status = 'rejected' as ChargeStatus;
      request.processedAt = new Date();
      request.processorId = 'admin';
    }
    
    // 자동 알림 발송
    try {
      await autoNotificationService.onCashChargeRejected(charge.userId, charge.amount, '관리자에 의해 거부됨');
    } catch (error) {
      console.error('Failed to send cash charge rejection notification:', error);
    }
    
    return { success: true };
  }
}
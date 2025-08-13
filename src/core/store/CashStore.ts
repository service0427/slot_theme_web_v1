import { Store } from './Store';
import { Balance, ChargeRequest, CashTransaction } from '../models/Cash';
import { CashCharge } from '../models/CashCharge';
import { ICashService, ChargeRequestParams } from '../services/CashService';

export interface CashState {
  balance: Balance | null;
  chargeRequests: ChargeRequest[];
  cashHistory: CashTransaction[];
  pendingCharges: CashCharge[]; // 관리자용
  isLoading: boolean;
  error: string | null;
}

export class CashStore extends Store<CashState> {
  constructor(
    private cashService: ICashService,
    private userId?: string // 관리자는 userId 없이 사용
  ) {
    super({
      balance: null,
      chargeRequests: [],
      cashHistory: [],
      pendingCharges: [],
      isLoading: false,
      error: null
    });

    // 잔액 변경 구독 (일반 사용자만)
    if (userId) {
      this.cashService.onBalanceChange((balance) => {
        if (balance.userId === this.userId) {
          this.setState({ balance });
        }
      });

      // 초기 데이터 로드
      this.loadBalance();
    }
  }

  async loadBalance(): Promise<void> {
    if (!this.userId) return;
    
    this.setState({ isLoading: true, error: null });
    
    try {
      const result = await this.cashService.getBalance(this.userId);
      
      if (result.success && result.data) {
        this.setState({
          balance: result.data,
          isLoading: false
        });
      } else {
        this.setState({
          error: result.error || '잔액 조회에 실패했습니다.',
          isLoading: false
        });
      }
    } catch (error) {
      this.setState({
        error: '잔액 조회 중 오류가 발생했습니다.',
        isLoading: false
      });
    }
  }

  async createChargeRequest(params: ChargeRequestParams): Promise<boolean> {
    if (!this.userId) return false;
    
    this.setState({ isLoading: true, error: null });
    
    try {
      const result = await this.cashService.createChargeRequest(this.userId, params);
      
      if (result.success && result.data) {
        // 충전 요청 목록 새로고침
        await this.loadChargeRequests();
        this.setState({ isLoading: false });
        return true;
      } else {
        this.setState({
          error: result.error || '충전 요청에 실패했습니다.',
          isLoading: false
        });
        return false;
      }
    } catch (error) {
      this.setState({
        error: '충전 요청 중 오류가 발생했습니다.',
        isLoading: false
      });
      return false;
    }
  }

  async loadChargeRequests(): Promise<void> {
    if (!this.userId) return;
    
    try {
      const result = await this.cashService.getChargeRequests(this.userId);
      
      if (result.success && result.data) {
        this.setState({ chargeRequests: result.data.requests });
      }
    } catch (error) {
      console.error('충전 요청 목록 조회 실패:', error);
    }
  }

  async loadCashHistory(): Promise<void> {
    if (!this.userId) return;
    
    try {
      const result = await this.cashService.getCashHistory(this.userId);
      
      if (result.success && result.data) {
        this.setState({ cashHistory: result.data.history });
      }
    } catch (error) {
      console.error('캐시 내역 조회 실패:', error);
    }
  }

  // 관리자 기능
  async loadPendingCharges(): Promise<void> {
    this.setState({ isLoading: true, error: null });
    
    try {
      const result = await this.cashService.getAllPendingCharges();
      
      if (result.success && result.data) {
        this.setState({
          pendingCharges: result.data,
          isLoading: false
        });
      } else {
        this.setState({
          error: result.error || '대기중인 충전 요청 조회에 실패했습니다.',
          isLoading: false
        });
      }
    } catch (error) {
      this.setState({
        error: '대기중인 충전 요청 조회 중 오류가 발생했습니다.',
        isLoading: false
      });
    }
  }

  async approveCashCharge(chargeId: string): Promise<boolean> {
    try {
      const result = await this.cashService.approveCashCharge(chargeId);
      if (result.success) {
        await this.loadPendingCharges();
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  async rejectCashCharge(chargeId: string): Promise<boolean> {
    try {
      const result = await this.cashService.rejectCashCharge(chargeId);
      if (result.success) {
        await this.loadPendingCharges();
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }
}
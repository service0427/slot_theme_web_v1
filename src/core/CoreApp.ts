import { IAuthService } from './services/AuthService';
import { ICashService } from './services/CashService';
import { ISlotService } from './services/SlotService';
import { AuthStore } from './store/AuthStore';
import { CashStore } from './store/CashStore';
import { SlotStore } from './store/SlotStore';

export interface CoreAppConfig {
  authService: IAuthService;
  cashService: ICashService;
  slotService: ISlotService;
}

export class CoreApp {
  private authStore: AuthStore;
  private cashStores = new Map<string, CashStore>();
  private slotStores = new Map<string, SlotStore>();
  
  constructor(private config: CoreAppConfig) {
    this.authStore = new AuthStore(config.authService);
  }

  getAuthStore(): AuthStore {
    return this.authStore;
  }

  getCashStore(userId?: string): CashStore {
    const key = userId || 'admin';
    if (!this.cashStores.has(key)) {
      this.cashStores.set(key, new CashStore(this.config.cashService, userId));
    }
    return this.cashStores.get(key)!;
  }

  getSlotStore(userId?: string): SlotStore {
    const key = userId || 'admin';
    if (!this.slotStores.has(key)) {
      this.slotStores.set(key, new SlotStore(this.config.slotService, userId));
    }
    return this.slotStores.get(key)!;
  }

  // 사용자가 로그아웃하면 관련 스토어 정리
  cleanup(userId: string): void {
    this.cashStores.delete(userId);
    this.slotStores.delete(userId);
  }
}
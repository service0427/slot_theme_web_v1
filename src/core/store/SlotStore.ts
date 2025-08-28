import { Store } from './Store';
import { UserSlot } from '../models/UserSlot';
import { ISlotService, CreateSlotParams, UpdateSlotParams } from '../services/SlotService';

export interface SlotState {
  slots: UserSlot[];
  pendingSlots: UserSlot[]; // 관리자용
  slotPrice: number;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
  systemStats: {
    operationMode: string;
    totalSlots: number;
    statusBreakdown: {
      empty: number;
      pending: number;
      rejected: number;
      active: number;
      waiting: number;
      scheduled: number;
      paused: number;
      expired: number;
      all: number;
    };
    themes: string[];
    testSlots: number;
    refundedSlots: number;
  } | null;
}

export class SlotStore extends Store<SlotState> {
  constructor(
    private slotService: ISlotService,
    private userId?: string // 관리자는 userId 없이 사용
  ) {
    super({
      slots: [],
      pendingSlots: [],
      slotPrice: 0,
      isLoading: false,
      error: null,
      pagination: null,
      systemStats: null
    });

    // 슬롯 가격 로드
    this.loadSlotPrice();
    
    // 사용자 슬롯 로드
    if (userId) {
      this.loadUserSlots();
    }
  }

  async loadSlotPrice(): Promise<void> {
    try {
      const price = await this.slotService.getSlotPrice();
      this.setState({ slotPrice: price });
    } catch (error) {
      console.error('슬롯 가격 로드 실패:', error);
    }
  }

  async loadUserSlots(page: number = 1, limit: number = 50): Promise<void> {
    if (!this.userId) return;
    
    this.setState({ isLoading: true, error: null });
    
    try {
      const result = await this.slotService.getUserSlots(this.userId, page, limit);
      
      if (result.success && result.data) {
        this.setState({
          slots: result.data.items,
          pagination: result.data.pagination,
          isLoading: false
        });
      } else {
        this.setState({
          error: result.error || '슬롯 목록 조회에 실패했습니다.',
          isLoading: false
        });
      }
    } catch (error) {
      this.setState({
        error: '슬롯 목록 조회 중 오류가 발생했습니다.',
        isLoading: false
      });
    }
  }

  async createSlot(params: CreateSlotParams): Promise<boolean> {
    if (!this.userId) return false;
    
    this.setState({ isLoading: true, error: null });
    
    try {
      const result = await this.slotService.createSlot(this.userId, params);
      
      if (result.success && result.data) {
        // 슬롯 목록 새로고침
        await this.loadUserSlots();
        return true;
      } else {
        this.setState({
          error: result.error || '슬롯 생성에 실패했습니다.',
          isLoading: false
        });
        return false;
      }
    } catch (error) {
      this.setState({
        error: '슬롯 생성 중 오류가 발생했습니다.',
        isLoading: false
      });
      return false;
    }
  }

  async updateSlot(slotId: string, params: UpdateSlotParams): Promise<boolean> {
    this.setState({ isLoading: true, error: null });
    
    try {
      const result = await this.slotService.updateSlot(slotId, params);
      
      if (result.success) {
        await this.loadUserSlots();
        return true;
      } else {
        this.setState({
          error: result.error || '슬롯 수정에 실패했습니다.',
          isLoading: false
        });
        return false;
      }
    } catch (error) {
      this.setState({
        error: '슬롯 수정 중 오류가 발생했습니다.',
        isLoading: false
      });
      return false;
    }
  }

  async pauseSlot(slotId: string): Promise<boolean> {
    // 즉시 UI 업데이트 (Optimistic Update)
    const updatedSlots = this.state.slots.map(slot => 
      slot.id === slotId ? { ...slot, status: 'paused' as const } : slot
    );
    this.setState({ slots: updatedSlots });

    try {
      const result = await this.slotService.pauseSlot(slotId);
      if (!result.success) {
        // 실패 시 원래 상태로 롤백
        const rollbackSlots = this.state.slots.map(slot => 
          slot.id === slotId ? { ...slot, status: 'active' as const } : slot
        );
        this.setState({ slots: rollbackSlots });
        return false;
      }
      return true;
    } catch (error) {
      // 오류 시 원래 상태로 롤백
      const rollbackSlots = this.state.slots.map(slot => 
        slot.id === slotId ? { ...slot, status: 'active' as const } : slot
      );
      this.setState({ slots: rollbackSlots });
      return false;
    }
  }

  async resumeSlot(slotId: string): Promise<boolean> {
    // 즉시 UI 업데이트 (Optimistic Update)
    const updatedSlots = this.state.slots.map(slot => 
      slot.id === slotId ? { ...slot, status: 'active' as const } : slot
    );
    this.setState({ slots: updatedSlots });

    try {
      const result = await this.slotService.resumeSlot(slotId);
      if (!result.success) {
        // 실패 시 원래 상태로 롤백
        const rollbackSlots = this.state.slots.map(slot => 
          slot.id === slotId ? { ...slot, status: 'paused' as const } : slot
        );
        this.setState({ slots: rollbackSlots });
        return false;
      }
      return true;
    } catch (error) {
      // 오류 시 원래 상태로 롤백
      const rollbackSlots = this.state.slots.map(slot => 
        slot.id === slotId ? { ...slot, status: 'paused' as const } : slot
      );
      this.setState({ slots: rollbackSlots });
      return false;
    }
  }

  // 관리자 기능 - 모든 슬롯 조회 (페이지네이션 포함)
  async loadAllSlots(statusFilter?: string, page: number = 1, limit: number = 50, searchQuery?: string): Promise<UserSlot[]> {
    this.setState({ isLoading: true, error: null });
    
    try {
      const result = await this.slotService.getAllSlots(statusFilter, page, limit, searchQuery);
      
      if (result.success && result.data) {
        this.setState({
          pendingSlots: result.data.items,
          pagination: result.data.pagination,
          isLoading: false
        });
        return result.data.items;
      } else {
        this.setState({
          error: result.error || '슬롯 조회에 실패했습니다.',
          isLoading: false
        });
        return [];
      }
    } catch (error) {
      this.setState({
        error: '슬롯 조회 중 오류가 발생했습니다.',
        isLoading: false
      });
      return [];
    }
  }

  // 관리자 기능 - 대기중인 슬롯만 조회 (기존 호환성 유지)
  async loadPendingSlots(): Promise<UserSlot[]> {
    return this.loadAllSlots('pending', 1, 50);
  }

  // 관리자 기능 - 시스템 전체 통계 조회
  async loadSystemStats(): Promise<void> {
    try {
      const result = await this.slotService.getSystemStats();
      if (result.success && result.data) {
        this.setState({ systemStats: result.data });
      }
    } catch (error) {
      console.error('시스템 통계 로드 실패:', error);
    }
  }

  // 관리자 기능 - 대기중인 슬롯 개수만 조회 (대시보드용)
  async loadPendingSlotCount(): Promise<number> {
    try {
      const result = await this.slotService.getPendingSlotCount();
      if (result.success && result.data) {
        return result.data.count;
      }
      return 0;
    } catch (error) {
      console.error('대기중인 슬롯 개수 로드 실패:', error);
      return 0;
    }
  }

  async approveSlot(slotId: string, approvedPrice?: number): Promise<boolean> {
    try {
      const result = await this.slotService.approveSlot(slotId, approvedPrice);
      if (result.success) {
        await this.loadPendingSlots();
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  async rejectSlot(slotId: string, reason: string): Promise<boolean> {
    try {
      const result = await this.slotService.rejectSlot(slotId, reason);
      if (result.success) {
        await this.loadPendingSlots();
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  // 빈 슬롯 채우기 (선슬롯발행 모드용)
  async fillEmptySlot(slotId: string, data: CreateSlotParams): Promise<boolean> {
    if (!this.userId) return false;
    
    this.setState({ isLoading: true, error: null });
    
    try {
      const result = await this.slotService.fillEmptySlot(slotId, data);
      
      if (result.success) {
        // 슬롯 목록 새로고침
        await this.loadUserSlots();
        return true;
      } else {
        this.setState({
          error: result.error || '슬롯 정보 입력에 실패했습니다.',
          isLoading: false
        });
        return false;
      }
    } catch (error) {
      this.setState({
        error: '슬롯 정보 입력 중 오류가 발생했습니다.',
        isLoading: false
      });
      return false;
    }
  }
}
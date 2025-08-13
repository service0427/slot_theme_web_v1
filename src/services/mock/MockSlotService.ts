import { BaseSlotService, CreateSlotParams, UpdateSlotParams, SlotResult } from '@/core/services/SlotService';
import { UserSlot, UserSlotModel } from '@/core/models/UserSlot';
import { ICashService } from '@/core/services/CashService';
import { autoNotificationService } from '@/core/services/AutoNotificationService';

export class MockSlotService extends BaseSlotService {
  private slots: UserSlotModel[] = [];
  private slotIdCounter = 1;
  private slotPrice = 50000; // 1슬롯 = 50,000원
  private useCashSystem: boolean;

  constructor(private cashService: ICashService, useCashSystem: boolean = true) {
    super();
    this.useCashSystem = useCashSystem;
    // Mock 초기 데이터
    this.initMockData();
  }

  private initMockData() {
    // 샘플 슬롯 데이터 - 페이징 테스트를 위해 더 많이 생성
    const sampleAds = [
      {
        customFields: {
          keywords: '마케팅 자동화, CRM, 고객관리',
          landingUrl: 'https://example.com/marketing-automation',
          mid: 'MID-001',
          adText: '효율적인 마케팅 자동화로 매출을 극대화하세요!'
        },
        status: 'active' as const,
        impressions: 15420,
        clicks: 823
      },
      {
        customFields: {
          keywords: 'SEO, 검색엔진, 최적화',
          landingUrl: 'https://example.com/seo-service',
          mid: ''
        },
        status: 'pending' as const,
        impressions: 0,
        clicks: 0
      },
      {
        customFields: {
          keywords: '클라우드, 호스팅, 서버',
          landingUrl: 'https://example.com/cloud-hosting',
          mid: 'MID-003'
        },
        status: 'active' as const,
        impressions: 8920,
        clicks: 412
      },
      {
        customFields: {
          keywords: '온라인교육, e러닝, 강의',
          landingUrl: 'https://example.com/online-edu',
          mid: 'MID-004'
        },
        status: 'paused' as const,
        impressions: 6230,
        clicks: 298
      },
      {
        customFields: {
          keywords: '프로젝트관리, 협업툴, PM',
          landingUrl: 'https://example.com/project-mgmt',
          mid: 'MID-005'
        },
        status: 'active' as const,
        impressions: 12890,
        clicks: 687
      },
      {
        customFields: {
          keywords: '이메일마케팅, 뉴스레터, EDM',
          landingUrl: 'https://example.com/email-marketing',
          mid: ''
        },
        status: 'rejected' as const,
        impressions: 0,
        clicks: 0,
        rejectionReason: '부적절한 광고 문구'
      }
    ];

    // 20개 정도의 슬롯 생성
    for (let i = 0; i < 20; i++) {
      const sample = sampleAds[i % sampleAds.length];
      const customFields: Record<string, string> = {};
      
      // 모든 필드를 문자열로 변환
      Object.keys(sample.customFields).forEach(key => {
        const value = sample.customFields[key as keyof typeof sample.customFields];
        if (value !== undefined) {
          customFields[key] = String(value);
        }
      });
      
      if (i > 5) {
        customFields.keywords += ` #${i - 5}`;
      }
      customFields.landingUrl = `https://example.com/ad${i + 1}`;
      
      const slot = new UserSlotModel(
        `SLOT-${i + 1}`,
        '1',
        sample.status,
        customFields,
        50000,
        sample.impressions + Math.floor(Math.random() * 1000),
        sample.clicks + Math.floor(Math.random() * 50),
        new Date(Date.now() - (20 - i) * 24 * 60 * 60 * 1000),
        new Date(),
        sample.status === 'active' ? new Date(Date.now() - (19 - i) * 24 * 60 * 60 * 1000) : undefined,
        sample.status === 'rejected' ? new Date(Date.now() - (19 - i) * 24 * 60 * 60 * 1000) : undefined,
        (sample as any).rejectionReason
      );
      this.slots.push(slot);
    }

    this.slotIdCounter = 21;
  }

  async getSlotPrice(): Promise<number> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.slotPrice;
  }

  async getUserSlots(userId: string): Promise<SlotResult<UserSlot[]>> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const userSlots = this.slots.filter(slot => slot.userId === userId);
    
    return {
      success: true,
      data: userSlots
    };
  }

  async createSlot(userId: string, params: CreateSlotParams): Promise<SlotResult<UserSlot>> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 캐시 시스템 사용 시에만 잔액 확인 및 차감
    if (this.useCashSystem) {
      // 잔액 확인
      const balanceResult = await this.cashService.getBalance(userId);
      if (!balanceResult.success || !balanceResult.data) {
        return {
          success: false,
          error: '잔액 조회에 실패했습니다.'
        };
      }
      
      const balance = balanceResult.data;
      if (balance.amount < this.slotPrice) {
        return {
          success: false,
          error: `캐시가 부족합니다. 필요 금액: ${this.slotPrice.toLocaleString()}원, 현재 잔액: ${balance.amount.toLocaleString()}원`
        };
      }
      
      // 캐시 차감
      const deductResult = await this.cashService.deductBalance(
        userId, 
        this.slotPrice, 
        `슬롯 등록: ${params.customFields.keywords || '키워드 없음'}`
      );
      
      if (!deductResult.success) {
        return {
          success: false,
          error: deductResult.error || '캐시 차감에 실패했습니다.'
        };
      }
    }
    
    const newSlot = new UserSlotModel(
      `SLOT-${this.slotIdCounter++}`,
      userId,
      'pending',
      params.customFields,
      this.useCashSystem ? this.slotPrice : 0, // 캐시 시스템 OFF일 때는 0원
      0,
      0,
      new Date(),
      new Date()
    );
    
    this.slots.push(newSlot);
    this.eventEmitter.emit('slotCreated', newSlot);
    
    // 자동 알림 발송
    try {
      await autoNotificationService.onSlotRegistered(userId, {
        title: params.customFields.keywords || '키워드 없음',
        price: this.slotPrice
      });
    } catch (error) {
      console.error('Failed to send slot registration notification:', error);
    }
    
    return {
      success: true,
      data: newSlot
    };
  }

  async updateSlot(slotId: string, params: UpdateSlotParams): Promise<SlotResult<UserSlot>> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const slot = this.slots.find(s => s.id === slotId);
    if (!slot) {
      return {
        success: false,
        error: '슬롯을 찾을 수 없습니다.'
      };
    }

    // 수정 가능한 상태 확인
    if (!slot.canEdit()) {
      return {
        success: false,
        error: '현재 상태에서는 수정할 수 없습니다.'
      };
    }

    // 업데이트
    if (params.customFields !== undefined) {
      slot.customFields = { ...slot.customFields, ...params.customFields };
    }
    
    slot.updatedAt = new Date();
    slot.status = 'pending'; // 수정 후 재심사
    
    this.eventEmitter.emit('slotUpdated', slot);
    this.eventEmitter.emit('slotStatusChanged', { slotId, status: 'pending' });
    
    return {
      success: true,
      data: slot
    };
  }

  async pauseSlot(slotId: string): Promise<SlotResult<void>> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const slot = this.slots.find(s => s.id === slotId);
    if (!slot) {
      return {
        success: false,
        error: '슬롯을 찾을 수 없습니다.'
      };
    }

    if (!slot.canPause()) {
      return {
        success: false,
        error: '일시정지할 수 없는 상태입니다.'
      };
    }

    slot.status = 'paused';
    slot.updatedAt = new Date();
    
    this.eventEmitter.emit('slotStatusChanged', { slotId, status: 'paused' });
    
    return { success: true };
  }

  async resumeSlot(slotId: string): Promise<SlotResult<void>> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const slot = this.slots.find(s => s.id === slotId);
    if (!slot) {
      return {
        success: false,
        error: '슬롯을 찾을 수 없습니다.'
      };
    }

    if (!slot.canResume()) {
      return {
        success: false,
        error: '재개할 수 없는 상태입니다.'
      };
    }

    slot.status = 'active';
    slot.updatedAt = new Date();
    
    this.eventEmitter.emit('slotStatusChanged', { slotId, status: 'active' });
    
    return { success: true };
  }

  async deleteSlot(slotId: string): Promise<SlotResult<void>> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const slotIndex = this.slots.findIndex(s => s.id === slotId);
    if (slotIndex === -1) {
      return {
        success: false,
        error: '슬롯을 찾을 수 없습니다.'
      };
    }

    const slot = this.slots[slotIndex];
    if (!slot.canDelete()) {
      return {
        success: false,
        error: '삭제할 수 없는 상태입니다.'
      };
    }

    this.slots.splice(slotIndex, 1);
    
    return { success: true };
  }

  // 관리자 기능
  async approveSlot(slotId: string, approvedPrice?: number): Promise<SlotResult<void>> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const slot = this.slots.find(s => s.id === slotId);
    if (!slot) {
      return {
        success: false,
        error: '슬롯을 찾을 수 없습니다.'
      };
    }

    if (slot.status !== 'pending') {
      return {
        success: false,
        error: '승인 대기 상태가 아닙니다.'
      };
    }

    // 캐시 시스템 OFF일 때는 가격이 필수
    if (!this.useCashSystem && !approvedPrice) {
      return {
        success: false,
        error: '슬롯 가격을 입력해주세요.'
      };
    }

    slot.status = 'active';
    slot.approvedAt = new Date();
    slot.updatedAt = new Date();
    
    // 캐시 시스템 OFF일 때만 승인 가격 설정
    if (!this.useCashSystem && approvedPrice) {
      slot.approvedPrice = approvedPrice;
    }
    
    this.eventEmitter.emit('slotStatusChanged', { slotId, status: 'active' });
    
    // 자동 알림 발송
    try {
      await autoNotificationService.onSlotApproved(slot.userId, {
        title: slot.customFields.keywords || '키워드 없음',
        approvedPrice: slot.approvedPrice || this.slotPrice
      });
    } catch (error) {
      console.error('Failed to send slot approval notification:', error);
    }
    
    return { success: true };
  }

  async rejectSlot(slotId: string, reason: string): Promise<SlotResult<void>> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const slot = this.slots.find(s => s.id === slotId);
    if (!slot) {
      return {
        success: false,
        error: '슬롯을 찾을 수 없습니다.'
      };
    }

    if (slot.status !== 'pending') {
      return {
        success: false,
        error: '승인 대기 상태가 아닙니다.'
      };
    }

    slot.status = 'rejected';
    slot.rejectedAt = new Date();
    slot.rejectionReason = reason;
    slot.updatedAt = new Date();
    
    this.eventEmitter.emit('slotStatusChanged', { slotId, status: 'rejected' });
    
    // 자동 알림 발송
    try {
      await autoNotificationService.onSlotRejected(slot.userId, {
        title: slot.customFields.keywords || '키워드 없음',
        rejectionReason: reason
      });
    } catch (error) {
      console.error('Failed to send slot rejection notification:', error);
    }
    
    return { success: true };
  }

  async getAllPendingSlots(): Promise<SlotResult<UserSlot[]>> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const pendingSlots = this.slots.filter(s => s.status === 'pending');
    
    return {
      success: true,
      data: pendingSlots
    };
  }

  async getSlotCount(statusFilter?: string): Promise<SlotResult<{ count: number }>> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    let count = this.slots.length;
    if (statusFilter && statusFilter !== 'all') {
      count = this.slots.filter(s => s.status === statusFilter).length;
    }
    
    return {
      success: true,
      data: { count }
    };
  }

  async getPendingSlotCount(): Promise<SlotResult<{ count: number }>> {
    return this.getSlotCount('pending');
  }
}
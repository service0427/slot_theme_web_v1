export interface UserSlot {
  id: string;
  userId: string;
  userName?: string; // 사용자 이름
  userEmail?: string; // 사용자 이메일
  status: SlotStatus;
  customFields: Record<string, string>; // 동적 필드 데이터
  price: number; // 슬롯 구매 가격 (캐시 시스템 ON일 때)
  approvedPrice?: number; // 관리자가 승인 시 설정한 가격 (캐시 시스템 OFF일 때)
  impressions: number;
  clicks: number;
  createdAt: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  expiredAt?: Date;
  updatedAt: Date;
}

export type SlotStatus = 'pending' | 'active' | 'paused' | 'rejected' | 'expired';

export class UserSlotModel implements UserSlot {
  constructor(
    public id: string,
    public userId: string,
    public status: SlotStatus,
    public customFields: Record<string, string>,
    public price: number,
    public impressions: number,
    public clicks: number,
    public createdAt: Date,
    public updatedAt: Date,
    public approvedAt?: Date,
    public rejectedAt?: Date,
    public rejectionReason?: string,
    public expiredAt?: Date,
    public approvedPrice?: number,
    public userName?: string,
    public userEmail?: string
  ) {}

  get ctr(): number {
    return this.impressions > 0 ? (this.clicks / this.impressions) * 100 : 0;
  }

  canEdit(): boolean {
    return this.status === 'paused' || this.status === 'rejected';
  }

  canPause(): boolean {
    return this.status === 'active';
  }

  canResume(): boolean {
    return this.status === 'paused';
  }

  canDelete(): boolean {
    return this.status === 'rejected' || this.status === 'expired';
  }

  isExpired(): boolean {
    return this.status === 'expired' || 
           (!!this.expiredAt && this.expiredAt < new Date());
  }
}
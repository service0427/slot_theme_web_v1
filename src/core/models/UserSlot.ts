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
  // 추가 속성들
  amount?: number;
  startDate?: string | Date;
  endDate?: string | Date;
  workCount?: number;
  description?: string;
  slot_number?: number;
  seq?: number;
  keyword?: string;
  fieldValues?: any[];
  payment_completed?: boolean; // 결제 완료 상태
  // 연장 관련 필드
  parent_slot_id?: string;
  extension_days?: number;
  extended_at?: string;
  extended_by?: string;
  extension_type?: 'individual' | 'bulk';
  is_extended?: boolean;
  has_extension?: boolean;
}

export type SlotStatus = 'pending' | 'active' | 'paused' | 'rejected' | 'expired' | 'empty' | 'refunded';

export class UserSlotModel implements UserSlot {
  // 연장 관련 필드들
  parent_slot_id?: string;
  extension_days?: number;
  extended_at?: string;
  extended_by?: string;
  extension_type?: 'individual' | 'bulk';
  is_extended?: boolean;
  has_extension?: boolean;

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
    return this.status === 'rejected' || this.status === 'expired' || this.status === 'refunded';
  }

  canRefund(): boolean {
    return this.status === 'active' || this.status === 'paused';
  }

  isExpired(): boolean {
    return this.status === 'expired' || 
           (!!this.expiredAt && this.expiredAt < new Date());
  }
}
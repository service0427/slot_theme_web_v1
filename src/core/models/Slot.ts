export interface AdSlot {
  id: string;
  name: string;
  description?: string;
  position: SlotPosition;
  size: SlotSize;
  pricePerDay: number;
  pricePerClick: number;
  status: AdSlotStatus;
  currentOwner?: string;
  expiresAt?: Date;
  impressions: number;
  clicks: number;
  createdAt: Date;
  updatedAt: Date;
}

export type SlotPosition = 'header' | 'sidebar' | 'footer' | 'main-top' | 'main-bottom' | 'popup';
export type SlotSize = '728x90' | '300x250' | '160x600' | '320x50' | '300x600' | 'responsive';
export type AdSlotStatus = 'available' | 'occupied' | 'pending' | 'disabled';

export interface SlotPerformance {
  slotId: string;
  date: Date;
  impressions: number;
  clicks: number;
  ctr: number; // Click Through Rate
  revenue: number;
}

export class AdSlotModel implements AdSlot {
  constructor(
    public id: string,
    public name: string,
    public position: SlotPosition,
    public size: SlotSize,
    public pricePerDay: number,
    public pricePerClick: number,
    public status: AdSlotStatus,
    public impressions: number,
    public clicks: number,
    public createdAt: Date,
    public updatedAt: Date,
    public description?: string,
    public currentOwner?: string,
    public expiresAt?: Date
  ) {}

  get ctr(): number {
    return this.impressions > 0 ? (this.clicks / this.impressions) * 100 : 0;
  }

  isAvailable(): boolean {
    return this.status === 'available' || 
           (this.status === 'occupied' && !!this.expiresAt && this.expiresAt < new Date());
  }

  calculateDailyRevenue(): number {
    return this.clicks * this.pricePerClick;
  }
}
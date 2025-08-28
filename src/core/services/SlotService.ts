import { UserSlot, SlotStatus } from '../models/UserSlot';
import { EventEmitter } from '../utils/EventEmitter';

export interface CreateSlotParams {
  customFields: Record<string, string>; // 동적 필드 데이터
}

export interface UpdateSlotParams {
  customFields?: Record<string, string>; // 동적 필드 데이터
}

export interface SlotResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedSlotResult {
  items: UserSlot[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SystemStats {
  operationMode: string;
  totalSlots: number;
  statusBreakdown: {
    empty: number;
    pending: number;
    active: number;
    waiting: number;
    completed: number;
    paused: number;
    expired: number;
    inactive: number;
    refunded: number;
    all: number;
  };
  themes: string[];
  testSlots: number;
  refundedSlots: number;
}

export interface ISlotService {
  getSlotPrice(): Promise<number>;
  getUserSlots(userId: string): Promise<SlotResult<UserSlot[]>>;
  createSlot(userId: string, params: CreateSlotParams): Promise<SlotResult<UserSlot>>;
  updateSlot(slotId: string, params: UpdateSlotParams): Promise<SlotResult<UserSlot>>;
  pauseSlot(slotId: string): Promise<SlotResult<void>>;
  resumeSlot(slotId: string): Promise<SlotResult<void>>;
  deleteSlot(slotId: string): Promise<SlotResult<void>>;
  // 관리자 기능
  approveSlot(slotId: string, approvedPrice?: number): Promise<SlotResult<void>>;
  rejectSlot(slotId: string, reason: string): Promise<SlotResult<void>>;
  getAllSlots(statusFilter?: string, page?: number, limit?: number, searchQuery?: string): Promise<SlotResult<PaginatedSlotResult>>;
  getAllPendingSlots(): Promise<SlotResult<UserSlot[]>>;
  getSystemStats(): Promise<SlotResult<SystemStats>>;
  // 슬롯 개수 조회
  getSlotCount(statusFilter?: string): Promise<SlotResult<{ count: number }>>;
  getPendingSlotCount(): Promise<SlotResult<{ count: number }>>;
  // 선슬롯발행 기능
  fillEmptySlot(slotId: string, params: CreateSlotParams): Promise<SlotResult<UserSlot>>;
}

export abstract class BaseSlotService implements ISlotService {
  protected eventEmitter = new EventEmitter<{
    slotCreated: UserSlot;
    slotUpdated: UserSlot;
    slotStatusChanged: { slotId: string; status: SlotStatus };
  }>();

  abstract getSlotPrice(): Promise<number>;
  abstract getUserSlots(userId: string): Promise<SlotResult<UserSlot[]>>;
  abstract createSlot(userId: string, params: CreateSlotParams): Promise<SlotResult<UserSlot>>;
  abstract updateSlot(slotId: string, params: UpdateSlotParams): Promise<SlotResult<UserSlot>>;
  abstract pauseSlot(slotId: string): Promise<SlotResult<void>>;
  abstract resumeSlot(slotId: string): Promise<SlotResult<void>>;
  abstract deleteSlot(slotId: string): Promise<SlotResult<void>>;
  abstract approveSlot(slotId: string, approvedPrice?: number): Promise<SlotResult<void>>;
  abstract rejectSlot(slotId: string, reason: string): Promise<SlotResult<void>>;
  abstract getAllSlots(statusFilter?: string, page?: number, limit?: number, searchQuery?: string): Promise<SlotResult<PaginatedSlotResult>>;
  abstract getAllPendingSlots(): Promise<SlotResult<UserSlot[]>>;
  abstract getSystemStats(): Promise<SlotResult<SystemStats>>;
  abstract getSlotCount(statusFilter?: string): Promise<SlotResult<{ count: number }>>;
  abstract getPendingSlotCount(): Promise<SlotResult<{ count: number }>>;
  abstract fillEmptySlot(slotId: string, params: CreateSlotParams): Promise<SlotResult<UserSlot>>;

  onSlotCreated(callback: (slot: UserSlot) => void): () => void {
    return this.eventEmitter.on('slotCreated', callback);
  }

  onSlotUpdated(callback: (slot: UserSlot) => void): () => void {
    return this.eventEmitter.on('slotUpdated', callback);
  }

  onSlotStatusChanged(callback: (data: { slotId: string; status: SlotStatus }) => void): () => void {
    return this.eventEmitter.on('slotStatusChanged', callback);
  }
}
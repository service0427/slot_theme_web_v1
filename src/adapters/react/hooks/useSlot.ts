import { useCallback } from 'react';
import { SlotStore } from '@/core/store/SlotStore';
import { CreateSlotParams, UpdateSlotParams } from '@/core/services/SlotService';
import { useStore } from './useStore';

export function useSlot(slotStore: SlotStore) {
  const state = useStore(slotStore);

  const createSlot = useCallback(async (params: CreateSlotParams) => {
    return await slotStore.createSlot(params);
  }, [slotStore]);

  const updateSlot = useCallback(async (slotId: string, params: UpdateSlotParams) => {
    return await slotStore.updateSlot(slotId, params);
  }, [slotStore]);

  const pauseSlot = useCallback(async (slotId: string) => {
    return await slotStore.pauseSlot(slotId);
  }, [slotStore]);

  const resumeSlot = useCallback(async (slotId: string) => {
    return await slotStore.resumeSlot(slotId);
  }, [slotStore]);

  const loadUserSlots = useCallback(async () => {
    await slotStore.loadUserSlots();
  }, [slotStore]);

  // 관리자 기능
  const loadAllSlots = useCallback(async (statusFilter?: string) => {
    const slots = await slotStore.loadAllSlots(statusFilter);
    return slots;
  }, [slotStore]);

  const loadPendingSlots = useCallback(async () => {
    const slots = await slotStore.loadPendingSlots();
    return slots;
  }, [slotStore]);

  const loadPendingSlotCount = useCallback(async () => {
    const count = await slotStore.loadPendingSlotCount();
    return count;
  }, [slotStore]);

  const approveSlot = useCallback(async (slotId: string, approvedPrice?: number) => {
    return await slotStore.approveSlot(slotId, approvedPrice);
  }, [slotStore]);

  const rejectSlot = useCallback(async (slotId: string, reason: string) => {
    return await slotStore.rejectSlot(slotId, reason);
  }, [slotStore]);

  const fillEmptySlot = useCallback(async (slotId: string, params: CreateSlotParams) => {
    return await slotStore.fillEmptySlot(slotId, params);
  }, [slotStore]);

  return {
    slots: state.slots,
    pendingSlots: state.pendingSlots,
    slotPrice: state.slotPrice,
    isLoading: state.isLoading,
    error: state.error,
    createSlot,
    updateSlot,
    pauseSlot,
    resumeSlot,
    loadUserSlots,
    fillEmptySlot,
    // 관리자 기능
    loadAllSlots,
    loadPendingSlots,
    loadPendingSlotCount,
    approveSlot,
    rejectSlot
  };
}
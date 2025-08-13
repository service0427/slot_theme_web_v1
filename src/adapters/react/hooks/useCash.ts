import { useCallback } from 'react';
import { CashStore } from '@/core/store/CashStore';
import { ChargeRequestParams } from '@/core/services/CashService';
import { useStore } from './useStore';

export function useCash(cashStore: CashStore) {
  const state = useStore(cashStore);

  const createChargeRequest = useCallback(async (params: ChargeRequestParams) => {
    return await cashStore.createChargeRequest(params);
  }, [cashStore]);

  const loadChargeRequests = useCallback(async () => {
    await cashStore.loadChargeRequests();
  }, [cashStore]);

  const loadCashHistory = useCallback(async () => {
    await cashStore.loadCashHistory();
  }, [cashStore]);

  const refresh = useCallback(async () => {
    await cashStore.loadBalance();
  }, [cashStore]);

  // 관리자 기능
  const loadPendingCharges = useCallback(async () => {
    await cashStore.loadPendingCharges();
    return cashStore.getState().pendingCharges;
  }, [cashStore]);

  const approveCashCharge = useCallback(async (chargeId: string) => {
    return await cashStore.approveCashCharge(chargeId);
  }, [cashStore]);

  const rejectCashCharge = useCallback(async (chargeId: string) => {
    return await cashStore.rejectCashCharge(chargeId);
  }, [cashStore]);

  return {
    balance: state.balance,
    chargeRequests: state.chargeRequests,
    cashHistory: state.cashHistory,
    pendingCharges: state.pendingCharges,
    isLoading: state.isLoading,
    error: state.error,
    createChargeRequest,
    loadChargeRequests,
    loadCashHistory,
    refresh,
    // 관리자 기능
    loadPendingCharges,
    approveCashCharge,
    rejectCashCharge
  };
}
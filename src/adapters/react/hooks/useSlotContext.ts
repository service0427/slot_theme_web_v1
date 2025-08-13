import { useCoreApp } from '../contexts/CoreContext';
import { useSlot } from './useSlot';
import { useAuthContext } from './useAuthContext';

export function useSlotContext() {
  const coreApp = useCoreApp();
  const { user } = useAuthContext();
  
  // 관리자는 모든 슬롯 관리, 일반 사용자는 자신의 슬롯만
  const slotStore = coreApp.getSlotStore(user?.role === 'operator' ? undefined : user?.id);
  return useSlot(slotStore);
}
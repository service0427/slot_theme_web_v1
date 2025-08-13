import { useCoreApp } from '../contexts/CoreContext';
import { useCash } from './useCash';
import { useAuthContext } from './useAuthContext';

export function useCashContext() {
  const coreApp = useCoreApp();
  const { user } = useAuthContext();
  
  if (!user) {
    throw new Error('User must be authenticated to use cash context');
  }
  
  // 관리자는 userId 없이 사용
  const cashStore = coreApp.getCashStore(user.role === 'operator' ? undefined : user.id);
  return useCash(cashStore);
}
import { useCoreApp } from '../contexts/CoreContext';
import { useAuth } from './useAuth';

export function useAuthContext() {
  const coreApp = useCoreApp();
  const authStore = coreApp.getAuthStore();
  return useAuth(authStore);
}
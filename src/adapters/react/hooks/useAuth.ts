import { useCallback } from 'react';
import { AuthStore } from '@/core/store/AuthStore';
import { LoginCredentials } from '@/core/services/AuthService';
import { useStore } from './useStore';

export function useAuth(authStore: AuthStore) {
  const state = useStore(authStore);

  const login = useCallback(async (credentials: LoginCredentials) => {
    await authStore.login(credentials);
  }, [authStore]);

  const logout = useCallback(async () => {
    await authStore.logout();
  }, [authStore]);

  const updateUser = useCallback(async (updates: Partial<NonNullable<typeof state.user>>) => {
    return await authStore.updateUser(updates);
  }, [authStore, state.user]);

  return {
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
    login,
    logout,
    updateUser
  };
}
import { createContext, useContext, ReactNode } from 'react';
import { CoreApp } from '@/core/CoreApp';

const CoreContext = createContext<CoreApp | null>(null);

interface CoreProviderProps {
  coreApp: CoreApp;
  children: ReactNode;
}

export function CoreProvider({ coreApp, children }: CoreProviderProps) {
  return (
    <CoreContext.Provider value={coreApp}>
      {children}
    </CoreContext.Provider>
  );
}

export function useCoreApp(): CoreApp {
  const coreApp = useContext(CoreContext);
  if (!coreApp) {
    throw new Error('useCoreApp must be used within CoreProvider');
  }
  return coreApp;
}
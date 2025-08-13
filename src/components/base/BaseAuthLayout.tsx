import { ReactNode } from 'react';

interface BaseAuthLayoutProps {
  children: ReactNode;
}

export function BaseAuthLayout({ children }: BaseAuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
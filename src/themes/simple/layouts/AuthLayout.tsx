import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-6xl">
        {children}
      </div>
    </div>
  );
}
import { useAuthContext } from '@/adapters/react';
import { Navigate } from 'react-router-dom';

interface BaseChatManagePageProps {
  SupportManager: React.ComponentType<any>;
  className?: string;
  headerClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  contentClassName?: string;
  supportManagerProps?: any;
}

export function BaseChatManagePage({
  SupportManager,
  className = "h-full flex flex-col",
  headerClassName = "p-6 pb-4",
  titleClassName = "text-2xl font-bold text-gray-900",
  descriptionClassName = "text-gray-600 mt-2",
  contentClassName = "flex-1 px-6 pb-6",
  supportManagerProps = {
    height: "100%",
    className: "w-full h-full"
  }
}: BaseChatManagePageProps) {
  const { user } = useAuthContext();
  
  // 관리자가 아니면 접근 차단
  if (user?.role !== 'operator') {
    return <Navigate to="/slots" replace />;
  }

  return (
    <div className={className}>
      <div className={headerClassName}>
        <h1 className={titleClassName}>채팅 관리</h1>
        <p className={descriptionClassName}>
          사용자들의 1:1 문의를 실시간으로 관리하고 응답하세요.
        </p>
      </div>

      {/* 채팅 관리 컴포넌트 */}
      <div className={contentClassName} style={{ minHeight: 0 }}>
        <SupportManager {...supportManagerProps} />
      </div>
    </div>
  );
}
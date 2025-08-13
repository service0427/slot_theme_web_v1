import { useAuthContext } from '@/adapters/react';
import { ComponentType } from 'react';

interface BaseChatTestPageProps {
  SupportChat: ComponentType<{
    height: string;
    className: string;
  }>;
  SupportManager: ComponentType<{
    height: string;
    className: string;
  }>;
  containerClassName?: string;
  headerClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  contentClassName?: string;
}

export function BaseChatTestPage({
  SupportChat,
  SupportManager,
  containerClassName = "h-full flex flex-col",
  headerClassName = "p-6 pb-4",
  titleClassName = "text-2xl font-bold text-gray-900",
  descriptionClassName = "text-gray-600 mt-2",
  contentClassName = "flex-1 px-6 pb-6"
}: BaseChatTestPageProps) {
  const { user } = useAuthContext();
  const isOperator = user?.role === 'operator';

  return (
    <div className={containerClassName}>
      <div className={headerClassName}>
        <h1 className={titleClassName}>
          {isOperator ? '고객 문의 관리' : '고객 지원 채팅'}
        </h1>
        <p className={descriptionClassName}>
          {isOperator 
            ? '사용자들의 문의를 확인하고 응답해보세요.'
            : '궁금한 점이나 도움이 필요한 사항을 문의해보세요.'
          }
        </p>
      </div>

      {/* 역할에 따른 컴포넌트 표시 */}
      <div className={contentClassName} style={{ minHeight: 0 }}>
        {isOperator ? (
          <SupportManager 
            height="100%"
            className="w-full h-full"
          />
        ) : (
          <SupportChat 
            height="100%"
            className="w-full h-full"
          />
        )}
      </div>
    </div>
  );
}
import { SupportChat } from '@/themes/simple/components/chat/SupportChat';
import { SupportManager } from '@/themes/simple/components/chat/SupportManager';
import { useAuthContext } from '@/adapters/react';

export function ChatTestPage() {
  const { user } = useAuthContext();
  const isOperator = user?.role === 'operator';

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">
          {isOperator ? '고객 문의 관리' : '고객 지원 채팅'}
        </h1>
        <p className="text-gray-600 mt-2">
          {isOperator 
            ? '사용자들의 문의를 확인하고 응답해보세요.'
            : '궁금한 점이나 도움이 필요한 사항을 문의해보세요.'
          }
        </p>
      </div>

      {/* 역할에 따른 컴포넌트 표시 */}
      <div className="flex-1 px-6 pb-6" style={{ minHeight: 0 }}>
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
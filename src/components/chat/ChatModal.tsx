import { SupportChat } from '@/themes/simple/components/chat/SupportChat';
import { useAuthContext } from '@/adapters/react';
import { useSystemSettings } from '@/contexts/SystemSettingsContext';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatModal({ isOpen, onClose }: ChatModalProps) {
  const { user } = useAuthContext();
  const { currentTheme } = useSystemSettings();

  if (!isOpen) return null;

  // 테마별 스타일 정의
  const getThemeStyles = () => {
    switch (currentTheme) {
      case 'simple':
        return {
          modal: "absolute bottom-4 right-4 sm:bottom-6 sm:right-6 w-full sm:w-96 max-w-[calc(100vw-2rem)] h-[calc(100vh-8rem)] sm:h-[600px] bg-white rounded-lg shadow-2xl flex flex-col animate-slide-up",
          header: "flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg",
          headerIcon: "w-10 h-10 bg-white/20 rounded-full flex items-center justify-center",
          chatArea: "flex-1 overflow-hidden bg-gray-50"
        };
      case 'modern':
        return {
          modal: "absolute bottom-4 right-4 sm:bottom-6 sm:right-6 w-full sm:w-96 max-w-[calc(100vw-2rem)] h-[calc(100vh-8rem)] sm:h-[600px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col animate-slide-up backdrop-blur-sm",
          header: "flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-t-2xl",
          headerIcon: "w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center",
          chatArea: "flex-1 overflow-hidden bg-gradient-to-b from-slate-50 to-white"
        };
      case 'luxury':
        return {
          modal: "absolute bottom-4 right-4 sm:bottom-6 sm:right-6 w-full sm:w-96 max-w-[calc(100vw-2rem)] h-[calc(100vh-8rem)] sm:h-[600px] bg-gradient-to-b from-slate-900 to-slate-800 rounded-lg shadow-2xl border-2 border-amber-400/30 flex flex-col animate-slide-up",
          header: "flex items-center justify-between p-4 border-b border-amber-400/20 bg-gradient-to-r from-slate-800 to-slate-900 text-amber-100 rounded-t-lg",
          headerIcon: "w-10 h-10 bg-amber-400/20 border border-amber-400/30 rounded-full flex items-center justify-center text-amber-400",
          chatArea: "flex-1 overflow-hidden bg-gradient-to-b from-slate-900/50 to-slate-800/50"
        };
      default:
        return {
          modal: "absolute bottom-4 right-4 sm:bottom-6 sm:right-6 w-full sm:w-96 max-w-[calc(100vw-2rem)] h-[calc(100vh-8rem)] sm:h-[600px] bg-white rounded-lg shadow-2xl flex flex-col animate-slide-up",
          header: "flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg",
          headerIcon: "w-10 h-10 bg-white/20 rounded-full flex items-center justify-center",
          chatArea: "flex-1 overflow-hidden bg-gray-50"
        };
    }
  };

  const styles = getThemeStyles();

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
      
      <div className={styles.modal}>
        {/* 헤더 */}
        <div className={styles.header}>
          <div className="flex items-center gap-3">
            <div className={styles.headerIcon}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" 
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold">고객 지원</h3>
              <p className={`text-xs ${currentTheme === 'luxury' ? 'text-amber-200/80' : 'text-white/80'}`}>평균 응답시간: 5분</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${
              currentTheme === 'luxury' 
                ? 'hover:bg-amber-400/20' 
                : currentTheme === 'modern' 
                  ? 'hover:bg-white/20' 
                  : 'hover:bg-white/20'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 채팅 영역 */}
        <div className={styles.chatArea}>
          {user?.role === 'operator' ? (
            <div className={`p-4 text-center ${
              currentTheme === 'luxury' ? 'text-amber-300/70' : 'text-gray-500'
            }`}>
              운영자는 관리자 페이지에서 채팅을 관리하세요.
            </div>
          ) : (
            <SupportChat 
              height="100%"
              className="w-full h-full"
            />
          )}
        </div>
      </div>
    </div>
  );
}
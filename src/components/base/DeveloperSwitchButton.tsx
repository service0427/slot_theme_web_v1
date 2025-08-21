import { useState, useEffect } from 'react';
import { useAuthContext } from '@/adapters/react';

export function DeveloperSwitchButton() {
  const { loginWithToken } = useAuthContext();
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    // localStorage 체크
    const checkStatus = () => {
      const switched = localStorage.getItem('switched_from_developer') === 'true';
      const devBackup = localStorage.getItem('developer_backup_token');
      setIsVisible(switched && !!devBackup);
    };
    
    // 초기 체크
    checkStatus();
    
    // 주기적 체크
    const interval = setInterval(checkStatus, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  const handleReturn = async () => {
    const developerToken = localStorage.getItem('developer_backup_token');
    const developerRefreshToken = localStorage.getItem('developer_backup_refresh_token');
    
    if (!developerToken) {
      alert('원래 계정 정보를 찾을 수 없습니다.');
      return;
    }
    
    if (!confirm('개발자 계정으로 돌아가시겠습니까?')) {
      return;
    }
    
    // 토큰 복원
    localStorage.setItem('accessToken', developerToken);
    localStorage.setItem('refreshToken', developerRefreshToken || '');
    
    // 전환 정보 삭제
    localStorage.removeItem('switched_from_developer');
    localStorage.removeItem('original_user');
    localStorage.removeItem('developer_backup_token');
    localStorage.removeItem('developer_backup_refresh_token');
    
    // 토큰으로 로그인
    await loginWithToken(developerToken);
    
    alert('개발자 계정으로 돌아왔습니다.');
    window.location.href = '/';
  };
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed bottom-8 right-8 z-[9999]">
      <button
        onClick={handleReturn}
        className="bg-purple-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-purple-700 transition-all transform hover:scale-105 flex items-center gap-2"
        title="개발자 계정으로 돌아가기"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
        </svg>
        <span className="font-medium">개발자 복귀</span>
      </button>
      <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
        전환 모드
      </div>
    </div>
  );
}
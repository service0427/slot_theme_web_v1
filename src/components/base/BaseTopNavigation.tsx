import { NavLink } from 'react-router-dom';
import { useAuthContext } from '@/adapters/react';
import { useConfig } from '@/contexts/ConfigContext';
import { useSystemSettings } from '@/contexts/SystemSettingsContext';
import { useState, useEffect } from 'react';
import { 
  HomeIcon, 
  ChartBarIcon,
  UsersIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  CogIcon,
  ChatBubbleLeftIcon,
  PowerIcon,
  UserIcon
} from '@heroicons/react/24/outline';

export function BaseTopNavigation() {
  const { user, logout, loginWithToken } = useAuthContext();
  const { config } = useConfig();
  const { getSetting } = useSystemSettings();
  const isAdmin = user?.role === 'operator' || user?.role === 'developer';  
  const isDeveloper = user?.role === 'developer';
  const chatEnabled = getSetting('chatEnabled', 'feature');
  
  // 사용자 전환 상태 확인 - 초기값을 localStorage에서 직접 읽기
  const [isSwitchedUser, setIsSwitchedUser] = useState(() => {
    return localStorage.getItem('switched_from_developer') === 'true';
  });
  const [originalUser, setOriginalUser] = useState<string | null>(() => {
    return localStorage.getItem('original_user');
  });
  
  // localStorage 변경 감지
  useEffect(() => {
    const checkSwitchStatus = () => {
      const switched = localStorage.getItem('switched_from_developer') === 'true';
      const original = localStorage.getItem('original_user');
      
      setIsSwitchedUser(switched);
      setOriginalUser(original);
      
      // 디버깅용
      console.log('[TopNav] 전환 상태 체크:', { 
        switched, 
        original, 
        currentUser: user?.email,
        devBackup: localStorage.getItem('developer_backup_token') ? 'exists' : 'none',
        stateValues: { isSwitchedUser, originalUser }
      });
    };
    
    // 초기 체크
    checkSwitchStatus();
    
    // storage 이벤트 리스너 (다른 탭에서 변경 감지)
    window.addEventListener('storage', checkSwitchStatus);
    
    // 주기적으로 체크 (같은 탭에서의 변경 감지) - 간격을 짧게
    const interval = setInterval(checkSwitchStatus, 500);
    
    return () => {
      window.removeEventListener('storage', checkSwitchStatus);
      clearInterval(interval);
    };
  }, [user?.email]); // user.email 변경 시에도 체크
  
  // 원래 개발자 계정으로 돌아가기
  const handleReturnToDeveloper = async () => {
    const developerToken = localStorage.getItem('developer_backup_token');
    const developerRefreshToken = localStorage.getItem('developer_backup_refresh_token');
    
    if (!developerToken) {
      alert('원래 계정 정보를 찾을 수 없습니다. 다시 로그인해주세요.');
      logout();
      return;
    }
    
    // 백업된 토큰 복원
    localStorage.setItem('accessToken', developerToken);
    localStorage.setItem('refreshToken', developerRefreshToken || '');
    
    // 전환 관련 정보 삭제
    localStorage.removeItem('switched_from_developer');
    localStorage.removeItem('original_user');
    localStorage.removeItem('developer_backup_token');
    localStorage.removeItem('developer_backup_refresh_token');
    
    // 토큰으로 로그인
    await loginWithToken(developerToken);
    
    alert('개발자 계정으로 돌아왔습니다.');
    window.location.href = '/';
  };
  
  const navLinkClasses = ({ isActive }: { isActive: boolean }) => 
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive 
        ? 'bg-blue-500 text-white' 
        : 'text-gray-700 hover:bg-gray-100'
    }`;

  // 메뉴 아이콘 매핑
  const getMenuIcon = (menuId: string) => {
    const iconClass = "w-4 h-4 inline mr-1";
    switch (menuId) {
      case 'slots': return <HomeIcon className={iconClass} />;
      case 'ranking': return <ChartBarIcon className={iconClass} />;
      case 'cash-history': return <DocumentTextIcon className={iconClass} />;
      case 'admin-slots': return <DocumentTextIcon className={iconClass} />;
      case 'admin-users': return <UsersIcon className={iconClass} />;
      case 'admin-cash': return <CurrencyDollarIcon className={iconClass} />;
      case 'admin-chat': return <ChatBubbleLeftIcon className={iconClass} />;
      case 'admin-settings': return <CogIcon className={iconClass} />;
      default: return <HomeIcon className={iconClass} />;
    }
  };

  return (
    <nav className="w-full bg-white shadow-sm border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            {/* 로고 */}
            <div className="flex-shrink-0 flex items-center">
              <h2 className="text-xl font-bold text-gray-900">{getSetting('siteName', 'business') || 'Simple Slot'}</h2>
            </div>
            
            {/* 네비게이션 메뉴 */}
            <div className="hidden md:flex items-center space-x-4">
              {/* 사용자 메뉴 */}
              {config.menus.user
                .filter(menu => menu.visible)
                .map(menu => (
                  <NavLink key={menu.id} to={menu.path!} className={navLinkClasses}>
                    {getMenuIcon(menu.id)}
                    {menu.label}
                  </NavLink>
                ))}
              
              {/* 관리자/개발자 메뉴 */}
              {isAdmin && config.menus.admin
                .filter(menu => {
                  // 운영자는 시스템 설정 메뉴 제거  
                  if (user?.role === 'operator' && menu.id === 'system-settings') return false;
                  // 채팅 기능 비활성화시 채팅 관리 메뉴 제거
                  if (!chatEnabled && menu.id === 'chat-manage') return false;
                  return menu.visible;
                })
                .map(menu => (
                  <NavLink key={menu.id} to={menu.path!} className={navLinkClasses}>
                    {getMenuIcon(menu.id)}
                    {menu.label}
                  </NavLink>
                ))}
            </div>
          </div>
          
          {/* 우측 메뉴 */}
          <div className="flex items-center space-x-4">
            {/* 사용자 전환 상태 표시 - 더 눈에 띄게 표시 */}
            {(isSwitchedUser || localStorage.getItem('switched_from_developer') === 'true') && (
              <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 border-2 border-purple-300 rounded-lg">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-purple-900">🔄 전환 모드</span>
                  <span className="text-xs text-purple-700">
                    {originalUser || localStorage.getItem('original_user')} → {user?.email}
                  </span>
                </div>
                <button 
                  onClick={handleReturnToDeveloper}
                  className="px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors shadow-sm"
                  title={`${originalUser || localStorage.getItem('original_user')} 계정으로 돌아가기`}
                >
                  개발자 복귀
                </button>
              </div>
            )}
            
            <NavLink to="/profile" className={navLinkClasses}>
              <UserIcon className="w-4 h-4 inline mr-1" />
              내 정보
            </NavLink>
            <button 
              onClick={logout}
              className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <PowerIcon className="w-4 h-4 inline mr-1" />
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
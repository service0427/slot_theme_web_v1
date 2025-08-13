import { NavLink } from 'react-router-dom';
import { useAuthContext } from '@/adapters/react';
import { useConfig } from '@/contexts/ConfigContext';
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

export function TopNavigation() {
  const { user, logout } = useAuthContext();
  const { config } = useConfig();
  const isAdmin = user?.role === 'operator';
  
  // Luxury 테마 스타일 - 고급스럽고 화려한 디자인
  const navLinkClasses = ({ isActive }: { isActive: boolean }) => 
    `px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
      isActive 
        ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-2xl scale-105' 
        : 'text-amber-100 hover:bg-gradient-to-r hover:from-amber-900/50 hover:to-yellow-900/50 hover:text-amber-50'
    }`;

  // 메뉴 아이콘 매핑
  const getMenuIcon = (menuId: string) => {
    const iconClass = "w-5 h-5 inline mr-2";
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
    <nav className="w-full bg-gradient-to-r from-gray-900 via-amber-950 to-gray-900 shadow-2xl border-b-2 border-amber-500/30">
      <div className="px-6 sm:px-8 lg:px-12">
        <div className="flex justify-between h-20">
          <div className="flex items-center space-x-12">
            {/* 로고 - Luxury 스타일 */}
            <div className="flex-shrink-0 flex items-center">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 bg-clip-text text-transparent drop-shadow-lg">
                ✨ 마케팅의정석 ✨
              </h2>
            </div>
            
            {/* 네비게이션 메뉴 */}
            <div className="hidden md:flex items-center space-x-3">
              {/* 사용자 메뉴 */}
              {config.menus.user
                .filter(menu => menu.visible)
                .map(menu => (
                  <NavLink key={menu.id} to={menu.path!} className={navLinkClasses}>
                    {getMenuIcon(menu.id)}
                    {menu.label}
                  </NavLink>
                ))}
              
              {/* 관리자 메뉴 */}
              {isAdmin && config.menus.admin
                .filter(menu => menu.visible)
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
            <NavLink to="/profile" className={navLinkClasses}>
              <UserIcon className="w-5 h-5 inline mr-2" />
              내 정보
            </NavLink>
            <button 
              onClick={logout}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 transition-all duration-300 shadow-2xl hover:scale-105"
            >
              <PowerIcon className="w-5 h-5 inline mr-2" />
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
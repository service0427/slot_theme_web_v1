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

export function BaseTopNavigation() {
  const { user, logout } = useAuthContext();
  const { config } = useConfig();
  const isAdmin = user?.role === 'operator';
  
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
              <h2 className="text-xl font-bold text-gray-900">마케팅의정석</h2>
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
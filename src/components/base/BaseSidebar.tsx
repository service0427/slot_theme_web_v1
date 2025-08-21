import { useState, ComponentType } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthContext, useCashContext } from '@/adapters/react';
import { useEnhancedConfig } from '@/contexts/EnhancedConfigContext';
import { useSystemSettings } from '@/contexts/SystemSettingsContext';

interface BaseSidebarProps {
  CashChargeModal?: ComponentType<{ isOpen: boolean; onClose: () => void }>;
}

// 테마별 사이드바 스타일
const sidebarStyles = {
  simple: {
    container: "w-64 bg-white border-r h-full flex flex-col",
    header: "p-6 border-b",
    title: "text-xl font-bold mb-4",
    userInfo: "space-y-2 text-sm",
    balance: "text-lg font-bold text-blue-600",
    button: "px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 w-full",
    nav: "flex-1 p-4",
    navItem: "flex items-center px-4 py-3 rounded-lg hover:bg-gray-100",
    navItemActive: "bg-blue-50 text-blue-600",
    navItemInactive: "text-gray-700"
  },
  modern: {
    container: "w-72 bg-white border-r border-violet-100 h-full flex flex-col shadow-xl",
    header: "p-6 border-b border-violet-100",
    title: "text-2xl font-bold mb-4 bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent",
    userInfo: "space-y-2 text-sm text-gray-700",
    balance: "text-lg font-bold text-violet-600",
    button: "px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:from-violet-700 hover:to-indigo-700 w-full shadow-lg",
    nav: "flex-1 p-4 space-y-2",
    navItem: "flex items-center px-5 py-3.5 rounded-xl hover:bg-violet-50 transition-all duration-200 transform hover:translate-x-1",
    navItemActive: "bg-gradient-to-r from-violet-500 to-indigo-500 text-white font-semibold shadow-lg shadow-violet-500/30 scale-105 hover:shadow-xl",
    navItemInactive: "text-gray-600 hover:text-violet-600 hover:shadow-md"
  },
  luxury: {
    container: "w-80 bg-gradient-to-b from-gray-900 via-gray-800 to-black h-full flex flex-col shadow-2xl border-r border-amber-500/20",
    header: "p-8 border-b border-amber-500/30",
    title: "text-2xl font-bold mb-4 text-amber-400 tracking-wider",
    userInfo: "space-y-3 text-sm text-gray-300",
    balance: "text-xl font-bold text-amber-400",
    button: "px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-500 text-black font-bold rounded-lg hover:from-amber-500 hover:to-amber-400 w-full shadow-xl transform hover:scale-105 transition-all",
    nav: "flex-1 p-6",
    navItem: "flex items-center px-5 py-4 rounded-lg hover:bg-amber-500/10 transition-all",
    navItemActive: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    navItemInactive: "text-gray-400"
  }
};

export function BaseSidebar({ CashChargeModal }: BaseSidebarProps = {}) {
  const navigate = useNavigate();
  const { user, logout } = useAuthContext();
  const { config } = useEnhancedConfig();
  const { currentTheme, getSetting } = useSystemSettings();
  const chatEnabled = getSetting('chatEnabled', 'feature');
  
  // Hook은 항상 호출되어야 함 - 조건부로 호출하지 않음
  const cashContext = useCashContext();
  const balance = config.useCashSystem ? cashContext?.balance : null;
  
  const [showCashModal, setShowCashModal] = useState(false);
  
  // 현재 테마의 스타일 선택
  const theme = currentTheme as 'simple' | 'modern' | 'luxury';
  const styles = sidebarStyles[theme] || sidebarStyles.simple;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleCashCharge = () => {
    if (config.cashChargeMode === 'modal') {
      setShowCashModal(true);
    } else {
      navigate('/cash');
    }
  };

  return (
    <aside className={styles.container}>
      {/* 상단 정보 */}
      <div className={styles.header}>
        <h2 className={styles.title}>{getSetting('siteName', 'business') || 'Simple Slot'}</h2>
        
        <div className={styles.userInfo}>
          <div className="text-sm text-gray-700">
            <span className="font-semibold">{user?.email || 'test@example.com'}</span>
            <span className="text-gray-500 ml-1">({user?.fullName || '홍길동'})</span>
          </div>
          {config.useCashSystem && (
            <div className={`${styles.balance} mt-2`}>
              {balance ? balance.amount.toLocaleString() : '0'}원
            </div>
          )}
        </div>

        <div className="mt-4 space-y-2">
          {config.useCashSystem && (
            <button
              onClick={handleCashCharge}
              className={styles.button}
            >
              캐시충전
            </button>
          )}
          <button
            onClick={handleLogout}
            className={`${styles.button} opacity-80`}
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* 메뉴 */}
      <nav className={styles.nav}>
        <ul className="space-y-2">
          {/* 사용자 메뉴 (일반 사용자와 operator만 표시, developer는 제외) */}
          {user?.role !== 'developer' && config.menus.user
            .filter(menu => {
              // 알림 테스트 메뉴 제거
              if (menu.id === 'notification-test') return false;
              // 관리자/개발자는 공지사항 메뉴 숨김 (공지사항 관리만 표시)
              if ((user?.role === 'operator' || user?.role === 'developer') && menu.id === 'announcements') return false;
              return menu.visible;
            })
            .map(menu => (
              <li key={menu.id}>
                <NavLink
                  to={menu.path!}
                  className={({ isActive }) =>
                    `${styles.navItem} ${
                      isActive
                        ? styles.navItemActive
                        : styles.navItemInactive
                    } ${isActive && theme === 'modern' ? 'relative' : ''}`
                  }
                >
                  {menu.label}
                </NavLink>
              </li>
            ))}
          
          {/* 관리자/개발자 메뉴 */}
          {(user?.role === 'operator' || user?.role === 'developer') && (
            <>
              <li className="pt-4">
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                  관리자 메뉴
                </div>
              </li>
              {config.menus.admin
                .filter(menu => {
                  // 알림 테스트 메뉴 제거
                  if (menu.id === 'admin-notification-test') return false;
                  // 운영자는 시스템 설정 메뉴 제거
                  if (user?.role === 'operator' && menu.id === 'system-settings') return false;
                  // 채팅 기능 비활성화시 채팅 관리 메뉴 제거
                  if (!chatEnabled && menu.id === 'chat-manage') return false;
                  return menu.visible;
                })
                .map(menu => (
                  <li key={menu.id}>
                    <NavLink
                      to={menu.path!}
                      end={menu.id === 'admin-dashboard'}
                      className={({ isActive }) =>
                        `${styles.navItem} ${
                          isActive
                            ? styles.navItemActive
                            : styles.navItemInactive
                        } ${isActive && theme === 'modern' ? 'relative' : ''}`
                      }
                    >
                      {menu.label}
                    </NavLink>
                  </li>
                ))}
            </>
          )}
        </ul>
      </nav>

      {/* 캐시충전 모달 */}
      {CashChargeModal && (
        <CashChargeModal
          isOpen={showCashModal}
          onClose={() => setShowCashModal(false)}
        />
      )}
    </aside>
  );
}
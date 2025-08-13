import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthContext } from '@/adapters/react';
import { 
  HomeIcon, 
  ChartBarIcon,
  UsersIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  CogIcon,
  ChatBubbleLeftIcon,
  PowerIcon,
  UserIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export function BaseFloatingMenu() {
  const { user, logout } = useAuthContext();
  const isAdmin = user?.role === 'operator';
  const [isOpen, setIsOpen] = useState(false);
  
  const navLinkClasses = ({ isActive }: { isActive: boolean }) => 
    `block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive 
        ? 'bg-blue-500 text-white' 
        : 'text-gray-700 hover:bg-gray-100'
    }`;

  return (
    <>
      {/* 플로팅 메뉴 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors z-50 flex items-center justify-center"
      >
        {isOpen ? (
          <XMarkIcon className="w-6 h-6" />
        ) : (
          <Bars3Icon className="w-6 h-6" />
        )}
      </button>

      {/* 메뉴 패널 */}
      {isOpen && (
        <>
          {/* 배경 오버레이 */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* 메뉴 내용 */}
          <div className="fixed bottom-24 right-6 w-64 bg-white rounded-lg shadow-xl z-50 p-4 max-h-[80vh] overflow-y-auto">
            <h3 className="font-semibold text-gray-900 mb-4">메뉴</h3>
            
            <nav className="space-y-2">
              {isAdmin ? (
                <>
                  <NavLink to="/admin" className={navLinkClasses} onClick={() => setIsOpen(false)}>
                    <HomeIcon className="w-4 h-4 inline mr-2" />
                    대시보드
                  </NavLink>
                  <NavLink to="/admin/users" className={navLinkClasses} onClick={() => setIsOpen(false)}>
                    <UsersIcon className="w-4 h-4 inline mr-2" />
                    사용자 관리
                  </NavLink>
                  <NavLink to="/admin/slots" className={navLinkClasses} onClick={() => setIsOpen(false)}>
                    <DocumentTextIcon className="w-4 h-4 inline mr-2" />
                    광고 승인
                  </NavLink>
                  <NavLink to="/admin/cash" className={navLinkClasses} onClick={() => setIsOpen(false)}>
                    <CurrencyDollarIcon className="w-4 h-4 inline mr-2" />
                    캐시 승인
                  </NavLink>
                  <NavLink to="/admin/chat" className={navLinkClasses} onClick={() => setIsOpen(false)}>
                    <ChatBubbleLeftIcon className="w-4 h-4 inline mr-2" />
                    채팅 관리
                  </NavLink>
                  <NavLink to="/admin/settings" className={navLinkClasses} onClick={() => setIsOpen(false)}>
                    <CogIcon className="w-4 h-4 inline mr-2" />
                    시스템 설정
                  </NavLink>
                </>
              ) : (
                <>
                  <NavLink to="/slots" className={navLinkClasses} onClick={() => setIsOpen(false)}>
                    <HomeIcon className="w-4 h-4 inline mr-2" />
                    광고 슬롯
                  </NavLink>
                  <NavLink to="/cash/charge" className={navLinkClasses} onClick={() => setIsOpen(false)}>
                    <CurrencyDollarIcon className="w-4 h-4 inline mr-2" />
                    캐시 충전
                  </NavLink>
                  <NavLink to="/cash/history" className={navLinkClasses} onClick={() => setIsOpen(false)}>
                    <DocumentTextIcon className="w-4 h-4 inline mr-2" />
                    캐시 내역
                  </NavLink>
                  <NavLink to="/ranking" className={navLinkClasses} onClick={() => setIsOpen(false)}>
                    <ChartBarIcon className="w-4 h-4 inline mr-2" />
                    랭킹
                  </NavLink>
                </>
              )}
              
              <hr className="my-2" />
              
              <NavLink to="/profile" className={navLinkClasses} onClick={() => setIsOpen(false)}>
                <UserIcon className="w-4 h-4 inline mr-2" />
                내 정보
              </NavLink>
              <button 
                onClick={() => {
                  logout();
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <PowerIcon className="w-4 h-4 inline mr-2" />
                로그아웃
              </button>
            </nav>
          </div>
        </>
      )}
    </>
  );
}
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSlotContext } from '@/adapters/react/hooks/useSlotContext';
import { useCashContext } from '@/adapters/react/hooks/useCashContext';
import { useAuthContext } from '@/adapters/react';
import { useConfig } from '@/contexts/ConfigContext';
import { useSystemSettings } from '@/contexts/SystemSettingsContext';

interface AdminDashboardCardStyle {
  container: string;
  iconContainer: string;
  badge: string;
  title: string;
  description: string;
}

interface AdminDashboardStyles {
  container: string;
  header: {
    title: string;
    description: string;
  };
  grid: string;
  card: AdminDashboardCardStyle;
  quickActions: {
    container: string;
    title: string;
    buttonsContainer: string;
    button: string;
  };
}

interface BaseAdminDashboardPageProps {
  styles?: AdminDashboardStyles;
}

const defaultStyles: AdminDashboardStyles = {
  container: "p-6",
  header: {
    title: "text-3xl font-bold mb-2",
    description: "text-gray-600"
  },
  grid: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4",
  card: {
    container: "bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow",
    iconContainer: "p-3 rounded-lg",
    badge: "px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium",
    title: "text-lg font-semibold mb-2",
    description: "text-gray-600 text-sm"
  },
  quickActions: {
    container: "mt-8 bg-blue-50 rounded-lg p-6",
    title: "text-lg font-semibold mb-4",
    buttonsContainer: "flex flex-wrap gap-4",
    button: "px-4 py-2 text-white rounded"
  }
};

export function BaseAdminDashboardPage({ styles = defaultStyles }: BaseAdminDashboardPageProps) {
  const { user } = useAuthContext();
  const { config } = useConfig();
  const { loadPendingSlotCount, loadAllSlots } = useSlotContext();
  const cashContext = config.useCashSystem ? useCashContext() : null;
  const { getSetting } = useSystemSettings();
  const chatEnabled = getSetting('chatEnabled', 'feature');
  const notificationEnabled = getSetting('notificationEnabled', 'feature');
  const [slotStats, setSlotStats] = useState({
    empty: 0,
    pending: 0,
    active: 0,
    waiting: 0,
    completed: 0,
    paused: 0,
    rejected: 0
  });
  const [pendingChargesCount, setPendingChargesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        // 모든 슬롯 로드
        const allSlots = await loadAllSlots();
        
        // 상태별 카운트 계산
        const stats = {
          empty: 0,
          pending: 0,
          active: 0,
          waiting: 0,
          completed: 0,
          paused: 0,
          rejected: 0
        };
        
        const now = new Date();
        
        allSlots.forEach(slot => {
          if (slot.status === 'empty') {
            stats.empty++;
          } else if (slot.status === 'pending') {
            stats.pending++;
          } else if (slot.status === 'paused') {
            stats.paused++;
          } else if (slot.status === 'rejected') {
            stats.rejected++;
          } else if (slot.status === 'active') {
            const start = slot.startDate ? new Date(slot.startDate) : null;
            const end = slot.endDate ? new Date(slot.endDate) : null;
            
            if (start && now < start) {
              stats.waiting++;
            } else if (end && now > end) {
              stats.completed++;
            } else {
              stats.active++;
            }
          }
        });
        
        setSlotStats(stats);
        
        // 캐시 충전 대기 로드
        if (config.useCashSystem && cashContext) {
          const charges = await cashContext.loadPendingCharges();
          setPendingChargesCount(charges.length);
        }
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadStats();
  }, []);

  if (isLoading) {
    return <div className={styles.container}>로딩 중...</div>;
  }

  return (
    <div className={styles.container}>
      <div className="mb-8">
        <h1 className={styles.header.title}>관리자 대시보드</h1>
        <p className={styles.header.description}>{getSetting('siteName', 'business') || 'Simple Slot'} 관리자 시스템</p>
      </div>

      <div className={styles.grid}>
        {/* 슬롯 관리 카드 */}
        <Link
          to="/admin/slots"
          className={styles.card.container}
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`${styles.card.iconContainer} bg-blue-100`}>
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            {(slotStats.empty + slotStats.pending) > 0 && (
              <span className={styles.card.badge}>
                {slotStats.empty + slotStats.pending}
              </span>
            )}
          </div>
          <h3 className={styles.card.title}>슬롯 관리</h3>
          <div className={styles.card.description}>
            <div className="space-y-1">
              <div className="font-semibold text-gray-800">• 총 슬롯: {slotStats.empty + slotStats.pending + slotStats.waiting + slotStats.active + slotStats.completed + slotStats.paused + slotStats.rejected}개</div>
              {slotStats.empty > 0 && <div>• 입력 대기: {slotStats.empty}개</div>}
              {slotStats.pending > 0 && <div>• 승인 대기: {slotStats.pending}개</div>}
              {slotStats.waiting > 0 && <div>• 대기중: {slotStats.waiting}개</div>}
              {slotStats.active > 0 && <div>• 활성: {slotStats.active}개</div>}
              {slotStats.completed > 0 && <div>• 완료: {slotStats.completed}개</div>}
              {slotStats.paused > 0 && <div>• 일시정지: {slotStats.paused}개</div>}
              {slotStats.rejected > 0 && <div>• 거절됨: {slotStats.rejected}개</div>}
            </div>
          </div>
        </Link>

        {/* 캐시 충전 승인 카드 (캐시 시스템 ON일 때만) */}
        {config.useCashSystem && (
          <Link
            to="/admin/cash"
            className={styles.card.container}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`${styles.card.iconContainer} bg-green-100`}>
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              {pendingChargesCount > 0 && (
                <span className={styles.card.badge}>
                  {pendingChargesCount}
                </span>
              )}
            </div>
            <h3 className={styles.card.title}>캐시 충전 승인</h3>
            <p className={styles.card.description}>
              승인 대기 중인 충전: {pendingChargesCount}건
            </p>
          </Link>
        )}

        {/* 사용자 관리 카드 */}
        <Link
          to="/admin/users"
          className={styles.card.container}
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`${styles.card.iconContainer} bg-purple-100`}>
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <h3 className={styles.card.title}>사용자 관리</h3>
          <p className={styles.card.description}>
            가입 사용자 조회 및 관리
          </p>
        </Link>

        {/* 채팅 관리 카드 */}
        {chatEnabled && (
          <Link
            to="/admin/chat"
            className={styles.card.container}
          >
          <div className="flex items-center justify-between mb-4">
            <div className={`${styles.card.iconContainer} bg-indigo-100`}>
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
          </div>
          <h3 className={styles.card.title}>채팅 관리</h3>
          <p className={styles.card.description}>
            사용자 1:1 문의 관리
          </p>
          </Link>
        )}

        {/* 시스템 설정 카드 */}
        {user?.role === 'developer' && (
        <Link
          to="/admin/settings"
          className={styles.card.container}
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`${styles.card.iconContainer} bg-orange-100`}>
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              </svg>
            </div>
          </div>
          <h3 className={styles.card.title}>시스템 설정</h3>
          <p className={styles.card.description}>
            사이트 설정 및 환경 관리
          </p>
          </Link>
        )}

        {/* 알림 발송 카드 */}
        {notificationEnabled && (
          <Link
            to="/admin/notifications"
            className={styles.card.container}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`${styles.card.iconContainer} bg-yellow-100`}>
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
            </div>
            <h3 className={styles.card.title}>알림 발송</h3>
            <p className={styles.card.description}>
              사용자에게 알림 전송
            </p>
          </Link>
        )}

        {/* 공지사항 관리 카드 */}
        <Link
          to="/admin/announcements"
          className={styles.card.container}
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`${styles.card.iconContainer} bg-teal-100`}>
              <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
          </div>
          <h3 className={styles.card.title}>공지사항 관리</h3>
          <p className={styles.card.description}>
            공지사항 등록 및 관리
          </p>
        </Link>
      </div>

      {/* 빠른 액션 */}
      <div className={styles.quickActions.container}>
        <h2 className={styles.quickActions.title}>빠른 액션</h2>
        <div className={styles.quickActions.buttonsContainer}>
          <Link
            to="/admin/slots"
            className={`${styles.quickActions.button} bg-blue-600 hover:bg-blue-700`}
          >
            슬롯 관리
          </Link>
          {config.useCashSystem && (
            <Link
              to="/admin/cash"
              className={`${styles.quickActions.button} bg-green-600 hover:bg-green-700`}
            >
              캐시 충전 관리
            </Link>
          )}
          <Link
            to="/admin/users"
            className={`${styles.quickActions.button} bg-purple-600 hover:bg-purple-700`}
          >
            사용자 관리
          </Link>
          {chatEnabled && (
            <Link
              to="/admin/chat"
              className={`${styles.quickActions.button} bg-indigo-600 hover:bg-indigo-700`}
            >
              채팅 관리
            </Link>
          )}
          {notificationEnabled && (
            <Link
              to="/admin/notifications"
              className={`${styles.quickActions.button} bg-yellow-600 hover:bg-yellow-700`}
            >
              알림 발송
            </Link>
          )}
          <Link
            to="/admin/announcements"
            className={`${styles.quickActions.button} bg-teal-600 hover:bg-teal-700`}
          >
            공지사항 관리
          </Link>
          {user?.role === 'developer' && (
            <Link
            to="/admin/settings"
            className={`${styles.quickActions.button} bg-orange-600 hover:bg-orange-700`}
            >
              시스템 설정
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
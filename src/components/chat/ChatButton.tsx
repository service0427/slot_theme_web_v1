import { useState, useEffect } from 'react';
import { ChatModal } from './ChatModal';
import { useSystemSettings } from '@/contexts/SystemSettingsContext';
import { useAuthContext } from '@/adapters/react';

export function ChatButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { currentTheme } = useSystemSettings();
  const { user } = useAuthContext();

  // 읽지 않은 메시지 수 조회
  useEffect(() => {
    if (!user || user.role === 'operator') return;

    const fetchUnreadCount = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('/api/chat/unread-count', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.count || 0);
        }
      } catch (error) {
        console.error('읽지 않은 메시지 수 조회 실패:', error);
      }
    };

    fetchUnreadCount();

    // 30초마다 읽지 않은 메시지 수 확인
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // 채팅 모달이 열릴 때 읽지 않은 메시지 수 초기화
  const handleOpenChat = () => {
    setIsOpen(true);
    setUnreadCount(0);
  };

  // 채팅 모달이 닫힐 때 읽음 처리
  const handleCloseChat = async () => {
    setIsOpen(false);
    
    // 현재 활성 채팅방이 있으면 읽음 처리
    try {
      const token = localStorage.getItem('token');
      if (!token || !user) return;

      // 사용자의 채팅방 가져오기
      const roomsResponse = await fetch('/api/chat/rooms', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (roomsResponse.ok) {
        const roomsData = await roomsResponse.json();
        if (roomsData.rooms && roomsData.rooms.length > 0) {
          const roomId = roomsData.rooms[0].id;
          
          // 메시지 읽음 처리
          await fetch(`/api/chat/rooms/${roomId}/read`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
        }
      }
    } catch (error) {
      console.error('읽음 처리 실패:', error);
    }
  };

  // 테마별 스타일 정의
  const getThemeStyles = () => {
    switch (currentTheme) {
      case 'simple':
        return {
          button: "fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center group z-[9999]",
          pulse: "bg-red-400",
          dot: "bg-red-500",
          tooltip: "bg-gray-800 text-white"
        };
      case 'modern':
        return {
          button: "fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-2xl shadow-xl hover:from-violet-600 hover:to-indigo-700 transition-all hover:scale-110 hover:rotate-3 flex items-center justify-center group z-[9999]",
          pulse: "bg-violet-400",
          dot: "bg-violet-500",
          tooltip: "bg-slate-800 text-white"
        };
      case 'luxury':
        return {
          button: "fixed bottom-6 right-6 w-18 h-18 bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-amber-400/50 text-amber-400 rounded-full shadow-2xl hover:shadow-amber-500/25 transition-all hover:scale-110 hover:border-amber-400 flex items-center justify-center group z-[9999]",
          pulse: "bg-amber-400",
          dot: "bg-amber-500",
          tooltip: "bg-slate-900 text-amber-100 border border-amber-400/30"
        };
      default:
        return {
          button: "fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center group z-[9999]",
          pulse: "bg-red-400",
          dot: "bg-red-500",
          tooltip: "bg-gray-800 text-white"
        };
    }
  };

  const styles = getThemeStyles();

  // 테마별 아이콘
  const getChatIcon = () => {
    if (currentTheme === 'luxury') {
      return (
        <div className="relative">
          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3c5.5 0 10 3.58 10 8 0 4.42-4.5 8-10 8-1.12 0-2.2-.14-3.22-.4L3 21l2.4-5.78C4.36 14.22 2 11.22 2 8c0-4.42 4.5-8 10-8zm0 2c-4.41 0-8 2.69-8 6s3.59 6 8 6c.9 0 1.76-.13 2.56-.37l.44-.13L18 19l-2-1.5-.5-.37c1.31-1.12 2.5-2.63 2.5-4.13 0-3.31-3.59-6-8-6z"/>
            <circle cx="8.5" cy="10.5" r="1.5"/>
            <circle cx="15.5" cy="10.5" r="1.5"/>
          </svg>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full"></div>
        </div>
      );
    }
    
    return (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
        />
      </svg>
    );
  };

  return (
    <>
      {/* 플로팅 채팅 버튼 */}
      <button
        onClick={handleOpenChat}
        className={styles.button}
        title="1:1 문의하기"
      >
        {getChatIcon()}
        
        {/* 읽지 않은 메시지 알림 (새글이 있을 때만 표시) */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${styles.pulse} opacity-75`}></span>
            <span className={`relative inline-flex rounded-full h-4 w-4 ${styles.dot}`}></span>
          </span>
        )}
        
        {/* 호버 시 툴팁 */}
        <span className={`absolute right-full mr-3 px-3 py-2 ${styles.tooltip} text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg`}>
          💬 1:1 문의하기
        </span>
      </button>

      {/* 채팅 모달 */}
      <ChatModal isOpen={isOpen} onClose={handleCloseChat} />
    </>
  );
}
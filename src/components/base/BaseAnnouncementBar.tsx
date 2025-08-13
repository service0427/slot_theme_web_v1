import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  content_type: 'text' | 'html';
  category: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at?: string;
  author_name?: string;
}

interface BaseAnnouncementBarProps {
  className?: string;
  iconComponent?: React.ReactNode;
  closeButtonClassName?: string;
  contentClassName?: string;
  titleClassName?: string;
}

export function BaseAnnouncementBar({
  className = '',
  iconComponent,
  closeButtonClassName = '',
  contentClassName = '',
  titleClassName = ''
}: BaseAnnouncementBarProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  // 고정 공지사항 가져오기
  useEffect(() => {
    const fetchPinnedAnnouncements = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
        const response = await fetch(`${apiUrl}/announcements/pinned`);
        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
          // sessionStorage에서 닫은 공지 필터링
          const filteredAnnouncements = data.data.filter((announcement: Announcement) => {
            return !sessionStorage.getItem(`announcement-bar-closed-${announcement.id}`);
          });
          
          setAnnouncements(filteredAnnouncements);
          if (filteredAnnouncements.length === 0) {
            setIsVisible(false);
          }
        } else {
          setIsVisible(false);
        }
      } catch (error) {
        console.error('Failed to fetch pinned announcements:', error);
        setIsVisible(false);
      } finally {
        setLoading(false);
      }
    };

    fetchPinnedAnnouncements();
  }, []);

  // 자동 슬라이드
  useEffect(() => {
    if (announcements.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [announcements.length]);

  // 닫기 처리
  const handleClose = () => {
    const currentAnnouncement = announcements[currentIndex];
    if (currentAnnouncement) {
      sessionStorage.setItem(`announcement-bar-closed-${currentAnnouncement.id}`, 'true');
      
      // 현재 공지를 목록에서 제거
      const newAnnouncements = announcements.filter(a => a.id !== currentAnnouncement.id);
      
      if (newAnnouncements.length === 0) {
        setIsVisible(false);
      } else {
        setAnnouncements(newAnnouncements);
        setCurrentIndex(0);
      }
    }
  };

  // 공지사항 상세 조회
  const fetchAnnouncementDetail = async (id: string) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
      const response = await fetch(`${apiUrl}/announcements/${id}`);
      const data = await response.json();
      
      if (data.success) {
        setSelectedAnnouncement(data.data);
        setShowModal(true);
      }
    } catch (error) {
      console.error('Failed to fetch announcement detail:', error);
    }
  };

  const handleTitleClick = () => {
    const currentAnnouncement = announcements[currentIndex];
    if (currentAnnouncement) {
      fetchAnnouncementDetail(currentAnnouncement.id);
    }
  };

  if (loading || !isVisible || announcements.length === 0) {
    return null;
  }

  const currentAnnouncement = announcements[currentIndex];

  return (
    <>
      <div className={`relative flex items-center justify-between px-4 py-2 ${className}`}>
        <div className="flex items-center gap-2 flex-1">
          {iconComponent}
          
          <div className="flex-1">
            <button
              className={`${titleClassName} hover:underline cursor-pointer text-left`}
              onClick={handleTitleClick}
            >
              {currentAnnouncement.title}
            </button>
          </div>

          {/* 페이지 인디케이터 (여러 공지일 때만) */}
          {announcements.length > 1 && (
            <div className="flex gap-1 ml-4">
              {announcements.map((_, index) => (
                <div
                  key={index}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    index === currentIndex ? 'bg-white/80' : 'bg-white/30'
                  }`}
                  onClick={() => setCurrentIndex(index)}
                />
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleClose}
          className={`ml-4 p-1 rounded hover:bg-white/10 transition-colors ${closeButtonClassName}`}
          aria-label="닫기"
        >
          <X size={16} />
        </button>
      </div>

      {/* 공지사항 상세 모달 */}
      {showModal && selectedAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {selectedAnnouncement.title}
                  </h2>
                  <div className="flex gap-4 text-sm text-gray-600">
                    {selectedAnnouncement.author_name && (
                      <span>작성자: {selectedAnnouncement.author_name}</span>
                    )}
                    {selectedAnnouncement.created_at && (
                      <span>
                        작성일: {new Date(selectedAnnouncement.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6">
              {selectedAnnouncement.content_type === 'html' ? (
                <div 
                  className="prose prose-lg max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedAnnouncement.content }}
                />
              ) : (
                <div className="prose prose-lg max-w-none whitespace-pre-wrap">
                  {selectedAnnouncement.content}
                </div>
              )}
            </div>

            <div className="p-6 border-t flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
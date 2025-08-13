import { useState, useEffect } from 'react';
import { Megaphone, Calendar, Eye, ChevronRight, Tag, AlertCircle, Info, Star, Clock } from 'lucide-react';
import { useAuthContext } from '@/adapters/react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  content_type?: 'text' | 'html';
  content_plain?: string;
  category: 'general' | 'event' | 'update' | 'maintenance';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_pinned: boolean;
  is_active: boolean;
  author_name: string;
  view_count: number;
  created_at: string;
  updated_at: string;
  is_read?: boolean;
  images?: string[];
}

export function BaseAnnouncementPage() {
  const { user } = useAuthContext();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [category, setCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadAnnouncements();
  }, [category, page]);

  const loadAnnouncements = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });
      
      if (category !== 'all') {
        params.append('category', category);
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
      const response = await fetch(`${apiUrl}/announcements?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setAnnouncements(result.data.announcements);
        setTotalPages(result.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to load announcements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const viewAnnouncement = async (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    
    // 조회수 증가 및 읽음 표시
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
      await fetch(`${apiUrl}/announcements/${announcement.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      // 목록에서 읽음 표시 업데이트
      setAnnouncements(prev => 
        prev.map(a => 
          a.id === announcement.id ? { ...a, is_read: true, view_count: a.view_count + 1 } : a
        )
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'general': return '일반';
      case 'event': return '이벤트';
      case 'update': return '업데이트';
      case 'maintenance': return '점검';
      default: return cat;
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'general': return 'bg-blue-100 text-blue-800';
      case 'event': return 'bg-green-100 text-green-800';
      case 'update': return 'bg-purple-100 text-purple-800';
      case 'maintenance': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'high': return <Star className="w-4 h-4 text-orange-500" />;
      default: return null;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border">
        {/* 헤더 */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Megaphone className="w-8 h-8 text-purple-600" />
              <h1 className="text-2xl font-bold text-gray-900">공지사항</h1>
            </div>
          </div>

          {/* 카테고리 필터 */}
          <div className="flex gap-2">
            <button
              onClick={() => { setCategory('all'); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                category === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => { setCategory('general'); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                category === 'general'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              일반
            </button>
            <button
              onClick={() => { setCategory('event'); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                category === 'event'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              이벤트
            </button>
            <button
              onClick={() => { setCategory('update'); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                category === 'update'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              업데이트
            </button>
            <button
              onClick={() => { setCategory('maintenance'); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                category === 'maintenance'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              점검
            </button>
          </div>
        </div>

        {/* 공지사항 목록 */}
        <div className="divide-y">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">
              로딩 중...
            </div>
          ) : announcements.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              공지사항이 없습니다.
            </div>
          ) : (
            announcements.map(announcement => (
              <div
                key={announcement.id}
                onClick={() => viewAnnouncement(announcement)}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  announcement.is_pinned ? 'bg-yellow-50' : ''
                } ${!announcement.is_read ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {announcement.is_pinned && (
                        <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                          📌 고정
                        </span>
                      )}
                      <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(announcement.category)}`}>
                        <Tag className="w-3 h-3 inline mr-1" />
                        {getCategoryLabel(announcement.category)}
                      </span>
                      {getPriorityIcon(announcement.priority)}
                      {!announcement.is_read && (
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          NEW
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {announcement.title}
                    </h3>
                    
                    {/* 미리보기 텍스트 (평문) */}
                    {announcement.content_plain && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {announcement.content_plain.substring(0, 150)}...
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(announcement.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {announcement.view_count}
                      </span>
                      <span>{announcement.author_name}</span>
                    </div>
                  </div>
                  
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-4" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="p-4 border-t flex justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이전
            </button>
            <span className="px-4 py-2">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
        )}
      </div>

      {/* 공지사항 상세 모달 */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedAnnouncement(null)}
          />
          
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b p-6">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(selectedAnnouncement.category)}`}>
                  {getCategoryLabel(selectedAnnouncement.category)}
                </span>
                {getPriorityIcon(selectedAnnouncement.priority)}
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedAnnouncement.title}
              </h2>
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(selectedAnnouncement.created_at)}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  조회 {selectedAnnouncement.view_count}
                </span>
                <span>작성자: {selectedAnnouncement.author_name}</span>
              </div>
            </div>
            
            <div className="p-6">
              {selectedAnnouncement.content_type === 'html' ? (
                <div 
                  className="prose prose-lg max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedAnnouncement.content }}
                  style={{
                    wordBreak: 'break-word',
                    lineHeight: '1.8'
                  }}
                />
              ) : (
                <div className="prose prose-lg max-w-none whitespace-pre-wrap">
                  {selectedAnnouncement.content}
                </div>
              )}
            </div>
            
            <div className="border-t p-4 flex justify-end">
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
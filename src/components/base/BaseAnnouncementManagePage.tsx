import { useState, useEffect, lazy, Suspense } from 'react';
import { Megaphone, Plus, Edit2, Trash2, Eye, EyeOff, Pin, Calendar, Tag } from 'lucide-react';
import { useAuthContext } from '@/adapters/react';

// 동적 임포트로 에디터 로드 (코드 스플리팅)
const RichTextEditor = lazy(() => 
  import('./RichTextEditor').then(module => ({ default: module.RichTextEditor }))
);

interface Announcement {
  id: string;
  title: string;
  content: string;
  content_type?: 'text' | 'html';
  category: 'general' | 'event' | 'update' | 'maintenance';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_pinned: boolean;
  is_active: boolean;
  author_name: string;
  view_count: number;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  images?: string[];
}

export function BaseAnnouncementManagePage() {
  const { user } = useAuthContext();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    content_type: 'html' as const,
    category: 'general' as const,
    priority: 'normal' as const,
    is_pinned: false,
    is_active: true,
    start_date: '',
    end_date: '',
    images: [] as string[]
  });

  // 관리자/개발자 권한 체크
  if (user?.role !== 'operator' && user?.role !== 'developer') {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800">접근 권한 없음</h2>
          <p className="text-red-600">이 페이지는 운영자와 개발자만 접근할 수 있습니다.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
      const response = await fetch(`${apiUrl}/announcements?includeInactive=true&limit=100`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Loaded announcements:', result.data);
        // data가 배열인지 확인하고 announcements 키가 있는지 체크
        if (result.data) {
          if (Array.isArray(result.data)) {
            setAnnouncements(result.data);
          } else if (result.data.announcements) {
            setAnnouncements(result.data.announcements);
          } else {
            setAnnouncements([]);
          }
        } else {
          setAnnouncements([]);
        }
      } else {
        // 에러 응답 확인
        const errorData = await response.json();
        console.error('Error response:', errorData);
        alert(`에러: ${errorData.error}\n상세: ${errorData.details || ''}`);
      }
    } catch (error) {
      console.error('Failed to load announcements:', error);
      alert('공지사항을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
      const url = editingAnnouncement 
        ? `${apiUrl}/announcements/${editingAnnouncement.id}`
        : `${apiUrl}/announcements`;
      
      const method = editingAnnouncement ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        alert(editingAnnouncement ? '공지사항이 수정되었습니다.' : '공지사항이 작성되었습니다.');
        setShowModal(false);
        resetForm();
        loadAnnouncements();
      } else {
        const error = await response.json();
        alert(error.error || '작업에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to save announcement:', error);
      alert('공지사항 저장에 실패했습니다.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
      const response = await fetch(`${apiUrl}/announcements/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (response.ok) {
        alert('공지사항이 삭제되었습니다.');
        loadAnnouncements();
      }
    } catch (error) {
      console.error('Failed to delete announcement:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      content_type: announcement.content_type || 'html',
      category: announcement.category,
      priority: announcement.priority,
      is_pinned: announcement.is_pinned,
      is_active: announcement.is_active,
      start_date: announcement.start_date || '',
      end_date: announcement.end_date || '',
      images: announcement.images || []
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      content_type: 'html',
      category: 'general',
      priority: 'normal',
      is_pinned: false,
      is_active: true,
      start_date: '',
      end_date: '',
      images: []
    });
    setEditingAnnouncement(null);
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ko-KR');
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Megaphone className="w-8 h-8 text-purple-600" />
            <h1 className="text-2xl font-bold text-gray-900">공지사항 관리</h1>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            새 공지사항
          </button>
        </div>

        {/* 공지사항 목록 */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">로딩 중...</div>
          ) : announcements.length === 0 ? (
            <div className="p-8 text-center text-gray-500">공지사항이 없습니다.</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-y">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">카테고리</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">제목</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">작성자</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">조회수</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">작성일</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {announcements.map(announcement => (
                  <tr key={announcement.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {announcement.is_pinned && (
                          <span className="text-yellow-500" title="고정">
                            <Pin className="w-4 h-4" />
                          </span>
                        )}
                        {announcement.is_active ? (
                          <span className="text-green-500" title="활성">
                            <Eye className="w-4 h-4" />
                          </span>
                        ) : (
                          <span className="text-gray-400" title="비활성">
                            <EyeOff className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(announcement.category)}`}>
                        {getCategoryLabel(announcement.category)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{announcement.title}</div>
                      {announcement.priority === 'urgent' && (
                        <span className="text-xs text-red-600">긴급</span>
                      )}
                      {announcement.priority === 'high' && (
                        <span className="text-xs text-orange-600">중요</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {announcement.author_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {announcement.view_count}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatDate(announcement.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(announcement)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="수정"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(announcement.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 작성/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                {editingAnnouncement ? '공지사항 수정' : '새 공지사항 작성'}
              </h2>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    카테고리
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="general">일반</option>
                    <option value="event">이벤트</option>
                    <option value="update">업데이트</option>
                    <option value="maintenance">점검</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    우선순위
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="low">낮음</option>
                    <option value="normal">보통</option>
                    <option value="high">높음</option>
                    <option value="urgent">긴급</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  제목
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="공지사항 제목을 입력하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  내용
                </label>
                <Suspense fallback={
                  <div className="border border-gray-300 rounded-lg p-4 h-96 flex items-center justify-center text-gray-500">
                    에디터 로딩 중...
                  </div>
                }>
                  <RichTextEditor
                    value={formData.content}
                    onChange={(value) => setFormData({ ...formData, content: value })}
                    placeholder="공지사항 내용을 입력하세요"
                    height="300px"
                  />
                </Suspense>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    게시 시작일 (선택)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    게시 종료일 (선택)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_pinned}
                    onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">상단 고정</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">활성화</span>
                </label>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                {editingAnnouncement ? '수정' : '작성'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
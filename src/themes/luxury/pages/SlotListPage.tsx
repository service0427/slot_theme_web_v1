import { useState, useEffect, useMemo } from 'react';
import { useSlotContext } from '@/adapters/react/hooks/useSlotContext';
import { useCashContext } from '@/adapters/react';
import { useConfig } from '@/contexts/ConfigContext';
import { SlotRegistrationModal } from '../components/SlotRegistrationModal';
import { SlotBulkRegistrationModal } from '../components/SlotBulkRegistrationModal';
import { UserSlotCard } from '../components/UserSlotCard';
import { UserSlotListItem } from '../components/UserSlotListItem';

type ViewType = 'grid' | 'list';

export function SlotListPage() {
  const { slots, slotPrice, createSlot, pauseSlot, resumeSlot, loadUserSlots, isLoading } = useSlotContext();
  const { config } = useConfig();
  const cashContext = config.useCashSystem ? useCashContext() : null;
  const balance = cashContext?.balance;
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showBulkRegistrationModal, setShowBulkRegistrationModal] = useState(false);
  const [viewType, setViewType] = useState<ViewType>('list');
  const [currentPage, setCurrentPage] = useState(1);
  // localStorage에서 리스트 개수 설정 불러오기
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem('listItemsPerPage');
    return saved ? Number(saved) : 10;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadUserSlots();
  }, []);

  // 필터링 및 검색
  const filteredSlots = useMemo(() => {
    return slots.filter(slot => {
      // 검색어 필터
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!slot.customFields.keywords?.toLowerCase().includes(query) && 
            !slot.customFields.landingUrl?.toLowerCase().includes(query) &&
            !(slot.customFields.description?.toLowerCase().includes(query))) {
          return false;
        }
      }
      
      // 상태 필터
      if (statusFilter !== 'all' && slot.status !== statusFilter) {
        return false;
      }
      
      return true;
    });
  }, [slots, searchQuery, statusFilter]);

  // 페이징 처리
  const paginatedSlots = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredSlots.slice(startIndex, endIndex);
  }, [filteredSlots, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredSlots.length / itemsPerPage);

  const handleSlotRegistration = async (data: { customFields: Record<string, string> }) => {
    const success = await createSlot(data);
    if (success) {
      setShowRegistrationModal(false);
    }
  };

  const canAffordSlot = !config.useCashSystem || (balance && balance.amount >= slotPrice);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">내 광고 슬롯</h1>
        <p className="text-gray-600">
          {searchQuery || statusFilter !== 'all' 
            ? `검색 결과: ${filteredSlots.length}개 / 전체: ${slots.length}개`
            : `보유 슬롯: ${slots.length}개`
          }
          {config.useCashSystem && ` | 슬롯 가격: ${slotPrice.toLocaleString()}원`}
        </p>
      </div>

      {/* 액션 바 */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex gap-3">
          <button
            onClick={() => setShowRegistrationModal(true)}
            disabled={!canAffordSlot}
            className={`px-6 py-3 rounded-lg font-medium ${
              canAffordSlot
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {config.useCashSystem 
              ? `개별 등록 (${slotPrice.toLocaleString()}원)`
              : '개별 등록 신청'
            }
          </button>
          
          <button
            onClick={() => setShowBulkRegistrationModal(true)}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            대량 등록
          </button>
        </div>

        {/* 뷰 타입 전환 */}
        <div className="flex items-center gap-4">
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setViewType('grid')}
              className={`px-4 py-2 ${
                viewType === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
              title="박스형 보기"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" 
                />
              </svg>
            </button>
            <button
              onClick={() => setViewType('list')}
              className={`px-4 py-2 ${
                viewType === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
              title="리스트형 보기"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4 6h16M4 10h16M4 14h16M4 18h16" 
                />
              </svg>
            </button>
          </div>

          {/* 페이지당 아이템 수 */}
          {viewType === 'list' && (
            <select
              value={itemsPerPage}
              onChange={(e) => {
                const newValue = Number(e.target.value);
                setItemsPerPage(newValue);
                setCurrentPage(1);
                // localStorage에 저장
                localStorage.setItem('listItemsPerPage', newValue.toString());
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value={10}>10개씩</option>
              <option value={30}>30개씩</option>
              <option value={50}>50개씩</option>
              <option value={100}>100개씩</option>
            </select>
          )}
        </div>
      </div>

      {config.useCashSystem && !canAffordSlot && (
        <p className="text-sm text-red-600 mb-4">
          캐시가 부족합니다. 현재 잔액: {balance?.amount.toLocaleString() || 0}원
        </p>
      )}

      {/* 검색 및 필터 영역 */}
      <div className="mb-4 bg-white p-4 rounded-lg shadow">
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="키워드, URL로 검색..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // 검색 시 첫 페이지로
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1); // 필터 변경 시 첫 페이지로
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">전체 상태</option>
            <option value="pending">대기중</option>
            <option value="active">활성</option>
            <option value="paused">일시정지</option>
            <option value="rejected">거절됨</option>
            <option value="deleted">삭제됨</option>
          </select>
        </div>
      </div>

      {/* 슬롯 목록 */}
      {isLoading ? (
        <div className="text-center py-8">로딩 중...</div>
      ) : slots.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-600 mb-4">등록된 슬롯이 없습니다.</p>
          <p className="text-sm text-gray-500">
            새 슬롯을 등록하여 광고를 시작하세요.
          </p>
        </div>
      ) : (
        <>
          {viewType === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedSlots.map(slot => (
                <UserSlotCard
                  key={slot.id}
                  slot={slot}
                  onPause={() => pauseSlot(slot.id)}
                  onResume={() => resumeSlot(slot.id)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">번호</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">키워드</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">URL</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상품ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">아이템ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">판매자ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">노출수</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">클릭수</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">등록일</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태/활성화</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedSlots.map(slot => (
                    <UserSlotListItem
                      key={slot.id}
                      slot={slot}
                      onPause={() => pauseSlot(slot.id)}
                      onResume={() => resumeSlot(slot.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 페이징 */}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                이전
              </button>
              
              {Array.from({ length: Math.min(10, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 10) {
                  pageNum = i + 1;
                } else if (currentPage <= 5) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 4) {
                  pageNum = totalPages - 9 + i;
                } else {
                  pageNum = currentPage - 5 + i;
                }
                
                return (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 border rounded ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}

      {/* 슬롯 등록 모달 */}
      <SlotRegistrationModal
        isOpen={showRegistrationModal}
        onClose={() => setShowRegistrationModal(false)}
        onSubmit={handleSlotRegistration}
        slotPrice={slotPrice}
      />

      {/* 슬롯 대량 등록 모달 */}
      <SlotBulkRegistrationModal
        isOpen={showBulkRegistrationModal}
        onClose={() => setShowBulkRegistrationModal(false)}
        onSuccess={() => {
          loadUserSlots(); // 성공 시 목록 새로고침
        }}
      />
    </div>
  );
}
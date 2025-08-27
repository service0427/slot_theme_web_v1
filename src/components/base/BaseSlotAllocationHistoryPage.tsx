import { useState, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronUp, Search, User, UserCheck } from 'lucide-react';
import { BaseSlotExtensionModal } from './BaseSlotExtensionModal';

interface AllocationHistory {
  id: string;
  operator_id: string;
  operator_name: string;
  operator_email: string;
  user_id: string;
  user_name: string;
  user_email: string;
  current_user_name: string;
  current_user_email: string;
  slot_count: number;
  price_per_slot: number;
  reason: string;
  memo: string;
  created_at: string;
  payment?: boolean;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function BaseSlotAllocationHistoryPage() {
  const [allocations, setAllocations] = useState<AllocationHistory[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [searchUser, setSearchUser] = useState('');
  const [searchOperator, setSearchOperator] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const [extendingAllocation, setExtendingAllocation] = useState<AllocationHistory | null>(null);
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  
  // 슬롯 확인 모달 상태
  const [viewingAllocation, setViewingAllocation] = useState<AllocationHistory | null>(null);
  const [showSlotsModal, setShowSlotsModal] = useState(false);
  const [allocationSlots, setAllocationSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

  // 데이터 로드
  const loadAllocations = async () => {
    setLoading(true);
    try {
      // 날짜 필터 계산
      let dateFrom = '';
      const now = new Date();
      
      switch (dateFilter) {
        case 'today':
          dateFrom = new Date(now.setHours(0, 0, 0, 0)).toISOString();
          break;
        case 'week':
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          dateFrom = weekAgo.toISOString();
          break;
        case 'month':
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          dateFrom = monthAgo.toISOString();
          break;
      }

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pageSize.toString(),
        sortBy,
        sortOrder,
        ...(dateFrom && { dateFrom }),
        ...(searchUser && { userId: searchUser }),
        ...(searchOperator && { operatorId: searchOperator })
      });

      const response = await fetch(`${apiUrl}/slots/allocation-history?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setAllocations(result.data.allocations);
          setPagination(result.data.pagination);
        }
      }
    } catch (error) {
      // Failed to load allocations
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllocations();
  }, [pagination.page, pageSize, sortBy, sortOrder, dateFilter]);

  // 정렬 토글
  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // 날짜 포맷
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 페이지 변경
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // 페이지 크기 변경
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPagination(prev => ({ ...prev, page: 1, limit: newSize }));
  };

  // 결제 완료 처리
  const handlePaymentComplete = async (allocationId: string) => {
    if (!confirm('결제 완료 처리하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/slots/allocation-history/${allocationId}/payment`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ payment: true })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // 목록 새로고침
          loadAllocations();
        } else {
          alert('결제 완료 처리에 실패했습니다.');
        }
      } else {
        alert('결제 완료 처리에 실패했습니다.');
      }
    } catch (error) {
      alert('결제 완료 처리 중 오류가 발생했습니다.');
    }
  };

  // 결제 취소 처리
  const handlePaymentCancel = async (allocationId: string) => {
    if (!confirm('결제를 취소하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/slots/allocation-history/${allocationId}/payment`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ payment: false })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert('결제가 취소되었습니다.');
          // 목록 새로고침
          loadAllocations();
        } else {
          alert('결제 취소에 실패했습니다.');
        }
      } else {
        alert('결제 취소에 실패했습니다.');
      }
    } catch (error) {
      alert('결제 취소 중 오류가 발생했습니다.');
    }
  };

  // 대량 슬롯 연장 처리
  const handleBulkExtension = async (extensionDays: number) => {
    if (!extendingAllocation) return;
    
    setIsExtending(true);
    try {
      const response = await fetch(`${apiUrl}/slots/extend-bulk`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          allocationHistoryId: extendingAllocation.id,
          extensionDays
        })
      });

      const result = await response.json();
      
      if (result.success) {
        const { extended, failed, total } = result.data;
        let message = `총 ${total}개 중 ${extended}개 슬롯이 연장되었습니다.`;
        if (failed > 0) {
          message += `\n${failed}개 슬롯 연장 실패`;
        }
        alert(message);
        
        // 목록 새로고침
        loadAllocations();
        setShowExtensionModal(false);
        setExtendingAllocation(null);
      } else {
        alert(result.error || '슬롯 연장에 실패했습니다.');
      }
    } catch (error) {
      alert('슬롯 연장 중 오류가 발생했습니다.');
    } finally {
      setIsExtending(false);
    }
  };

  // 연장 모달 열기
  const openExtensionModal = (allocation: AllocationHistory) => {
    setExtendingAllocation(allocation);
    setShowExtensionModal(true);
  };

  // 슬롯 확인 함수
  const loadAllocationSlots = async (allocationHistoryId: string) => {
    setLoadingSlots(true);
    try {
      const response = await fetch(`${apiUrl}/slots/by-allocation/${allocationHistoryId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      const result = await response.json();
      
      if (result.success) {
        setAllocationSlots(result.data || []);
      } else {
        alert(result.error || '슬롯 정보를 불러오는데 실패했습니다.');
        setAllocationSlots([]);
      }
    } catch (error) {
      alert('슬롯 정보를 불러오는 중 오류가 발생했습니다.');
      setAllocationSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  // 슬롯 확인 모달 열기
  const openSlotsModal = async (allocation: AllocationHistory) => {
    setViewingAllocation(allocation);
    setShowSlotsModal(true);
    await loadAllocationSlots(allocation.id);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border">
        {/* 헤더 */}
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-gray-900">슬롯 발급 내역</h1>
          <p className="text-gray-600 mt-1">관리자가 사용자에게 발급한 슬롯 내역을 확인할 수 있습니다.</p>
        </div>

        {/* 필터 */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex flex-wrap gap-4">
            {/* 기간 필터 */}
            <div className="flex gap-2">
              {(['all', 'today', 'week', 'month'] as const).map(filter => (
                <button
                  key={filter}
                  onClick={() => {
                    setDateFilter(filter);
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dateFilter === filter
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border'
                  }`}
                >
                  {filter === 'all' ? '전체' : 
                   filter === 'today' ? '오늘' :
                   filter === 'week' ? '일주일' : '한달'}
                </button>
              ))}
            </div>

            {/* 페이지 크기 선택 */}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-gray-600">표시 개수:</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={20}>20개</option>
                <option value={50}>50개</option>
                <option value={100}>100개</option>
              </select>
            </div>
          </div>
        </div>

        {/* 테이블 */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              로딩 중...
            </div>
          ) : allocations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              발급 내역이 없습니다.
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-y">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleSort('created_at')}
                  >
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      발급일시
                      {sortBy === 'created_at' && (
                        sortOrder === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleSort('user_name')}
                  >
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      사용자
                      {sortBy === 'user_name' && (
                        sortOrder === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleSort('slot_count')}
                  >
                    <div className="flex items-center gap-1">
                      슬롯수
                      {sortBy === 'slot_count' && (
                        sortOrder === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                  {/* 단가 컬럼 주석처리
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleSort('price_per_slot')}
                  >
                    <div className="flex items-center gap-1">
                      단가
                      {sortBy === 'price_per_slot' && (
                        sortOrder === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                      )}
                    </div>
                  </th> */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    사유
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    메모
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {allocations.map(allocation => (
                  <tr key={allocation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatDate(allocation.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {allocation.current_user_name || allocation.user_name || '사용자'}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {allocation.current_user_email || allocation.user_email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {allocation.slot_count}개
                      </span>
                    </td>
                    {/* 단가 데이터 주석처리
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {Math.floor(allocation.price_per_slot).toLocaleString()}원
                      </span>
                    </td> */}
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {allocation.reason || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {allocation.memo ? (
                        <div className="group relative">
                          <span className="truncate block max-w-xs cursor-help">
                            {allocation.memo.length > 20 
                              ? allocation.memo.substring(0, 20) + '...' 
                              : allocation.memo}
                          </span>
                          {allocation.memo.length > 20 && (
                            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10">
                              <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 max-w-sm">
                                {allocation.memo}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {/* 결제 상태 관련 버튼 */}
                        {!allocation.payment ? (
                          <button
                            onClick={() => handlePaymentComplete(allocation.id)}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                          >
                            결제 완료
                          </button>
                        ) : (
                          <button
                            onClick={() => handlePaymentCancel(allocation.id)}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                          >
                            결제 취소
                          </button>
                        )}
                        
                        {/* 슬롯 확인 버튼 */}
                        <button
                          onClick={() => openSlotsModal(allocation)}
                          className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors mr-2"
                        >
                          슬롯 확인
                        </button>
                        
                        {/* 전체 연장 버튼 */}
                        <button
                          onClick={() => openExtensionModal(allocation)}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
                        >
                          전체 연장
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 페이지네이션 */}
        {pagination.totalPages > 1 && (
          <div className="p-6 border-t">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                전체 {pagination.total}개 중 {((pagination.page - 1) * pagination.limit) + 1}-
                {Math.min(pagination.page * pagination.limit, pagination.total)}개 표시
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  이전
                </button>
                
                {/* 페이지 번호들 */}
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg ${
                        pagination.page === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 bg-white border hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  다음
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 대량 슬롯 연장 모달 */}
      {showExtensionModal && extendingAllocation && (
        <BaseSlotExtensionModal
          isOpen={showExtensionModal}
          onClose={() => {
            setShowExtensionModal(false);
            setExtendingAllocation(null);
          }}
          onExtend={handleBulkExtension}
          slotInfo={{
            id: extendingAllocation.id,
            keyword: `${extendingAllocation.user_name}님의 ${extendingAllocation.slot_count}개 슬롯`,
            url: '',
            endDate: new Date().toISOString(), // 발급 내역에는 종료일이 없으므로 현재 날짜 사용
            isExpired: false
          }}
        />
      )}

      {/* 슬롯 확인 모달 */}
      {showSlotsModal && viewingAllocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
            {/* 헤더 */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-indigo-600">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-white">슬롯 상세 정보</h3>
                  <p className="text-blue-100 text-sm mt-1">
                    {viewingAllocation.user_name}님의 {viewingAllocation.slot_count}개 슬롯 ({viewingAllocation.reason})
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowSlotsModal(false);
                    setViewingAllocation(null);
                    setAllocationSlots([]);
                  }}
                  className="text-white hover:text-blue-200 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            {/* 본문 */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingSlots ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">슬롯 정보를 불러오는 중...</span>
                </div>
              ) : allocationSlots.length > 0 ? (
                <div className="space-y-4">
                  {allocationSlots.map((slot, index) => (
                    <div key={slot.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <span className="text-sm font-medium text-gray-500">슬롯 번호</span>
                          <p className="font-semibold">#{slot.slot_number || index + 1}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">키워드</span>
                          <p className="font-semibold">{slot.keyword || '-'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">상태</span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            slot.status === 'active' ? 'bg-green-100 text-green-800' :
                            slot.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            slot.status === 'paused' ? 'bg-gray-100 text-gray-800' :
                            slot.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {slot.status === 'active' ? '활성' :
                             slot.status === 'pending' ? '대기중' :
                             slot.status === 'paused' ? '일시정지' :
                             slot.status === 'rejected' ? '거절됨' :
                             slot.status}
                          </span>
                        </div>
                        {slot.url && (
                          <div className="md:col-span-2">
                            <span className="text-sm font-medium text-gray-500">URL</span>
                            <p className="text-blue-600 text-sm break-all">{slot.url}</p>
                          </div>
                        )}
                        {(slot.pre_allocation_start_date || slot.pre_allocation_end_date) && (
                          <div>
                            <span className="text-sm font-medium text-gray-500">작업 기간</span>
                            <p className="text-sm">
                              {slot.pre_allocation_start_date ? new Date(slot.pre_allocation_start_date).toLocaleDateString('ko-KR') : '-'} ~ 
                              {slot.pre_allocation_end_date ? new Date(slot.pre_allocation_end_date).toLocaleDateString('ko-KR') : '-'}
                            </p>
                          </div>
                        )}
                        {slot.parent_slot_id && (
                          <div>
                            <span className="text-sm font-medium text-gray-500">연장 정보</span>
                            <p className="text-sm">
                              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
                                {slot.extension_days}일 연장
                              </span>
                            </p>
                          </div>
                        )}
                        {slot.is_test && (
                          <div>
                            <span className="text-sm font-medium text-gray-500">슬롯 타입</span>
                            <p className="text-sm">
                              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                                테스트 슬롯
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="text-6xl mb-4">📭</div>
                  <div className="text-xl font-medium text-gray-600 mb-2">슬롯이 없습니다</div>
                  <div className="text-sm text-gray-400">해당 발급 내역과 연결된 슬롯을 찾을 수 없습니다</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
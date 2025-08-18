import React, { useState, useEffect } from 'react';
import { useSlotContext } from '@/adapters/react/hooks/useSlotContext';
import { UserSlot } from '@/core/models/UserSlot';
import { useConfig } from '@/contexts/ConfigContext';
import { useSystemSettings } from '@/contexts/SystemSettingsContext';
import { fieldConfigService, FieldConfig } from '@/adapters/services/ApiFieldConfigService';

interface AdminSlotApprovalThemeProps {
  containerClass?: string;
  headerClass?: string;
  titleClass?: string;
  subtitleClass?: string;
  loadingClass?: string;
  emptyStateClass?: string;
  tableContainerClass?: string;
  tableClass?: string;
  tableHeaderClass?: string;
  tableRowClass?: string;
  approveButtonClass?: string;
  rejectButtonClass?: string;
  modalContainerClass?: string;
  modalClass?: string;
  modalTitleClass?: string;
  modalInputClass?: string;
  modalButtonClass?: string;
  modalCancelButtonClass?: string;
}

interface BaseAdminSlotApprovalPageProps {
  theme?: AdminSlotApprovalThemeProps;
}

export const BaseAdminSlotApprovalPage: React.FC<BaseAdminSlotApprovalPageProps> = ({
  theme = {}
}) => {
  const { loadAllSlots, approveSlot, rejectSlot } = useSlotContext();
  const { config } = useConfig();
  const { getSetting } = useSystemSettings();
  
  // 현재 테마 가져오기
  const currentTheme = getSetting('theme', 'theme') || 'modern';
  
  // 슬롯 운영 모드 확인
  const slotOperationMode = getSetting('slotOperationMode', 'business') || 'normal';
  const isPreAllocationMode = slotOperationMode === 'pre-allocation';
  
  const [pendingSlots, setPendingSlots] = useState<UserSlot[]>([]);
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([]);
  const [allSlots, setAllSlots] = useState<UserSlot[]>([]);
  const [totalSlots, setTotalSlots] = useState<UserSlot[]>([]); // 필터링 전 전체 슬롯
  const [isLoading, setIsLoading] = useState(true);
  const [rejectingSlot, setRejectingSlot] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvingSlot, setApprovingSlot] = useState<string | null>(null);
  const [refundingSlot, setRefundingSlot] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [approvedPrice, setApprovedPrice] = useState<number>(0);
  const [editingPriceSlot, setEditingPriceSlot] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingHistorySlot, setViewingHistorySlot] = useState<string | null>(null);
  const [slotHistory, setSlotHistory] = useState<any[]>([]);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [editingSlot, setEditingSlot] = useState<UserSlot | null>(null);
  const [editFormData, setEditFormData] = useState<Record<string, string>>({});

  // 기본 스타일
  const defaultTheme: AdminSlotApprovalThemeProps = {
    containerClass: 'p-6',
    headerClass: 'mb-6',
    titleClass: 'text-2xl font-bold mb-2',
    subtitleClass: 'text-gray-600',
    loadingClass: 'p-6',
    emptyStateClass: 'bg-gray-50 rounded-lg p-8 text-center',
    tableContainerClass: 'bg-white rounded-lg shadow overflow-hidden',
    tableClass: 'w-full',
    tableHeaderClass: 'bg-gray-50',
    tableRowClass: 'hover:bg-gray-50',
    approveButtonClass: 'px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700',
    rejectButtonClass: 'px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700',
    modalContainerClass: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50',
    modalClass: 'bg-white rounded-lg p-6 max-w-md w-full mx-4',
    modalTitleClass: 'text-lg font-semibold mb-4',
    modalInputClass: 'w-full px-3 py-2 border border-gray-300 rounded-lg',
    modalButtonClass: 'px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700',
    modalCancelButtonClass: 'px-4 py-2 text-gray-600 hover:text-gray-800'
  };

  // 테마 병합
  const mergedTheme = { ...defaultTheme, ...theme };

  useEffect(() => {
    // 필드 설정 로드
    const loadFieldConfigs = async () => {
      try {
        const configs = await fieldConfigService.getFieldConfigs();
        // configs가 배열로 직접 오는 경우와 success/data 구조로 오는 경우 모두 처리
        const configData = Array.isArray(configs) ? configs : 
          ((configs as any).success && (configs as any).data ? (configs as any).data : []);
        
        if (configData && configData.length > 0) {
          // URL 파싱 필드와 시스템 생성 필드 제외
          const visibleFields = configData.filter((field: FieldConfig) => 
            !field.is_system_generated && 
            !['url_product_id', 'url_item_id', 'url_vendor_item_id'].includes(field.field_key)
          );
          setFieldConfigs(visibleFields);
        }
      } catch (error) {
        // console.error('필드 설정 로드 실패:', error);
      }
    };

    loadFieldConfigs();
    
    // 전체 슬롯 로드 (카운트 계산용)
    if (statusFilter === 'all' || !totalSlots.length) {
      loadAllSlots(undefined).then(allSlotsData => {
        setTotalSlots(allSlotsData);
      });
    }
    
    // 필터링된 슬롯 로드
    loadAllSlots(statusFilter === 'all' ? undefined : statusFilter).then(slots => {
      if (slots.length > 0) {
        // console.log('[DEBUG] 첫 번째 슬롯 상세:', {
        //   id: slots[0].id,
        //   thumbnail: (slots[0] as any).thumbnail,
        //   rank: (slots[0] as any).rank,
        //   first_rank: (slots[0] as any).first_rank,
        //   status: slots[0].status,
        //   keyword: (slots[0] as any).keyword
        // });
      }
      
      let filteredSlots = slots;
      const now = new Date();
      
      // 상태별 필터링 (날짜 조건 포함)
      if (statusFilter !== 'all') {
        if (isPreAllocationMode) {
          // 선슬롯발행 모드 - 특별한 필터링 필요
          if (statusFilter === 'waiting' || statusFilter === 'active' || statusFilter === 'completed') {
            // waiting, active, completed는 모두 DB상 active 상태이므로, 백엔드에서 모든 active를 받아와야 함
            // 그래서 백엔드에 'active'를 요청했어야 하는데, 현재는 'waiting'을 요청함
            // 이 경우 백엔드에서 모든 슬롯을 받아와서 프론트에서 필터링
            loadAllSlots('active').then(activeSlotsAll => {
              
              let refiltered = activeSlotsAll;
              if (statusFilter === 'waiting') {
                // 진행대기: active 상태이면서 시작일 전
                refiltered = activeSlotsAll.filter(slot => 
                  slot.startDate && new Date(slot.startDate) > now
                );
              } else if (statusFilter === 'active') {
                // 진행중: active 상태이면서 기간 내
                refiltered = activeSlotsAll.filter(slot => 
                  (!slot.startDate || new Date(slot.startDate) <= now) &&
                  (!slot.endDate || new Date(slot.endDate) >= now)
                );
              } else if (statusFilter === 'completed') {
                // 완료: active 상태이면서 종료일 지남
                refiltered = activeSlotsAll.filter(slot => 
                  slot.endDate && new Date(slot.endDate) < now
                );
              }
              
              setAllSlots(refiltered);
              setPendingSlots(refiltered);
            });
            return; // early return
          } else {
            // empty, pending, paused, rejected는 그대로 사용
            filteredSlots = slots;
          }
        } else {
          // 일반 모드: 백엔드에서 이미 필터링된 상태 그대로 사용
          // 하지만 active인 경우 날짜 확인
          if (statusFilter === 'active') {
            filteredSlots = slots.filter(slot => 
              slot.status === 'active' && 
              (!slot.startDate || new Date(slot.startDate) <= now) &&
              (!slot.endDate || new Date(slot.endDate) >= now)
            );
          }
        }
      }
      
      setAllSlots(filteredSlots);
      setPendingSlots(filteredSlots);
      setIsLoading(false);
    });
  }, [statusFilter, isPreAllocationMode]);

  // 검색 및 가격 필터링
  useEffect(() => {
    let filtered = [...allSlots];
    
    // 텍스트 검색
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(slot => {
        return (
          getSlotFieldValue(slot, 'keyword')?.toLowerCase().includes(searchLower) ||
          slot.userName?.toLowerCase().includes(searchLower) ||
          slot.userEmail?.toLowerCase().includes(searchLower) ||
          getSlotFieldValue(slot, 'url')?.toLowerCase().includes(searchLower)
        );
      });
    }
    
    // 가격 필터
    if (priceFilter) {
      const priceNum = parseFloat(priceFilter);
      if (!isNaN(priceNum)) {
        filtered = filtered.filter(slot => {
          const slotPrice = slot.approvedPrice || slot.price || slot.amount || 0;
          return slotPrice >= priceNum;
        });
      }
    }
    
    setPendingSlots(filtered);
    setCurrentPage(1);
  }, [searchQuery, priceFilter, allSlots]);

  // 페이징 처리
  const totalPages = Math.ceil(pendingSlots.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSlots = pendingSlots.slice(startIndex, endIndex);

  const handleApprove = async (slotId: string) => {
    if (!config.useCashSystem) {
      // 캐시 시스템 OFF일 때는 가격 입력 모달 표시
      setApprovingSlot(slotId);
      setApprovedPrice(config.defaultSlotPrice || 10000);
    } else {
      // 캐시 시스템 ON일 때는 바로 승인
      const success = await approveSlot(slotId);
      if (success) {
        // 승인 후 전체 리스트 다시 로드
        const slots = await loadAllSlots(statusFilter === 'all' ? undefined : statusFilter);
        setAllSlots(slots);
        setPendingSlots(slots);
      }
    }
  };

  const handleApproveWithPrice = async () => {
    if (!approvingSlot) return;
    
    if (approvedPrice <= 0) {
      alert('올바른 가격을 입력해주세요.');
      return;
    }
    
    const success = await approveSlot(approvingSlot, approvedPrice);
    if (success) {
      // 승인 후 전체 리스트 다시 로드
      const slots = await loadAllSlots(statusFilter === 'all' ? undefined : statusFilter);
      setAllSlots(slots);
      setPendingSlots(slots);
      setApprovingSlot(null);
      setApprovedPrice(0);
    }
  };

  const handleReject = async (slotId: string) => {
    if (!rejectionReason.trim()) {
      alert('거부 사유를 입력해주세요.');
      return;
    }
    
    const success = await rejectSlot(slotId, rejectionReason);
    if (success) {
      // 거부 후 전체 리스트 다시 로드
      const slots = await loadAllSlots(statusFilter === 'all' ? undefined : statusFilter);
      setAllSlots(slots);
      setPendingSlots(slots);
      setRejectingSlot(null);
      setRejectionReason('');
    }
  };

  const handleRefund = async (slotId: string) => {
    if (!refundReason.trim()) {
      alert('환불 사유를 입력해주세요.');
      return;
    }
    
    try {
      const token = localStorage.getItem('accessToken');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
      const response = await fetch(`${API_BASE_URL}/slots/${slotId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'refunded',
          refundReason: refundReason
        })
      });

      if (response.ok) {
        alert('환불 처리가 완료되었습니다.');
        // 환불 후 전체 리스트 다시 로드
        const slots = await loadAllSlots(statusFilter === 'all' ? undefined : statusFilter);
        setAllSlots(slots);
        setPendingSlots(slots);
        setRefundingSlot(null);
        setRefundReason('');
      } else {
        alert('환불 처리에 실패했습니다.');
      }
    } catch (error) {
      // console.error('환불 처리 오류:', error);
      alert('환불 처리 중 오류가 발생했습니다.');
    }
  };

  // 슬롯 변경 히스토리 조회
  const handleViewHistory = async (slotId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
      
      const response = await fetch(`${API_BASE_URL}/slots/${slotId}/logs`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setSlotHistory(result.data || []);
        setViewingHistorySlot(slotId);
      } else {
        alert('히스토리 조회에 실패했습니다.');
      }
    } catch (error) {
      // console.error('히스토리 조회 오류:', error);
      alert('히스토리 조회 중 오류가 발생했습니다.');
    }
  };


  const handleUpdatePrice = async () => {
    if (!editingPriceSlot) return;
    
    if (editPrice <= 0) {
      alert('올바른 가격을 입력해주세요.');
      return;
    }
    
    // 가격만 업데이트하는 API 호출
    const success = await approveSlot(editingPriceSlot, editPrice);
    if (success) {
      // 업데이트 후 전체 리스트 다시 로드
      const slots = await loadAllSlots(statusFilter === 'all' ? undefined : statusFilter);
      setAllSlots(slots);
      setPendingSlots(slots);
      setEditingPriceSlot(null);
      setEditPrice(0);
    }
  };

  const handleComplete = async (slotId: string) => {
    // 완료 처리 (상태를 completed로 변경하거나 리스트에서 제거)
    // 여기서는 리스트에서 제거하는 방식으로 구현
    const confirmed = confirm('이 슬롯을 완료 처리하시겠습니까?');
    if (confirmed) {
      // 완료 처리 후 리스트에서 제거
      setAllSlots(prev => prev.filter(s => s.id !== slotId));
      setPendingSlots(prev => prev.filter(s => s.id !== slotId));
    }
  };

  // 슬롯 수정 핸들러
  const handleEditSlot = (slot: UserSlot) => {
    const formData: Record<string, string> = {};
    
    // fieldConfigs 기반으로 초기값 설정
    fieldConfigs.forEach(field => {
      const value = getSlotFieldValue(slot, field.field_key);
      formData[field.field_key] = value || '';
    });
    
    setEditFormData(formData);
    setEditingSlot(slot);
  };

  // 슬롯 수정 저장
  const handleSaveEdit = async () => {
    if (!editingSlot) return;
    
    try {
      const token = localStorage.getItem('accessToken');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
      
      const response = await fetch(`${API_BASE_URL}/slots/${editingSlot.id}/update-fields`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          customFields: editFormData
        })
      });

      if (response.ok) {
        alert('슬롯이 수정되었습니다.');
        // 수정 후 리스트 새로고침
        const slots = await loadAllSlots(statusFilter === 'all' ? undefined : statusFilter);
        setAllSlots(slots);
        setPendingSlots(slots);
        setEditingSlot(null);
        setEditFormData({});
      } else {
        const error = await response.json();
        alert(error.error || '슬롯 수정에 실패했습니다.');
      }
    } catch (error) {
      // console.error('슬롯 수정 오륙:', error);
      alert('슬롯 수정 중 오류가 발생했습니다.');
    }
  };

  // 슬롯 필드 값 가져오기 함수
  const getSlotFieldValue = (slot: UserSlot, fieldKey: string) => {

    // slot_field_values에서 먼저 찾기
    if ((slot as any).fieldValues) {
      const fieldValue = (slot as any).fieldValues.find((fv: any) => fv.field_key === fieldKey);
      if (fieldValue && fieldValue.value) {
        return fieldValue.value;
      }
    }
    
    // customFields에서 찾기
    if (slot.customFields && slot.customFields[fieldKey]) {
      return slot.customFields[fieldKey];
    }
    
    // slots 테이블의 기본 필드에서 찾기
    if (fieldKey === 'url') {
      const value = (slot as any).url || '';
      return value;
    }
    if (fieldKey === 'keyword') {
      const value = (slot as any).keyword || '';
      return value;
    }
    // MID 필드는 제거됨 - URL 파싱 데이터로 대체
    
    return '';
  };

  if (isLoading) {
    return <div className={mergedTheme.loadingClass}>로딩 중...</div>;
  }

  // 상태별 통계 (전체 슬롯 기준으로 계산)
  const now = new Date();
  const slotsForCount = totalSlots.length > 0 ? totalSlots : allSlots; // totalSlots가 있으면 사용, 없으면 allSlots
  const statusCounts = {
    all: slotsForCount.length,
    empty: slotsForCount.filter(s => s.status === 'empty').length,
    pending: slotsForCount.filter(s => s.status === 'pending').length,
    waiting: slotsForCount.filter(s => {
      if (s.status !== 'active') return false;
      const start = s.startDate ? new Date(s.startDate) : null;
      return start && now < start;
    }).length,
    active: slotsForCount.filter(s => {
      if (s.status !== 'active') return false;
      const start = s.startDate ? new Date(s.startDate) : null;
      const end = s.endDate ? new Date(s.endDate) : null;
      return (!start || now >= start) && (!end || now <= end);
    }).length,
    completed: slotsForCount.filter(s => {
      if (s.status !== 'active') return false;
      const end = s.endDate ? new Date(s.endDate) : null;
      return end && now > end;
    }).length,
    paused: slotsForCount.filter(s => s.status === 'paused').length,
    rejected: slotsForCount.filter(s => s.status === 'rejected').length
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      paused: 'bg-gray-100 text-gray-800',
      expired: 'bg-orange-100 text-orange-800',
      empty: 'bg-blue-100 text-blue-800',
      refunded: 'bg-purple-100 text-purple-800'
    };
    
    const statusLabels: Record<string, string> = {
      pending: '대기중',
      active: '활성',
      rejected: '거절됨',
      paused: '일시정지',
      expired: '만료됨',
      empty: '빈 슬롯',
      refunded: '환불완료'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  return (
    <div className={mergedTheme.containerClass}>
      <div className={mergedTheme.headerClass}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className={mergedTheme.titleClass}>{isPreAllocationMode ? '슬롯 관리' : '슬롯 승인'}</h1>
            <p className={mergedTheme.subtitleClass}>
              전체 슬롯: {statusCounts.all}개
              {isPreAllocationMode && (
                <span className="ml-2">
                  (입력대기: {statusCounts.empty}, 진행대기: {statusCounts.waiting}, 
                  진행중: {statusCounts.active}, 완료: {statusCounts.completed}, 일시정지: {statusCounts.paused})
                </span>
              )}
              {!isPreAllocationMode && (
                <span className="ml-2">
                  (승인대기: {statusCounts.pending}, 활성: {statusCounts.active}, 거부: {statusCounts.rejected})
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* 필터 섹션 */}
      <div className="mb-4 space-y-3">
        {/* 상태 필터 */}
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-lg ${
              statusFilter === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            전체 ({statusCounts.all})
          </button>
          {isPreAllocationMode ? (
            <>
              <button
                onClick={() => setStatusFilter('empty')}
                className={`px-4 py-2 rounded-lg ${
                  statusFilter === 'empty' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                }`}
              >
                입력대기 ({statusCounts.empty})
              </button>
              <button
                onClick={() => setStatusFilter('waiting')}
                className={`px-4 py-2 rounded-lg ${
                  statusFilter === 'waiting' 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                }`}
              >
                진행대기 ({statusCounts.waiting})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-4 py-2 rounded-lg ${
                  statusFilter === 'active' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-green-100 text-green-800 hover:bg-green-200'
                }`}
              >
                진행중 ({statusCounts.active})
              </button>
              <button
                onClick={() => setStatusFilter('completed')}
                className={`px-4 py-2 rounded-lg ${
                  statusFilter === 'completed' 
                    ? 'bg-gray-600 text-white' 
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                완료 ({statusCounts.completed})
              </button>
              <button
                onClick={() => setStatusFilter('paused')}
                className={`px-4 py-2 rounded-lg ${
                  statusFilter === 'paused' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                }`}
              >
                일시정지 ({statusCounts.paused})
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-4 py-2 rounded-lg ${
                  statusFilter === 'pending' 
                    ? 'bg-yellow-600 text-white' 
                    : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                }`}
              >
                승인대기 ({statusCounts.pending})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-4 py-2 rounded-lg ${
                  statusFilter === 'active' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-green-100 text-green-800 hover:bg-green-200'
                }`}
              >
                승인됨 ({statusCounts.active})
              </button>
              <button
                onClick={() => setStatusFilter('rejected')}
                className={`px-4 py-2 rounded-lg ${
                  statusFilter === 'rejected' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-red-100 text-red-800 hover:bg-red-200'
                }`}
              >
                거부됨 ({statusCounts.rejected})
              </button>
            </>
          )}
        </div>

        {/* 검색 바 */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="키워드, 광고주명, 아이디, URL로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            placeholder="최소 금액"
            value={priceFilter}
            onChange={(e) => setPriceFilter(e.target.value)}
            className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {pendingSlots.length === 0 ? (
        <div className={mergedTheme.emptyStateClass}>
          <p className="text-gray-600">
            {statusFilter === 'pending' ? '승인 대기 중인 슬롯이 없습니다.' :
             statusFilter === 'active' ? '승인된 슬롯이 없습니다.' :
             statusFilter === 'rejected' ? '거부된 슬롯이 없습니다.' :
             '슬롯이 없습니다.'}
          </p>
        </div>
      ) : (
        <div className={mergedTheme.tableContainerClass}>
          <table className={mergedTheme.tableClass}>
            <thead className={mergedTheme.tableHeaderClass}>
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">신청일시</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">광고주</th>
                {/* 썸네일 */}
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">썸네일</th>
                {/* 관리자가 설정한 필드들 */}
                {fieldConfigs.map(field => (
                  <th key={field.field_key} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    {field.label}
                  </th>
                ))}
                {/* 순위 */}
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">순위</th>
                {/* URL 파싱 필드들 */}
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">상품ID</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">아이템ID</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">판매자ID</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">시작일</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">종료일</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">금액</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentSlots.map(slot => (
                <tr key={slot.id} className={mergedTheme.tableRowClass}>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div>{new Date(slot.createdAt).toLocaleDateString('ko-KR')}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(slot.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium text-xs">{slot.userName || '이름 없음'}</div>
                      <div className="text-xs text-gray-500">{slot.userEmail || 'user_id'}</div>
                    </div>
                  </td>
                  {/* 썸네일 */}
                  <td className="px-3 py-2 text-center">
                    {(slot as any).thumbnail ? (
                      <img 
                        src={(slot as any).thumbnail} 
                        alt="썸네일" 
                        className="w-12 h-12 object-cover rounded mx-auto"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                    <span className="text-gray-400 text-sm hidden">-</span>
                  </td>
                  {/* 동적 필드들 */}
                  {fieldConfigs.map(field => {
                    const fieldValue = getSlotFieldValue(slot, field.field_key);
                    return (
                      <td key={field.field_key} className="px-3 py-2 text-sm text-gray-900">
                        {field.field_type === 'url' && fieldValue ? (
                          <div className="flex justify-center">
                            <button 
                              onClick={() => {
                                const url = fieldValue.startsWith('http') ? fieldValue : `https://${fieldValue}`;
                                window.open(url, '_blank', 'width=700,height=800');
                              }}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                              title={fieldValue}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <span className={field.field_key === 'keyword' ? 'font-medium' : ''}>
                            {fieldValue || '-'}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  {/* 순위 */}
                  <td className="px-3 py-2 text-center text-sm">
                    {(slot as any).is_processing ? (
                      <span className="text-blue-600 font-medium">진행중</span>
                    ) : (slot as any).rank && (slot as any).rank > 0 ? (
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-semibold text-gray-900">{(slot as any).rank}</span>
                        {(slot as any).yesterday_rank && (
                          <span className={`text-xs ${
                            (slot as any).yesterday_rank > (slot as any).rank 
                              ? 'text-green-600' 
                              : (slot as any).yesterday_rank < (slot as any).rank 
                                ? 'text-red-600' 
                                : 'text-gray-500'
                          }`}>
                            {(slot as any).yesterday_rank > (slot as any).rank 
                              ? `(▲${(slot as any).yesterday_rank - (slot as any).rank})` 
                              : (slot as any).yesterday_rank < (slot as any).rank 
                                ? `(▼${(slot as any).rank - (slot as any).yesterday_rank})` 
                                : '(-)'}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">순위없음</span>
                    )}
                  </td>
                  {/* URL 파싱 필드들 */}
                  <td className="px-3 py-2 text-sm text-gray-900">
                    <span className="text-xs">
                      {getSlotFieldValue(slot, 'url_product_id') || '-'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900">
                    <span className="text-xs">
                      {getSlotFieldValue(slot, 'url_item_id') || '-'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900">
                    <span className="text-xs">
                      {getSlotFieldValue(slot, 'url_vendor_item_id') || '-'}
                    </span>
                  </td>
                  {/* 시작일 */}
                  <td className="px-3 py-2 text-sm text-gray-900">
                    {slot.startDate ? (
                      <div>
                        <div>{new Date(slot.startDate).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        }).replace(/\./g, '-').replace(/-$/, '')}</div>
                        {slot.workCount && <div className="text-xs text-gray-500">작업 {slot.workCount}건</div>}
                      </div>
                    ) : '-'}
                  </td>
                  {/* 종료일 */}
                  <td className="px-3 py-2 text-sm text-gray-900">
                    {slot.endDate ? (
                      <div>
                        <div>{new Date(slot.endDate).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        }).replace(/\./g, '-').replace(/-$/, '')}</div>
                        {slot.description && <div className="text-xs text-gray-500" title={slot.description}>
                          {slot.description.length > 10 ? slot.description.substring(0, 10) + '...' : slot.description}
                        </div>}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-3 py-2 text-sm font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      {slot.approvedPrice ? `₩${Math.floor(slot.approvedPrice).toLocaleString()}` : 
                       slot.price ? `₩${Math.floor(slot.price).toLocaleString()}` :
                       slot.amount ? `₩${Math.floor(slot.amount).toLocaleString()}` : '-'}
                      {(slot.status === 'active' || slot.status === 'empty') && (
                        <button
                          onClick={() => {
                            setEditingPriceSlot(slot.id);
                            setEditPrice(slot.approvedPrice || 0);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="금액 수정"
                        >
                          ✏️
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-sm">
                    <div className="relative inline-block group">
                      <span 
                        className={`inline-flex px-2 py-1 text-xs rounded-full ${(() => {
                          if (slot.status === 'empty') return 'bg-blue-100 text-blue-800';
                          if (slot.status === 'pending') return 'bg-yellow-100 text-yellow-800';
                          if (slot.status === 'rejected') return 'bg-red-100 text-red-800';
                          if (slot.status === 'paused') return 'bg-gray-100 text-gray-800';
                          if (slot.status === 'refunded') return 'bg-purple-100 text-purple-800';
                          if (slot.status === 'active') {
                            const now = new Date();
                            const start = slot.startDate ? new Date(slot.startDate) : null;
                            const end = slot.endDate ? new Date(slot.endDate) : null;
                            if (start && now < start) return 'bg-blue-100 text-blue-800';
                            if (end && now > end) return 'bg-gray-100 text-gray-800';
                            return 'bg-green-100 text-green-800';
                          }
                          return 'bg-gray-100 text-gray-800';
                        })()}`}
                      >
                        {(() => {
                          if (slot.status === 'empty') return '입력대기';
                          if (slot.status === 'pending') return '승인대기';
                          if (slot.status === 'rejected') return '거부됨';
                          if (slot.status === 'paused') return '일시정지';
                          if (slot.status === 'refunded') return '환불됨';
                          if (slot.status === 'active') {
                            const now = new Date();
                            const start = slot.startDate ? new Date(slot.startDate) : null;
                            const end = slot.endDate ? new Date(slot.endDate) : null;
                            if (start && now < start) return '대기중';
                            if (end && now > end) return '완료';
                            return '활성';
                          }
                          return slot.status;
                        })()}
                      </span>
                      {/* 커스텀 툴팁 */}
                      {((slot.status === 'refunded' && (slot as any).refund_reason) || 
                        (slot.status === 'rejected' && (slot as any).rejection_reason)) && (
                        <div 
                          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg z-50 pointer-events-none opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-75"
                          style={{ whiteSpace: 'pre-wrap', minWidth: '200px', maxWidth: '400px' }}
                        >
                          {slot.status === 'refunded' && (slot as any).refund_reason && (
                            <>환불 사유:<br />{(slot as any).refund_reason.replace(/\\n/g, '\n')}</>
                          )}
                          {slot.status === 'rejected' && (slot as any).rejection_reason && (
                            <>거절 사유:<br />{(slot as any).rejection_reason.replace(/\\n/g, '\n')}</>
                          )}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                            <div className="border-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  {/* 액션 버튼들 */}
                  <td className="px-3 py-2 text-sm">
                    <div className="flex gap-1">
                      {slot.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleEditSlot(slot)}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                            title="수정"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleApprove(slot.id)}
                            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                            title="승인"
                          >
                            승인
                          </button>
                          <button
                            onClick={() => setRejectingSlot(slot.id)}
                            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                            title="거절"
                          >
                            거절
                          </button>
                        </>
                      )}
                      {(slot.status === 'active' || slot.status === 'paused') && (
                        <>
                          <button
                            onClick={() => handleEditSlot(slot)}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                            title="수정"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => setRefundingSlot(slot.id)}
                            className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                            title="환불"
                          >
                            환불
                          </button>
                          <button
                            onClick={() => handleViewHistory(slot.id)}
                            className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                            title="히스토리"
                          >
                            히스토리
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* 페이징 */}
          {totalPages > 1 && (
            <div className="px-3 py-2 flex items-center justify-between border-t">
              <div className="text-sm text-gray-600">
                전체 {pendingSlots.length}개 중 {startIndex + 1}-{Math.min(endIndex, pendingSlots.length)}개 표시
              </div>
              <div className="flex gap-2">
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={10}>10개씩</option>
                  <option value={50}>50개씩</option>
                  <option value={100}>100개씩</option>
                </select>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded ${
                    currentPage === 1 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  이전
                </button>
                
                {/* 페이지 번호 */}
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // 현재 페이지 주변 2개씩만 표시
                      if (totalPages <= 5) return true;
                      if (page === 1 || page === totalPages) return true;
                      if (Math.abs(page - currentPage) <= 1) return true;
                      return false;
                    })
                    .map((page, index, array) => (
                      <React.Fragment key={page}>
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="px-2 py-1">...</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 rounded ${
                            page === currentPage
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    ))}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded ${
                    currentPage === totalPages 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  다음
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 거부 사유 입력 모달 */}
      {rejectingSlot && (
        <div className={mergedTheme.modalContainerClass}>
          <div className={mergedTheme.modalClass}>
            <h3 className={mergedTheme.modalTitleClass}>슬롯 거부</h3>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="거부 사유를 입력해주세요..."
              className={`${mergedTheme.modalInputClass} h-32 resize-none`}
              autoFocus
            />
            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={() => {
                  setRejectingSlot(null);
                  setRejectionReason('');
                }}
                className={mergedTheme.modalCancelButtonClass}
              >
                취소
              </button>
              <button
                onClick={() => handleReject(rejectingSlot)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                거부하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 환불 사유 입력 모달 */}
      {refundingSlot && (
        <div className={mergedTheme.modalContainerClass}>
          <div className={mergedTheme.modalClass}>
            <h3 className={mergedTheme.modalTitleClass}>슬롯 환불</h3>
            <p className="text-sm text-gray-600 mb-4">
              환불 처리할 슬롯의 사유를 입력해주세요.
            </p>
            <textarea
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="환불 사유를 입력해주세요..."
              className={`${mergedTheme.modalInputClass} h-32 resize-none`}
              autoFocus
            />
            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={() => {
                  setRefundingSlot(null);
                  setRefundReason('');
                }}
                className={mergedTheme.modalCancelButtonClass}
              >
                취소
              </button>
              <button
                onClick={() => handleRefund(refundingSlot)}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                환불처리
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 슬롯 변경 히스토리 모달 */}
      {viewingHistorySlot && (
        <div className={mergedTheme.modalContainerClass}>
          <div className={
            currentTheme === 'luxury' 
              ? "bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-2xl max-w-5xl w-full mx-4 max-h-[85vh] flex flex-col border border-gray-700"
              : currentTheme === 'classic'
              ? "bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[85vh] flex flex-col border border-gray-300"
              : "bg-white rounded-2xl shadow-2xl max-w-5xl w-full mx-4 max-h-[85vh] flex flex-col"
          }>
            {/* 헤더 */}
            <div className={
              currentTheme === 'luxury'
                ? "px-6 py-5 border-b border-gray-700 bg-gradient-to-r from-yellow-600 to-yellow-700"
                : currentTheme === 'classic'
                ? "px-6 py-4 border-b-2 border-gray-200 bg-gray-50"
                : "px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-violet-500 to-indigo-600"
            }>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className={
                    currentTheme === 'luxury'
                      ? "text-xl font-bold text-white flex items-center gap-2"
                      : currentTheme === 'classic'
                      ? "text-xl font-bold text-gray-800"
                      : "text-xl font-bold text-white"
                  }>
                    {currentTheme === 'luxury' && <span className="text-2xl">⚜️</span>}
                    슬롯 변경 히스토리
                  </h3>
                  <p className={
                    currentTheme === 'luxury'
                      ? "text-yellow-100 text-sm mt-1"
                      : currentTheme === 'classic'
                      ? "text-gray-600 text-sm mt-1"
                      : "text-violet-100 text-sm mt-1"
                  }>
                    모든 변경사항이 자동으로 기록됩니다
                  </p>
                </div>
                <button
                  onClick={() => {
                    setViewingHistorySlot(null);
                    setSlotHistory([]);
                  }}
                  className={
                    currentTheme === 'luxury'
                      ? "text-white hover:text-yellow-200 text-2xl font-light"
                      : currentTheme === 'classic'
                      ? "text-gray-600 hover:text-gray-800 text-2xl"
                      : "text-white hover:text-violet-200 text-2xl"
                  }
                >
                  ×
                </button>
              </div>
            </div>
            
            {/* 본문 */}
            <div className={
              currentTheme === 'luxury'
                ? "flex-1 overflow-y-auto p-6 bg-gray-900"
                : currentTheme === 'classic'
                ? "flex-1 overflow-y-auto p-6 bg-white"
                : "flex-1 overflow-y-auto p-6"
            }>
              {slotHistory.length > 0 ? (
                <div className="space-y-4">
                  {slotHistory.map((log: any, index: number) => {
                    const changeTypeConfig: Record<string, { label: string; color: string; icon: string }> = {
                      'field_update': { label: '필드 수정', color: 'blue', icon: '✏️' },
                      'status_change': { label: '상태 변경', color: 'purple', icon: '🔄' },
                      'fill_empty': { label: '슬롯 입력', color: 'green', icon: '✅' },
                      'approve': { label: '승인', color: 'emerald', icon: '✅' },
                      'reject': { label: '거절', color: 'red', icon: '❌' },
                      'refund': { label: '환불', color: 'orange', icon: '💰' }
                    };

                    const config = changeTypeConfig[log.change_type] || { 
                      label: log.change_type, 
                      color: 'gray', 
                      icon: '📌' 
                    };

                    // 필드명 한글 변환
                    const fieldNameMap: Record<string, string> = {
                      'keyword': '키워드',
                      'url': 'URL',
                      'mid': 'MID',
                      'status': '상태',
                      'daily_budget': '일일 예산',
                      'approved_price': '승인 가격'
                    };

                    return (
                      <div key={log.id || index} className={
                        currentTheme === 'luxury'
                          ? `border-l-4 border-yellow-500 bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow`
                          : currentTheme === 'classic'
                          ? `border-l-4 border-${config.color}-500 bg-gray-50 rounded shadow hover:shadow-md transition-shadow`
                          : `border-l-4 border-${config.color}-500 bg-white rounded-xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1`
                      }>
                        <div className="p-4">
                          {/* 헤더 */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{config.icon}</span>
                              <span className={
                                currentTheme === 'luxury'
                                  ? `px-3 py-1 text-xs font-semibold rounded-full bg-yellow-900 text-yellow-200 border border-yellow-700`
                                  : currentTheme === 'classic'
                                  ? `px-2 py-1 text-xs font-semibold rounded bg-${config.color}-100 text-${config.color}-800`
                                  : `px-2 py-1 text-xs font-semibold rounded-full bg-${config.color}-100 text-${config.color}-700 border border-${config.color}-200`
                              }>
                                {config.label}
                              </span>
                              {log.full_name && (
                                <span className={
                                  currentTheme === 'luxury'
                                    ? "text-sm text-gray-400"
                                    : currentTheme === 'classic'
                                    ? "text-sm text-gray-600"
                                    : "text-sm text-gray-600"
                                }>
                                  by <span className="font-medium">{log.full_name}</span>
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <div className={
                                currentTheme === 'luxury'
                                  ? "text-xs text-gray-400"
                                  : "text-xs text-gray-500"
                              }>
                                {new Date(log.created_at).toLocaleDateString('ko-KR', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </div>
                              <div className={
                                currentTheme === 'luxury'
                                  ? "text-xs text-gray-500"
                                  : "text-xs text-gray-400"
                              }>
                                {new Date(log.created_at).toLocaleTimeString('ko-KR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit'
                                })}
                              </div>
                            </div>
                          </div>
                          
                          {/* 변경 내용 */}
                          <div className={
                            currentTheme === 'luxury'
                              ? "bg-gray-900 border border-gray-700 rounded-lg p-3"
                              : currentTheme === 'classic'
                              ? "bg-white border border-gray-200 rounded p-3"
                              : "bg-violet-50 border border-violet-100 rounded-lg p-3"
                          }>
                            {(() => {
                              // 변경 타입별 메시지 생성
                              if (log.change_type === 'field_update' && log.field_key) {
                                const fieldName = fieldNameMap[log.field_key] || log.field_key;
                                
                                // 객체인 경우 해당 필드의 값만 추출
                                let oldVal = log.old_value;
                                let newVal = log.new_value;
                                
                                // form_data의 특정 필드 변경인 경우 처리
                                if (typeof oldVal === 'object' && oldVal !== null && log.field_key in oldVal) {
                                  oldVal = oldVal[log.field_key];
                                }
                                if (typeof newVal === 'object' && newVal !== null && log.field_key in newVal) {
                                  newVal = newVal[log.field_key];
                                }
                                
                                // 여전히 객체인 경우 문자열로 변환
                                if (typeof oldVal === 'object' && oldVal !== null) {
                                  oldVal = JSON.stringify(oldVal);
                                }
                                if (typeof newVal === 'object' && newVal !== null) {
                                  newVal = JSON.stringify(newVal);
                                }
                                
                                oldVal = oldVal || '(비어있음)';
                                newVal = newVal || '(비어있음)';
                                
                                // 특별한 필드 처리
                                if (log.field_key === 'status') {
                                  const statusMap: Record<string, string> = {
                                    'pending': '대기중',
                                    'active': '활성',
                                    'rejected': '거절됨',
                                    'paused': '일시정지',
                                    'expired': '만료됨',
                                    'empty': '빈 슬롯',
                                    'refunded': '환불완료'
                                  };
                                  return (
                                    <div className={
                                      currentTheme === 'luxury'
                                        ? "text-sm text-gray-200"
                                        : "text-sm text-gray-700"
                                    }>
                                      <span className="font-medium">{fieldName}</span>이(가) 
                                      <span className="mx-1 px-2 py-0.5 bg-red-100 text-red-700 rounded">
                                        {statusMap[oldVal] || oldVal}
                                      </span>
                                      에서
                                      <span className="mx-1 px-2 py-0.5 bg-green-100 text-green-700 rounded">
                                        {statusMap[newVal] || newVal}
                                      </span>
                                      (으)로 변경되었습니다.
                                    </div>
                                  );
                                } else if (log.field_key === 'daily_budget' || log.field_key === 'approved_price') {
                                  return (
                                    <div className={
                                      currentTheme === 'luxury'
                                        ? "text-sm text-gray-200"
                                        : "text-sm text-gray-700"
                                    }>
                                      <span className="font-medium">{fieldName}</span>이(가) 
                                      <span className="mx-1 px-2 py-0.5 bg-red-100 text-red-700 rounded font-mono">
                                        ₩{Number(oldVal).toLocaleString()}
                                      </span>
                                      에서
                                      <span className="mx-1 px-2 py-0.5 bg-green-100 text-green-700 rounded font-mono">
                                        ₩{Number(newVal).toLocaleString()}
                                      </span>
                                      (으)로 변경되었습니다.
                                    </div>
                                  );
                                } else {
                                  return (
                                    <div className={
                                      currentTheme === 'luxury'
                                        ? "text-sm text-gray-200"
                                        : "text-sm text-gray-700"
                                    }>
                                      <span className="font-medium">{fieldName}</span>이(가) 
                                      <span className="mx-1 px-2 py-0.5 bg-red-100 text-red-700 rounded">
                                        {String(oldVal)}
                                      </span>
                                      에서
                                      <span className="mx-1 px-2 py-0.5 bg-green-100 text-green-700 rounded">
                                        {String(newVal)}
                                      </span>
                                      (으)로 변경되었습니다.
                                    </div>
                                  );
                                }
                              } else if (log.change_type === 'status_change') {
                                const statusMap: Record<string, string> = {
                                  'pending': '대기중',
                                  'active': '활성',
                                  'rejected': '거절됨',
                                  'paused': '일시정지',
                                  'expired': '만료됨',
                                  'empty': '빈 슬롯',
                                  'refunded': '환불완료'
                                };
                                return (
                                  <div className="text-sm text-gray-700">
                                    슬롯 상태가 
                                    <span className="mx-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                      {statusMap[log.new_value] || log.new_value}
                                    </span>
                                    (으)로 변경되었습니다.
                                    {log.description && (
                                      <div className="mt-1 text-xs text-gray-500">
                                        사유: {log.description}
                                      </div>
                                    )}
                                  </div>
                                );
                              } else if (log.change_type === 'fill_empty') {
                                return (
                                  <div className="text-sm text-gray-700">
                                    빈 슬롯에 새로운 정보가 입력되었습니다.
                                    {log.new_value && typeof log.new_value === 'object' && (
                                      <div className="mt-2 space-y-1">
                                        {log.new_value.keyword && (
                                          <div className="text-xs">
                                            • 키워드: <span className="font-medium">{log.new_value.keyword}</span>
                                          </div>
                                        )}
                                        {log.new_value.url && (
                                          <div className="text-xs">
                                            • URL: <span className="font-medium text-blue-600">{log.new_value.url}</span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              } else if (log.change_type === 'approve') {
                                return (
                                  <div className="text-sm text-gray-700">
                                    슬롯이 <span className="font-medium text-green-600">승인</span>되었습니다.
                                    {log.new_value && (
                                      <div className="mt-1 text-xs text-gray-500">
                                        승인 가격: ₩{Number(log.new_value).toLocaleString()}
                                      </div>
                                    )}
                                  </div>
                                );
                              } else if (log.change_type === 'reject') {
                                return (
                                  <div className="text-sm text-gray-700">
                                    슬롯이 <span className="font-medium text-red-600">거절</span>되었습니다.
                                    {log.description && (
                                      <div className="mt-1 text-xs text-gray-500">
                                        거절 사유: {log.description}
                                      </div>
                                    )}
                                  </div>
                                );
                              } else if (log.change_type === 'refund') {
                                return (
                                  <div className="text-sm text-gray-700">
                                    슬롯이 <span className="font-medium text-purple-600">환불</span> 처리되었습니다.
                                    {log.description && (
                                      <div className="mt-1 text-xs text-gray-500">
                                        환불 사유: {log.description}
                                      </div>
                                    )}
                                  </div>
                                );
                              } else {
                                // 기본 케이스
                                return (
                                  <div className="text-sm text-gray-700">
                                    {log.description || '슬롯 정보가 변경되었습니다.'}
                                  </div>
                                );
                              }
                            })()}
                          </div>
                          
                          {/* 메타 정보 */}
                          {log.ip_address && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <div className="flex items-center gap-4 text-xs text-gray-400">
                                <span>IP: {log.ip_address}</span>
                                {log.user_agent && (
                                  <span title={log.user_agent}>
                                    {log.user_agent.includes('Chrome') && '🌐 Chrome'}
                                    {log.user_agent.includes('Safari') && !log.user_agent.includes('Chrome') && '🧭 Safari'}
                                    {log.user_agent.includes('Firefox') && '🦊 Firefox'}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="text-6xl mb-4">📭</div>
                  <div className="text-xl font-medium text-gray-600 mb-2">변경 히스토리가 없습니다</div>
                  <div className="text-sm text-gray-400">슬롯 정보가 변경되면 자동으로 기록됩니다</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 가격 입력 모달 (캐시 시스템 OFF일 때) */}
      {approvingSlot && !config.useCashSystem && (
        <div className={mergedTheme.modalContainerClass}>
          <div className={mergedTheme.modalClass}>
            <h3 className={mergedTheme.modalTitleClass}>슬롯 가격 설정</h3>
            <p className="text-sm text-gray-600 mb-4">
              승인할 슬롯의 가격을 입력해주세요.
            </p>
            <input
              type="number"
              value={approvedPrice || ''}
              onChange={(e) => setApprovedPrice(Number(e.target.value))}
              placeholder="가격을 입력하세요"
              className={mergedTheme.modalInputClass}
              autoFocus
              onFocus={(e) => e.target.select()}
            />
            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={() => {
                  setApprovingSlot(null);
                  setApprovedPrice(0);
                }}
                className={mergedTheme.modalCancelButtonClass}
              >
                취소
              </button>
              <button
                onClick={handleApproveWithPrice}
                className={mergedTheme.modalButtonClass}
              >
                승인하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 슬롯 수정 모달 */}
      {editingSlot && (
        <div className={mergedTheme.modalContainerClass}>
          <div className={mergedTheme.modalClass}>
            <h3 className={mergedTheme.modalTitleClass}>
              슬롯 수정 - #{editingSlot.customFields.seq || editingSlot.id.substring(0, 8)}
            </h3>
            
            {/* 사용자 정보 (읽기 전용) */}
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <div className="text-sm text-gray-600">
                <div>사용자: {editingSlot.userName || '이름 없음'} ({editingSlot.userEmail})</div>
                <div>생성일: {new Date(editingSlot.createdAt).toLocaleString('ko-KR')}</div>
              </div>
            </div>
            
            {/* 필드 수정 폼 */}
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {fieldConfigs.map(field => (
                <div key={field.field_key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                    {field.is_required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {field.field_type === 'textarea' ? (
                    <textarea
                      value={editFormData[field.field_key] || ''}
                      onChange={(e) => setEditFormData(prev => ({
                        ...prev,
                        [field.field_key]: e.target.value
                      }))}
                      className={mergedTheme.modalInputClass}
                      placeholder={field.placeholder || `${field.label}을(를) 입력하세요`}
                      rows={3}
                    />
                  ) : (
                    <input
                      type={field.field_type === 'number' ? 'number' : 'text'}
                      value={editFormData[field.field_key] || ''}
                      onChange={(e) => setEditFormData(prev => ({
                        ...prev,
                        [field.field_key]: e.target.value
                      }))}
                      className={mergedTheme.modalInputClass}
                      placeholder={field.placeholder || `${field.label}을(를) 입력하세요`}
                    />
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setEditingSlot(null);
                  setEditFormData({});
                }}
                className={mergedTheme.modalCancelButtonClass}
              >
                취소
              </button>
              <button
                onClick={handleSaveEdit}
                className={mergedTheme.modalButtonClass}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 가격 수정 모달 */}
      {editingPriceSlot && (
        <div className={mergedTheme.modalContainerClass}>
          <div className={mergedTheme.modalClass}>
            <h3 className={mergedTheme.modalTitleClass}>슬롯 가격 수정</h3>
            <p className="text-sm text-gray-600 mb-4">
              수정할 가격을 입력해주세요.
            </p>
            <input
              type="number"
              value={editPrice || ''}
              onChange={(e) => setEditPrice(Number(e.target.value))}
              placeholder="가격을 입력하세요"
              className={mergedTheme.modalInputClass}
              autoFocus
              onFocus={(e) => e.target.select()}
            />
            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={() => {
                  setEditingPriceSlot(null);
                  setEditPrice(0);
                }}
                className={mergedTheme.modalCancelButtonClass}
              >
                취소
              </button>
              <button
                onClick={handleUpdatePrice}
                className={mergedTheme.modalButtonClass}
              >
                수정하기
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
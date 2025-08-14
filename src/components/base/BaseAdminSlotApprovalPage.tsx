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
  
  // 슬롯 운영 모드 확인
  const slotOperationMode = getSetting('slotOperationMode', 'business') || 'normal';
  const isPreAllocationMode = slotOperationMode === 'pre-allocation';
  
  const [pendingSlots, setPendingSlots] = useState<UserSlot[]>([]);
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([]);
  const [allSlots, setAllSlots] = useState<UserSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rejectingSlot, setRejectingSlot] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvingSlot, setApprovingSlot] = useState<string | null>(null);
  const [approvedPrice, setApprovedPrice] = useState<number>(0);
  const [editingPriceSlot, setEditingPriceSlot] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
        const configData = Array.isArray(configs) ? configs : (configs.success && configs.data ? configs.data : []);
        
        if (configData && configData.length > 0) {
          // URL 파싱 필드와 시스템 생성 필드 제외
          const visibleFields = configData.filter((field: FieldConfig) => 
            !field.is_system_generated && 
            !['url_product_id', 'url_item_id', 'url_vendor_item_id'].includes(field.field_key)
          );
          console.log('[DEBUG] Loaded field configs:', configData);
          console.log('[DEBUG] Visible fields after filter:', visibleFields);
          setFieldConfigs(visibleFields);
        }
      } catch (error) {
        console.error('필드 설정 로드 실패:', error);
      }
    };

    loadFieldConfigs();
    
    loadAllSlots(statusFilter === 'all' ? undefined : statusFilter).then(slots => {
      let filteredSlots = slots;
      
      // 선슬롯발행 모드에서 날짜 기반 필터링
      if (isPreAllocationMode && statusFilter !== 'all') {
        const now = new Date();
        filteredSlots = slots.filter(slot => {
          if (statusFilter === 'waiting') {
            // 대기중: active 상태이면서 시작일 전
            return slot.status === 'active' && 
                   slot.startDate && 
                   new Date(slot.startDate) > now;
          } else if (statusFilter === 'completed') {
            // 완료: active 상태이면서 종료일 지남
            return slot.status === 'active' && 
                   slot.endDate && 
                   new Date(slot.endDate) < now;
          }
          return true;
        });
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

  // 슬롯 필드 값 가져오기 함수
  const getSlotFieldValue = (slot: UserSlot, fieldKey: string) => {
    // 디버그용 - 특정 슬롯의 데이터 구조 확인
    if (fieldKey === 'keyword') {
      console.log(`[DEBUG] Slot ${slot.id} data structure:`, {
        fieldValues: (slot as any).fieldValues,
        customFields: slot.customFields,
        keyword: (slot as any).keyword,
        url: (slot as any).url,
        mid: (slot as any).mid
      });
    }

    // slot_field_values에서 먼저 찾기
    if ((slot as any).fieldValues) {
      const fieldValue = (slot as any).fieldValues.find((fv: any) => fv.field_key === fieldKey);
      if (fieldValue && fieldValue.value) {
        console.log(`[DEBUG] Found ${fieldKey} in fieldValues:`, fieldValue.value);
        return fieldValue.value;
      }
    }
    
    // customFields에서 찾기
    if (slot.customFields && slot.customFields[fieldKey]) {
      console.log(`[DEBUG] Found ${fieldKey} in customFields:`, slot.customFields[fieldKey]);
      return slot.customFields[fieldKey];
    }
    
    // slots 테이블의 기본 필드에서 찾기
    if (fieldKey === 'url') {
      const value = (slot as any).url || '';
      console.log(`[DEBUG] Found url in basic field:`, value);
      return value;
    }
    if (fieldKey === 'keyword') {
      const value = (slot as any).keyword || '';
      console.log(`[DEBUG] Found keyword in basic field:`, value);
      return value;
    }
    // MID 필드는 제거됨 - URL 파싱 데이터로 대체
    
    console.log(`[DEBUG] No value found for ${fieldKey} in slot ${slot.id}`);
    return '';
  };

  if (isLoading) {
    return <div className={mergedTheme.loadingClass}>로딩 중...</div>;
  }

  // 상태별 통계 (날짜 기반 상태 포함)
  const now = new Date();
  const statusCounts = {
    all: allSlots.length,
    empty: allSlots.filter(s => s.status === 'empty').length,
    pending: allSlots.filter(s => s.status === 'pending').length,
    waiting: allSlots.filter(s => {
      if (s.status !== 'active') return false;
      const start = s.startDate ? new Date(s.startDate) : null;
      return start && now < start;
    }).length,
    active: allSlots.filter(s => {
      if (s.status !== 'active') return false;
      const start = s.startDate ? new Date(s.startDate) : null;
      const end = s.endDate ? new Date(s.endDate) : null;
      return (!start || now >= start) && (!end || now <= end);
    }).length,
    completed: allSlots.filter(s => {
      if (s.status !== 'active') return false;
      const end = s.endDate ? new Date(s.endDate) : null;
      return end && now > end;
    }).length,
    paused: allSlots.filter(s => s.status === 'paused').length,
    rejected: allSlots.filter(s => s.status === 'rejected').length
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      paused: 'bg-gray-100 text-gray-800',
      expired: 'bg-orange-100 text-orange-800',
      empty: 'bg-blue-100 text-blue-800'
    };
    return statusStyles[status] || 'bg-gray-100 text-gray-800';
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
                  (입력대기: {statusCounts.empty}, 승인대기: {statusCounts.pending}, 대기중: {statusCounts.waiting}, 
                  활성: {statusCounts.active}, 완료: {statusCounts.completed}, 일시정지: {statusCounts.paused})
                </span>
              )}
              {!isPreAllocationMode && (
                <span className="ml-2">
                  (대기: {statusCounts.pending}, 활성: {statusCounts.active}, 거부: {statusCounts.rejected})
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
          {isPreAllocationMode && (
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
          )}
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-2 rounded-lg ${
              statusFilter === 'pending' 
                ? 'bg-yellow-600 text-white' 
                : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
            }`}
          >
            대기중 ({statusCounts.pending})
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
          {isPreAllocationMode && (
            <>
              <button
                onClick={() => setStatusFilter('waiting')}
                className={`px-4 py-2 rounded-lg ${
                  statusFilter === 'waiting' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                }`}
              >
                대기중 ({statusCounts.waiting})
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
            </>
          )}
        </div>

        {/* 검색 바 */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="키워드, 광고주명, 이메일, URL로 검색..."
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
                {/* 관리자가 설정한 필드들 */}
                {fieldConfigs.map(field => (
                  <th key={field.field_key} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    {field.label}
                  </th>
                ))}
                {/* URL 파싱 필드들 */}
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">상품ID</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">아이템ID</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">판매자ID</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">시작일</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">종료일</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">금액</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
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
                      <div className="text-xs text-gray-500">{slot.userEmail || 'email@example.com'}</div>
                    </div>
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
                    <span className={`px-2 py-1 text-xs rounded-full ${(() => {
                      if (slot.status === 'empty') return 'bg-blue-100 text-blue-800';
                      if (slot.status === 'pending') return 'bg-yellow-100 text-yellow-800';
                      if (slot.status === 'rejected') return 'bg-red-100 text-red-800';
                      if (slot.status === 'paused') return 'bg-gray-100 text-gray-800';
                      if (slot.status === 'active') {
                        const now = new Date();
                        const start = slot.startDate ? new Date(slot.startDate) : null;
                        const end = slot.endDate ? new Date(slot.endDate) : null;
                        if (start && now < start) return 'bg-blue-100 text-blue-800';
                        if (end && now > end) return 'bg-gray-100 text-gray-800';
                        return 'bg-green-100 text-green-800';
                      }
                      return 'bg-gray-100 text-gray-800';
                    })()}`}>
                      {(() => {
                        if (slot.status === 'empty') return '입력대기';
                        if (slot.status === 'pending') return '승인대기';
                        if (slot.status === 'rejected') return '거부됨';
                        if (slot.status === 'paused') return '일시정지';
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
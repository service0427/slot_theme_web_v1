import React, { useState, useEffect } from 'react';
import { UserSlot } from '@/core/models/UserSlot';
import { ApiSlotService } from '@/adapters/services/ApiSlotService';

interface BaseBulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSlots: UserSlot[];
  onSuccess: () => void;
}

export function BaseBulkEditModal({ isOpen, onClose, selectedSlots, onSuccess }: BaseBulkEditModalProps) {
  const [keyword, setKeyword] = useState('');
  const [url, setUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [urlError, setUrlError] = useState('');
  
  const slotService = new ApiSlotService();

  useEffect(() => {
    if (!isOpen) {
      // 모달이 닫힐 때 폼 초기화
      setKeyword('');
      setUrl('');
      setShowConfirm(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    // URL 에러가 있으면 진행 불가
    if (urlError) {
      alert('URL 형식을 확인해주세요.');
      return;
    }
    
    // 빈 값 필터링
    const updates: any = {};
    if (keyword.trim()) updates.keyword = keyword.trim();
    if (url.trim()) updates.url = url.trim();

    if (Object.keys(updates).length === 0) {
      alert('수정할 내용을 입력해주세요.');
      return;
    }

    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const slotIds = selectedSlots.map(slot => slot.id);
      const result = await slotService.bulkUpdateSlots(slotIds, updates);
      
      if (result.success) {
        alert(result.data?.message || '일괄 수정이 완료되었습니다.');
        onSuccess();
        onClose();
      } else {
        alert(result.error || '일괄 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('Bulk edit error:', error);
      alert('일괄 수정 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 수정될 필드 표시
  const getUpdatedFields = () => {
    const fields = [];
    if (keyword.trim()) fields.push(`키워드: "${keyword}"`);
    if (url.trim()) fields.push(`URL: "${url}"`);
    return fields;
  };

  // 상태를 한글로 변환
  const getStatusKorean = (status: string) => {
    const statusMap: Record<string, string> = {
      'empty': '빈슬롯',
      'active': '활성',
      'pending': '대기중',
      'rejected': '거절',
      'expired': '만료',
      'refunded': '환불'
    };
    return statusMap[status] || status;
  };

  // 상태별 슬롯 개수
  const slotCounts = selectedSlots.reduce((acc, slot) => {
    acc[slot.status] = (acc[slot.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
        {!showConfirm ? (
          <>
            <h2 className="text-xl font-bold mb-4">
              {selectedSlots.length}개 슬롯 일괄 수정
            </h2>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <p className="text-sm font-semibold text-amber-900 mb-2">⚠️ 주의사항</p>
              <ul className="text-sm text-amber-800 space-y-1">
                <li>• 이 작업은 되돌릴 수 없습니다</li>
                <li>• 모든 변경사항은 로그에 기록됩니다</li>
              </ul>
            </div>

            <div className="space-y-4 mb-4">
              <p className="text-sm font-semibold text-gray-700">
                📝 수정할 항목 (빈 칸은 변경 안 함)
              </p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  키워드
                </label>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="새로운 키워드 입력"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => {
                    let value = e.target.value;
                    // &q= 이후 제거
                    if (value.includes('&q=')) {
                      value = value.split('&q=')[0];
                    }
                    setUrl(value);
                    
                    // 쿠팡 URL 검증
                    if (value) {
                      // 쿠팡 도메인 체크 (coupang.com이 포함되어야 함)
                      const isCoupangDomain = /coupang\.com/.test(value);
                      
                      if (isCoupangDomain) {
                        // 정확한 URL 패턴 체크 (www는 선택사항)
                        const isValidCoupangUrl = /https?:\/\/(www\.)?coupang\.com\/vp\/products\/\d+/.test(value);
                        const hasItemId = value.includes('itemId=') && /itemId=\d+/.test(value);
                        const hasVendorItemId = value.includes('vendorItemId=') && /vendorItemId=\d+/.test(value);
                        
                        if (!isValidCoupangUrl) {
                          setUrlError('올바른 쿠팡 URL 형식: https://www.coupang.com/vp/products/{상품ID}');
                        } else if (!hasItemId || !hasVendorItemId) {
                          setUrlError('쿠팡 URL 필수 파라미터: itemId, vendorItemId');
                        } else {
                          setUrlError('');
                        }
                      } else if (value.startsWith('http')) {
                        // 다른 도메인 URL인 경우 (쿠팡이 아닌 경우)
                        setUrlError('');
                      }
                    } else {
                      setUrlError('');
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    urlError ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="새로운 URL 입력"
                />
                {urlError && (
                  <p className="text-xs text-red-500 mt-1">{urlError}</p>
                )}
              </div>

            </div>

            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">
                선택된 슬롯 ({selectedSlots.length}개):
              </p>
              <div className="border border-gray-200 rounded-lg p-2 max-h-36 overflow-y-auto bg-gray-50">
                {selectedSlots.slice(0, 50).map((slot, index) => (
                  <div key={slot.id} className="text-xs py-1 px-2 hover:bg-gray-100">
                    #{slot.slot_number || slot.seq || index + 1} [{getStatusKorean(slot.status)}] {slot.customFields?.keyword || slot.keyword || '키워드 없음'}
                  </div>
                ))}
                {selectedSlots.length > 50 && (
                  <div className="text-xs text-gray-500 py-1 px-2">
                    ... 외 {selectedSlots.length - 50}개
                  </div>
                )}
              </div>
              <div className="mt-2 text-xs text-gray-600">
                {Object.entries(slotCounts).map(([status, count]) => (
                  <span key={status} className="mr-3">
                    {getStatusKorean(status)}: {count}개
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !!urlError}
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? '처리 중...' : '수정하기'}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-4">⚠️ 최종 확인</h2>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-3">
                {selectedSlots.length}개 슬롯을 다음과 같이 수정합니다:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-800">
                {getUpdatedFields().map((field, index) => (
                  <li key={index}>{field}</li>
                ))}
              </ul>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm font-semibold text-red-900">
                이 작업은 되돌릴 수 없습니다.
              </p>
              <p className="text-sm text-red-800 mt-1">
                계속하시겠습니까?
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? '처리 중...' : '확인'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
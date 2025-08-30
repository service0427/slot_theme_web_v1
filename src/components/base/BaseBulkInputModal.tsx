import React, { useState, useEffect, useRef } from 'react';
import { UserSlot } from '@/core/models/UserSlot';
import { useSlotContext } from '@/adapters/react/hooks/useSlotContext';
import { useConfig } from '@/contexts/ConfigContext';

interface BaseBulkInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSlots: UserSlot[];
  onSuccess: () => void;
}

interface SlotFormData {
  [slotId: string]: {
    keyword?: string;
    url?: string;
  };
}

export function BaseBulkInputModal({ isOpen, onClose, selectedSlots, onSuccess }: BaseBulkInputModalProps) {
  const [formData, setFormData] = useState<SlotFormData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentFocus, setCurrentFocus] = useState<{ slotId: string; field: string } | null>(null);
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const { config } = useConfig();
  
  // useSlotContext의 함수들 사용
  const { fillEmptySlot, updateSlot } = useSlotContext();

  // 모달이 열릴 때 폼 초기화
  useEffect(() => {
    if (isOpen) {
      console.log('[BulkInputModal] Selected slots:', selectedSlots);
      
      // 첫 번째 슬롯의 전체 구조 확인
      if (selectedSlots.length > 0) {
        console.log('[BulkInputModal] First slot full structure:', selectedSlots[0]);
      }
      
      const initialData: SlotFormData = {};
      selectedSlots.forEach(slot => {
        // customFields 또는 직접 필드 확인
        const keyword = slot.customFields?.keyword || slot.customFields?.keywords || 
                       (slot as any).keyword || (slot as any).keywords || '';
        const url = slot.customFields?.url || slot.customFields?.landingUrl || 
                   (slot as any).url || (slot as any).landingUrl || '';
        
        console.log(`[BulkInputModal] Slot ${slot.id}:`);
        console.log('  - customFields:', slot.customFields);
        console.log(`  - extracted keyword: ${keyword}, url: ${url}`);
        
        initialData[slot.id] = {
          keyword: keyword,
          url: url
        };
      });
      setFormData(initialData);
      
      // 첫 번째 슬롯의 키워드 필드에 포커스
      if (selectedSlots.length > 0) {
        setTimeout(() => {
          const firstInputKey = `${selectedSlots[0].id}-keyword`;
          inputRefs.current[firstInputKey]?.focus();
        }, 100);
      }
    }
  }, [isOpen, selectedSlots]);

  if (!isOpen) return null;

  // 폼 데이터 변경 핸들러
  const handleInputChange = (slotId: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [slotId]: {
        ...prev[slotId],
        [field]: value
      }
    }));
  };

  // 키보드 네비게이션 핸들러
  const handleKeyDown = (e: React.KeyboardEvent, slotId: string, field: string, index: number) => {
    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault();
      
      let nextInputKey = '';
      
      if (field === 'keyword') {
        // 같은 행의 URL로 이동
        nextInputKey = `${slotId}-url`;
      } else if (field === 'url') {
        // 다음 행의 키워드로 이동
        if (index < selectedSlots.length - 1) {
          nextInputKey = `${selectedSlots[index + 1].id}-keyword`;
        } else {
          // 마지막 행이면 첫 번째 행으로
          nextInputKey = `${selectedSlots[0].id}-keyword`;
        }
      }
      
      if (nextInputKey && inputRefs.current[nextInputKey]) {
        inputRefs.current[nextInputKey]?.focus();
      }
    }
  };

  // 저장 핸들러
  const handleSubmit = async () => {
    // 입력된 데이터가 있는 슬롯만 필터링
    const slotsToUpdate = selectedSlots.filter(slot => {
      const data = formData[slot.id];
      return data && (data.keyword?.trim() || data.url?.trim());
    });

    if (slotsToUpdate.length === 0) {
      alert('입력된 데이터가 없습니다.');
      return;
    }

    // 필수 필드 체크 (키워드만 필수)
    const invalidSlots = slotsToUpdate.filter(slot => {
      const data = formData[slot.id];
      return !data.keyword?.trim();
    });

    if (invalidSlots.length > 0) {
      alert(`키워드는 필수 입력 항목입니다. (${invalidSlots.length}개 슬롯)`);
      return;
    }

    // URL 검증
    let hasUrlError = false;
    for (const slot of slotsToUpdate) {
      const data = formData[slot.id];
      if (data.url && data.url.trim()) {
        const url = data.url.trim();
        // 쿠팡 URL 검증
        if (url.includes('coupang.com')) {
          const isValidCoupangUrl = /https?:\/\/(www\.)?coupang\.com\/vp\/products\/\d+/.test(url);
          const hasItemId = url.includes('itemId=') && /itemId=\d+/.test(url);
          const hasVendorItemId = url.includes('vendorItemId=') && /vendorItemId=\d+/.test(url);
          
          if (!isValidCoupangUrl || !hasItemId || !hasVendorItemId) {
            hasUrlError = true;
            alert(`슬롯 #${slot.slot_number}: 쿠팡 URL 형식이 올바르지 않습니다.`);
            return;
          }
        }
      }
    }

    if (!confirm(`${slotsToUpdate.length}개 슬롯을 저장하시겠습니까?`)) {
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    try {
      for (const slot of slotsToUpdate) {
        const data = formData[slot.id];
        const customFields: Record<string, string> = {};
        
        // 키워드와 URL 모두 customFields에 저장
        if (data.keyword?.trim()) {
          customFields.keyword = data.keyword.trim();
          customFields.keywords = data.keyword.trim(); // 두 필드 모두 업데이트
        }
        if (data.url?.trim()) {
          customFields.url = data.url.trim();
          customFields.landingUrl = data.url.trim(); // 두 필드 모두 업데이트
        }

        try {
          let success = false;
          console.log(`[BulkInputModal] Slot ${slot.id} status: ${slot.status}, keyword: "${slot.customFields?.keyword}"`);
          
          if (slot.status === 'empty') {
            // 빈 슬롯은 fillEmptySlot 사용
            console.log(`[BulkInputModal] Using fillEmptySlot for empty slot ${slot.id} with:`, customFields);
            success = await fillEmptySlot(slot.id, { customFields });
          } else {
            // active나 다른 상태의 슬롯은 updateSlot 사용
            console.log(`[BulkInputModal] Using updateSlot for ${slot.status} slot ${slot.id} with:`, customFields);
            success = await updateSlot(slot.id, { customFields });
          }

          if (success) {
            successCount++;
            console.log(`[BulkInputModal] Success for slot ${slot.id}`);
          } else {
            failCount++;
            console.error(`[BulkInputModal] Failed for slot ${slot.id}`);
            errors.push(`슬롯 #${slot.slot_number || slot.customFields?.seq || (slot as any).seq}: 저장 실패`);
          }
        } catch (error) {
          failCount++;
          console.error(`[BulkInputModal] Exception for slot ${slot.id}:`, error);
          errors.push(`슬롯 #${slot.slot_number || slot.customFields?.seq || (slot as any).seq}: 저장 실패 - ${error}`);
        }
      }

      // 결과 메시지
      let message = '';
      if (successCount > 0) {
        message += `${successCount}개 슬롯이 성공적으로 저장되었습니다.`;
      }
      if (failCount > 0) {
        message += `\n${failCount}개 슬롯 저장에 실패했습니다.`;
        if (errors.length > 0) {
          message += '\n\n실패 원인:\n' + errors.slice(0, 5).join('\n');
          if (errors.length > 5) {
            message += `\n... 외 ${errors.length - 5}개`;
          }
        }
      }

      alert(message);

      if (successCount > 0) {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Bulk input error:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 상태를 한글로 변환
  const getStatusKorean = (status: string) => {
    const statusMap: Record<string, string> = {
      'empty': '빈슬롯',
      'active': '활성',
      'pending': '대기중',
      'rejected': '거절',
      'expired': '만료',
      'refunded': '환불',
      'paused': '일시정지'
    };
    return statusMap[status] || status;
  };

  // 붙여넣기 핸들러
  const handlePaste = (e: React.ClipboardEvent, slotId: string, field: string, index: number) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const lines = pastedText.split(/[\n\t]/);
    
    if (lines.length === 1) {
      // 단일 값 붙여넣기
      handleInputChange(slotId, field, lines[0]);
    } else {
      // 여러 값 붙여넣기
      let currentIndex = index;
      let currentField = field;
      
      lines.forEach((line, lineIndex) => {
        if (currentIndex < selectedSlots.length) {
          const currentSlotId = selectedSlots[currentIndex].id;
          handleInputChange(currentSlotId, currentField, line);
          
          // 다음 위치 계산
          if (currentField === 'keyword') {
            currentField = 'url';
          } else {
            currentField = 'keyword';
            currentIndex++;
          }
        }
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[80vh] flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">다중 슬롯 입력</h2>
          <p className="text-sm text-gray-600 mt-1">
            {selectedSlots.length}개 슬롯에 개별 정보를 입력합니다. Tab 또는 Enter로 다음 칸으로 이동할 수 있습니다.
          </p>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">번호</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">상태</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                  키워드 <span className="text-red-500">*</span>
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">URL</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">현재 순위</th>
              </tr>
            </thead>
            <tbody>
              {selectedSlots.map((slot, index) => (
                <tr key={slot.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm font-medium">
                    #{slot.slot_number || slot.customFields?.seq || (slot as any).seq || index + 1}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      slot.status === 'empty' ? 'bg-orange-100 text-orange-800' :
                      slot.status === 'active' ? 'bg-green-100 text-green-800' :
                      slot.status === 'paused' ? 'bg-gray-100 text-gray-800' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {getStatusKorean(slot.status)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      ref={el => inputRefs.current[`${slot.id}-keyword`] = el}
                      type="text"
                      value={formData[slot.id]?.keyword || ''}
                      onChange={(e) => handleInputChange(slot.id, 'keyword', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, slot.id, 'keyword', index)}
                      onPaste={(e) => handlePaste(e, slot.id, 'keyword', index)}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="키워드 입력"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      ref={el => inputRefs.current[`${slot.id}-url`] = el}
                      type="text"
                      value={formData[slot.id]?.url || ''}
                      onChange={(e) => handleInputChange(slot.id, 'url', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, slot.id, 'url', index)}
                      onPaste={(e) => handlePaste(e, slot.id, 'url', index)}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="URL 입력 (선택)"
                    />
                  </td>
                  <td className="px-3 py-2 text-sm text-center">
                    {(slot as any).rank > 0 ? (
                      <span className="font-medium">{(slot as any).rank}위</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {selectedSlots.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              선택된 슬롯이 없습니다.
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <p>💡 Tip: 엑셀에서 복사한 데이터를 붙여넣기(Ctrl+V)할 수 있습니다.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
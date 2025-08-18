import React, { useState, useEffect, useRef } from 'react';
import { FieldConfig } from '@/adapters/services/ApiFieldConfigService';
import { useSystemSettings } from '@/contexts/SystemSettingsContext';

interface CombinedSlotRowProps {
  slot: any;
  slotIndex: number;
  fieldConfigs: FieldConfig[];
  onSave?: (data: { customFields: Record<string, string> }) => void;  // 빈 슬롯용
  onEdit?: () => void;  // 사용 중 슬롯용
  onPause?: () => void;
  onResume?: () => void;
  onBulkPaste?: (slotIndex: number, fieldKey: string, values: string[]) => void;
  isSelected?: boolean;
  onSelectionChange?: (slotId: string, checked: boolean) => void;
}

function CombinedSlotRowComponent({ 
  slot, 
  slotIndex, 
  fieldConfigs, 
  onSave, 
  onEdit,
  onPause,
  onResume,
  onBulkPaste, 
  isSelected, 
  onSelectionChange 
}: CombinedSlotRowProps) {
  const { getSetting } = useSystemSettings();
  const slotOperationMode = getSetting('slotOperationMode', 'business') || 'normal';
  const isPreAllocationMode = slotOperationMode === 'pre-allocation';
  
  const isEmptySlot = slot.status === 'empty';
  
  // 날짜 기반 상태 확인
  const now = new Date();
  const start = slot.startDate ? new Date(slot.startDate) : null;
  const end = slot.endDate ? new Date(slot.endDate) : null;
  const isWaiting = slot.status === 'active' && start && now < start;
  const isCompleted = slot.status === 'active' && end && now > end;
  
  // 빈 슬롯만 inline 편집 가능
  const canInlineEdit = isEmptySlot;
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  
  // formData 초기화 - 부모에서 전달받은 데이터 우선 사용
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    // 부모에서 전달받은 formData가 있으면 사용
    if (slot.formData && Object.keys(slot.formData).length > 0) {
      // console.log('[CombinedSlotRow] 부모 formData 사용:', { 
      //   slotId: slot.id, 
      //   formData: slot.formData 
      // });
      return slot.formData;
    }
    
    // 초기값 설정
    const initialData: Record<string, string> = {};
    
    // 모든 슬롯에 대해 데이터 초기화
    if (fieldConfigs.length > 0) {
      fieldConfigs.forEach(field => {
        let value = '';
        
        // customFields 우선 확인
        if (slot.customFields && slot.customFields[field.field_key] !== undefined) {
          value = slot.customFields[field.field_key];
        } 
        // fieldValues 확인
        else if (slot.fieldValues && slot.fieldValues.length > 0) {
          const fieldValue = slot.fieldValues.find((fv: any) => fv.field_key === field.field_key);
          if (fieldValue) {
            value = fieldValue.value;
          }
        }
        // 기본 필드 확인
        else if (field.field_key === 'keyword' && slot.keyword) {
          value = slot.keyword;
        } else if ((field.field_key === 'url' || field.field_key === 'landingUrl') && slot.url) {
          value = slot.url;
        } else if (field.field_key === 'mid' && slot.mid) {
          value = slot.mid;
        }
        
        initialData[field.field_key] = value;
      });
    } else {
      // fieldConfigs가 없을 때도 기본 필드는 설정
      if (slot.keyword) initialData['keyword'] = slot.keyword;
      if (slot.url) initialData['url'] = slot.url;
      if (slot.mid) initialData['mid'] = slot.mid;
      
      // customFields의 모든 값도 포함
      if (slot.customFields) {
        Object.assign(initialData, slot.customFields);
      }
      
      // fieldValues의 모든 값도 포함
      if (slot.fieldValues && Array.isArray(slot.fieldValues)) {
        slot.fieldValues.forEach((fv: any) => {
          if (fv.field_key && fv.value) {
            initialData[fv.field_key] = fv.value;
          }
        });
      }
    }
    
    return initialData;
  });
  
  // 부모 formData가 변경되면 동기화
  useEffect(() => {
    if (slot.formData && Object.keys(slot.formData).length > 0) {
      setFormData(slot.formData);
    }
  }, [slot.formData]);

  // slot.id가 변경될 때만 초기화
  useEffect(() => {
    if (!slot.formData || Object.keys(slot.formData).length === 0) {
      const newData: Record<string, string> = {};
      
      fieldConfigs.forEach(field => {
        let value = '';
        
        if (slot.customFields && slot.customFields[field.field_key] !== undefined) {
          value = slot.customFields[field.field_key];
        } 
        else if (slot.fieldValues && slot.fieldValues.length > 0) {
          const fieldValue = slot.fieldValues.find((fv: any) => fv.field_key === field.field_key);
          if (fieldValue) {
            value = fieldValue.value;
          }
        }
        else if (field.field_key === 'keyword' && slot.keyword) {
          value = slot.keyword;
        } else if ((field.field_key === 'url' || field.field_key === 'landingUrl') && slot.url) {
          value = slot.url;
        } else if (field.field_key === 'mid' && slot.mid) {
          value = slot.mid;
        }
        
        newData[field.field_key] = value;
      });
      
      setFormData(newData);
    }
  }, [slot.id]);

  const handleFieldChange = (fieldKey: string, value: string) => {
    const newData = {
      ...formData,
      [fieldKey]: value
    };
    
    // console.log('[CombinedSlotRow] 필드 변경:', { slotId: slot.id, fieldKey, value, newData });
    
    setFormData(newData);
    
    // 부모 컴포넌트에 변경사항 전달 (렌더링 후에)
    if (slot.onFormDataChange) {
      setTimeout(() => {
        slot.onFormDataChange(slot.id, newData);
      }, 0);
    }
    
    if (errors[fieldKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldKey];
        return newErrors;
      });
    }
  };

  const handlePaste = (e: React.ClipboardEvent, fieldKey: string) => {
    if (!canInlineEdit) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const pasteData = e.clipboardData.getData('text/plain');
    if (!pasteData) return;
    
    // console.log('[붙여넣기] 데이터:', pasteData, '필드:', fieldKey);
    
    // 여러 줄의 데이터가 있는지 먼저 확인
    const lines = pasteData.split(/[\r\n]+/).filter(line => line.trim().length > 0);
    
    // 여러 줄이 있고 각 줄에 탭이 포함된 경우 (엑셀에서 여러 행과 열 복사)
    if (lines.length > 0 && lines[0].includes('\t')) {
      
      const currentFieldIndex = fieldConfigs.findIndex(f => f.field_key === fieldKey);
      
      if (currentFieldIndex !== -1 && onBulkPaste) {
        const allRowsData: Array<{[key: string]: string}> = [];
        
        // 모든 줄을 처리 (첫 번째 줄 포함)
        for (let i = 0; i < lines.length; i++) {
          const lineValues = lines[i].split('\t');
          const rowData: {[key: string]: string} = {};
          
          lineValues.forEach((value, colIndex) => {
            const targetFieldIndex = currentFieldIndex + colIndex;
            if (targetFieldIndex < fieldConfigs.length) {
              const targetField = fieldConfigs[targetFieldIndex];
              const cleanValue = value.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
              if (cleanValue) {
                rowData[targetField.field_key] = cleanValue;
              }
            }
          });
          
          if (Object.keys(rowData).length > 0) {
            allRowsData.push(rowData);
          }
        }
        
        
        // DOM에서 현재 입력 필드부터 시작해서 다음 빈 슬롯들에 데이터 입력
        if (allRowsData.length > 0) {
          
          // 현재 필드에 첫 번째 데이터 적용
          const firstRowData = allRowsData[0];
          setFormData(prev => ({
            ...prev,
            ...firstRowData
          }));
          
          // 나머지 데이터가 있으면 부모 컴포넌트의 벌크 페이스트 핸들러로 처리
          if (allRowsData.length > 1 && onBulkPaste) {
            // 각 행의 키워드만 먼저 설정하고, URL은 별도로 처리
            const remainingKeywords = allRowsData.slice(1).map(rowData => rowData.keyword).filter(Boolean);
            const remainingUrls = allRowsData.slice(1).map(rowData => rowData.url).filter(Boolean);
            
            if (remainingKeywords.length > 0) {
              onBulkPaste(slotIndex + 1, 'keyword', remainingKeywords);
            }
            if (remainingUrls.length > 0) {
              onBulkPaste(slotIndex + 1, 'url', remainingUrls);
            }
          }
        }
      }
    }
    // 단일 열 여러 줄 (탭 없이 줄바꿈만)
    else if (lines.length > 1) {
      
      // 첫 번째 값은 현재 슬롯에
      const cleanValue = lines[0].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
      if (cleanValue) {
        setFormData(prev => ({
          ...prev,
          [fieldKey]: cleanValue
        }));
      }
      
      // 나머지 값들은 부모 컴포넌트로 전달
      if (lines.length > 1 && onBulkPaste) {
        const remainingValues = lines.slice(1).map(line => 
          line.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '')
        ).filter(v => v);
        
        if (remainingValues.length > 0) {
          onBulkPaste(slotIndex + 1, fieldKey, remainingValues);
        }
      }
    }
    // 단일 값
    else {
      const cleanValue = pasteData.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
      if (cleanValue) {
        setFormData(prev => ({
          ...prev,
          [fieldKey]: cleanValue
        }));
      }
    }
  };

  // DOM 조작 함수들 제거 - 부모 컴포넌트에서 상태 관리

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    fieldConfigs.forEach(field => {
      if (field.is_required && !formData[field.field_key]?.trim()) {
        newErrors[field.field_key] = '필수 입력';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm() || !onSave) return;
    
    setIsSaving(true);
    try {
      await onSave({ customFields: formData });
    } catch (error) {
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 슬롯 필드 값 가져오기 (사용 중 슬롯용)
  const getFieldValue = (fieldKey: string) => {
    // product_name은 slots 테이블에서 직접 가져오기
    if (fieldKey === 'product_name') {
      return slot.product_name || '';
    }
    
    // slot_field_values에서 먼저 찾기
    if (slot.fieldValues) {
      const fieldValue = slot.fieldValues.find((fv: any) => fv.field_key === fieldKey);
      if (fieldValue) return fieldValue.value;
    }
    // customFields에서 찾기
    if (slot.customFields && slot.customFields[fieldKey]) {
      return slot.customFields[fieldKey];
    }
    // slots 테이블의 기본 필드에서 찾기
    if (fieldKey === 'url') return slot.url || '';
    if (fieldKey === 'keyword') return slot.keyword || '';
    if (fieldKey === 'mid') return slot.mid || '';
    return '';
  };

  return (
    <tr className={`hover:bg-gray-50 ${isEmptySlot ? 'bg-blue-50/30' : ''}`}>
      
      {/* 번호 */}
      <td className="px-1 py-4 border-r font-medium text-center text-sm">
        #{slot.slot_number || slot.seq || slotIndex + 1}
      </td>
      
      {/* 썸네일 */}
      <td className="px-3 py-4 text-center border-r">
        {slot.thumbnail ? (
          <img 
            src={slot.thumbnail} 
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
      {fieldConfigs.map((field, fieldIndex) => {
        // URL 파싱 필드들은 읽기 전용
        const isReadOnlyField = ['url_product_id', 'url_item_id', 'url_vendor_item_id'].includes(field.field_key);
        const isUrlField = field.field_key === 'url' || field.field_key === 'landingUrl';
        
        return (
          <td key={field.field_key} className={`${isReadOnlyField ? 'px-1 py-2' : 'px-3 py-2'} border-r`}>
            {canInlineEdit && !isReadOnlyField ? (
              <div className="relative">
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={formData[field.field_key] || ''}
                    onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
                    onPaste={(e) => handlePaste(e, field.field_key)}
                    placeholder={field.placeholder || `${field.label} 입력`}
                    className={`flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      errors[field.field_key] ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                    title={`${field.label} - ${canInlineEdit ? 'Ctrl+V로 Excel 데이터를 붙여넣을 수 있습니다' : '읽기 전용'}`}
                  />
                  {/* URL 필드인 경우 모니터 아이콘 추가 */}
                  {isUrlField && (formData[field.field_key] || '').trim() && (
                    <button
                      onClick={() => {
                        const url = formData[field.field_key] || '';
                        if (url.trim()) {
                          const fullUrl = url.startsWith('http') ? url : `https://${url}`;
                          const windowId = 'slot-preview-popup';
                          
                          // 기존 창이 있으면 닫고 새로 열기
                          if (window[windowId] && !window[windowId].closed) {
                            window[windowId].close();
                          }
                          
                          window[windowId] = window.open(fullUrl, windowId, 'width=700,height=800');
                        }
                      }}
                      className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                      title={`${formData[field.field_key]} 새 창에서 열기`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </button>
                  )}
                </div>
                {errors[field.field_key] && (
                  <div className="absolute top-full left-0 mt-1 text-xs text-red-600 whitespace-nowrap z-10">
                    {errors[field.field_key]}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <div className={`flex-1 text-gray-900 truncate ${isReadOnlyField ? 'text-xs' : 'text-sm'}`} title={getFieldValue(field.field_key) || ''}>
                  {getFieldValue(field.field_key) || '-'}
                </div>
                {/* URL 필드인 경우 모니터 아이콘 추가 (읽기 전용 상태에서도) */}
                {isUrlField && getFieldValue(field.field_key)?.trim() && (
                  <button
                    onClick={() => {
                      const url = getFieldValue(field.field_key) || '';
                      if (url.trim()) {
                        const fullUrl = url.startsWith('http') ? url : `https://${url}`;
                        const windowId = 'slot-preview-popup';
                        
                        // 기존 창이 있으면 닫고 새로 열기
                        if (window[windowId] && !window[windowId].closed) {
                          window[windowId].close();
                        }
                        
                        window[windowId] = window.open(fullUrl, windowId, 'width=700,height=800');
                      }
                    }}
                    className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                    title={`${getFieldValue(field.field_key)} 새 창에서 열기`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </td>
        );
      })}
      
      {/* 상품명 (읽기 전용) */}
      <td className="px-3 py-4 border-r">
        <div className="text-sm text-gray-900">
          {slot.product_name || '-'}
        </div>
      </td>
      
      {/* 시스템 필드들 */}
      <td className="px-3 py-4 text-center border-r text-sm">
        {(() => {
          console.log('Slot rank data:', { 
            id: slot.id, 
            rank: slot.rank, 
            yesterday_rank: slot.yesterday_rank,
            is_processing: slot.is_processing 
          });
          return null;
        })()}
        {slot.is_processing ? (
          <span className="text-blue-600 font-medium">진행중</span>
        ) : slot.rank && slot.rank > 0 ? (
          <div className="flex items-center justify-center gap-1">
            <span className="font-semibold text-gray-900">{slot.rank}</span>
            {slot.yesterday_rank && (
              <span className={`text-xs ${
                slot.yesterday_rank > slot.rank 
                  ? 'text-green-600' 
                  : slot.yesterday_rank < slot.rank 
                    ? 'text-red-600' 
                    : 'text-gray-500'
              }`}>
                {slot.yesterday_rank > slot.rank 
                  ? `(▲${slot.yesterday_rank - slot.rank})` 
                  : slot.yesterday_rank < slot.rank 
                    ? `(▼${slot.rank - slot.yesterday_rank})` 
                    : '(-)'}
              </span>
            )}
          </div>
        ) : (
          <span className="text-gray-400">순위없음</span>
        )}
      </td>
      <td className="px-3 py-4 text-center border-r text-gray-400 text-sm">
        {slot.startDate ? new Date(slot.startDate).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).replace(/\./g, '-').replace(/-$/, '') : '-'}
      </td>
      <td className="px-3 py-4 text-center border-r text-sm">
        {slot.endDate ? (() => {
          const now = new Date();
          const end = new Date(slot.endDate);
          const timeLeft = end.getTime() - now.getTime();
          const daysLeft = timeLeft / (1000 * 60 * 60 * 24);
          
          let colorClass = 'text-gray-400'; // 기본 색상
          
          if (now > end) {
            colorClass = 'text-green-600 font-medium'; // 완료 - 녹색
          } else if (daysLeft <= 3) {
            colorClass = 'text-red-600 font-semibold'; // 3일 미만 - 빨간색
          } else if (daysLeft <= 7) {
            colorClass = 'text-orange-500 font-medium'; // 1주일 미만 - 주황색
          }
          
          return (
            <span className={colorClass}>
              {end.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
              }).replace(/\./g, '-').replace(/-$/, '')}
            </span>
          );
        })() : <span className="text-gray-400">-</span>}
      </td>
      
      {/* 상태 컬럼 - 주석처리 
      <td className="px-3 py-4 text-center">
        <div className="flex flex-col items-center gap-2">
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            (() => {
              if (isEmptySlot) return 'bg-orange-100 text-orange-800';
              if (slot.status === 'pending') return 'bg-yellow-100 text-yellow-800';
              if (slot.status === 'paused') return 'bg-gray-100 text-gray-800';
              if (slot.status === 'rejected') return 'bg-red-100 text-red-800';
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
            })()
          }`}>
            {(() => {
              if (isEmptySlot) return '입력 대기';
              if (slot.status === 'pending') return '승인 대기';
              if (slot.status === 'paused') return '일시정지';
              if (slot.status === 'rejected') return '거절됨';
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
          
          {(() => {
            const now = new Date();
            const start = slot.startDate ? new Date(slot.startDate) : null;
            const end = slot.endDate ? new Date(slot.endDate) : null;
            const isWaiting = slot.status === 'active' && start && now < start;
            const isActive = slot.status === 'active' && (!start || now >= start) && (!end || now <= end);
            const isPaused = slot.status === 'paused';
            
            if (isWaiting || isActive || isPaused) {
              return (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">활성</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={isPaused}
                      onChange={isPaused ? onResume : onPause}
                    />
                    <div className={`w-6 h-3 rounded-full peer peer-focus:outline-none peer-focus:ring-1 peer-focus:ring-blue-300 ${
                      isPaused ? 'bg-orange-500' : 'bg-green-500'
                    } peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-2.5 after:w-2.5 after:transition-all`}></div>
                  </label>
                  <span className="text-xs text-gray-500">정지</span>
                </div>
              );
            }
            return null;
          })()}
        </div>
      </td>
      */}
      
      {/* 액션 컬럼 */}
      <td className="px-3 py-4 text-center">
        {canInlineEdit && onSave ? (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              isSaving 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isSaving ? '저장 중...' : '저장'}
          </button>
        ) : onEdit ? (
          <button
            onClick={onEdit}
            className="px-3 py-1 text-xs font-medium bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            수정
          </button>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      
    </tr>
  );
}

export const CombinedSlotRow = CombinedSlotRowComponent;
import { useState, useEffect } from 'react';
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

export function CombinedSlotRow({ 
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
  
  // 선슬롯발행 모드에서는 active 상태에서도 수정 가능
  const canEdit = isEmptySlot || (isPreAllocationMode && (slot.status === 'active' || slot.status === 'pending'));
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<Record<string, string>>({});

  // formData 초기화 - fieldConfigs와 slot 데이터가 변경될 때
  useEffect(() => {
    // slot.formData가 있으면 우선 사용
    if (slot.formData) {
      setFormData(slot.formData);
      return;
    }
    
    const initialData: Record<string, string> = {};
    
    // 빈 슬롯이 아닌 경우, 실제 슬롯 데이터로 초기화
    if (!isEmptySlot && fieldConfigs.length > 0) {
      
      fieldConfigs.forEach(field => {
        // customFields에서 먼저 찾기
        if (slot.customFields && slot.customFields[field.field_key]) {
          initialData[field.field_key] = slot.customFields[field.field_key];
        }
        // fieldValues에서 찾기
        else if (slot.fieldValues) {
          const fieldValue = slot.fieldValues.find((fv: any) => fv.field_key === field.field_key);
          if (fieldValue) {
            initialData[field.field_key] = fieldValue.value;
          }
        }
        // slots 테이블의 기본 필드
        else if (field.field_key === 'keyword' && slot.keyword) {
          initialData[field.field_key] = slot.keyword;
        }
        else if ((field.field_key === 'url' || field.field_key === 'landingUrl') && slot.url) {
          initialData[field.field_key] = slot.url;
        }
        else if (field.field_key === 'mid' && slot.mid) {
          initialData[field.field_key] = slot.mid;
        }
        else {
          initialData[field.field_key] = '';
        }
      });
      
      setFormData(initialData);
    } else if (isEmptySlot && fieldConfigs.length > 0) {
      // 빈 슬롯인 경우 빈 값으로 초기화
      fieldConfigs.forEach(field => {
        initialData[field.field_key] = '';
      });
      setFormData(initialData);
    }
  }, [slot.formData, slot.customFields, slot.fieldValues, slot.keyword, slot.url, slot.mid, fieldConfigs, isEmptySlot]);

  const handleFieldChange = (fieldKey: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldKey]: value
    }));
    
    if (errors[fieldKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldKey];
        return newErrors;
      });
    }
  };

  const handlePaste = (e: React.ClipboardEvent, fieldKey: string) => {
    if (!canEdit) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const pasteData = e.clipboardData.getData('text/plain');
    if (!pasteData) return;
    
    
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
          const newFormData = { ...formData };
          Object.entries(firstRowData).forEach(([key, value]) => {
            newFormData[key] = value;
          });
          setFormData(newFormData);
          
          // 나머지 데이터가 있으면 다음 빈 슬롯들에 적용
          if (allRowsData.length > 1) {
            applyDataToNextEmptySlots(allRowsData.slice(1), fieldKey);
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
      
      // 나머지 값들은 DOM을 통해 다음 빈 슬롯들에 적용
      if (lines.length > 1) {
        const remainingValues = lines.slice(1).map(line => 
          line.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '')
        ).filter(v => v);
        
        if (remainingValues.length > 0) {
          applySingleFieldToNextEmptySlots(remainingValues, fieldKey);
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

  // DOM을 통해 다음 빈 슬롯들에 데이터 적용
  const applyDataToNextEmptySlots = (remainingData: Array<{[key: string]: string}>, currentFieldKey: string) => {
    try {
      // 현재 input 요소를 찾기
      const currentInput = document.activeElement as HTMLInputElement;
      if (!currentInput || currentInput.tagName !== 'INPUT') {
        return;
      }
      
      // 현재 행(tr) 찾기
      const currentRow = currentInput.closest('tr');
      if (!currentRow) {
        return;
      }
      
      // 다음 빈 슬롯 행들 찾기
      let nextRow = currentRow.nextElementSibling as HTMLTableRowElement;
      let dataIndex = 0;
      
      while (nextRow && dataIndex < remainingData.length) {
        // 빈 슬롯인지 확인 (저장 버튼이 있거나 입력 필드가 있는지 체크)
        const saveButton = nextRow.querySelector('button') as HTMLButtonElement;
        const hasInputFields = nextRow.querySelectorAll('input[type="text"]').length > 0;
        const isEmptySlot = saveButton && (saveButton.textContent?.includes('저장') || saveButton.className.includes('bg-green'));
        
        if (isEmptySlot && hasInputFields) {
          
          // 이 행의 입력 필드들에 데이터 적용
          const rowData = remainingData[dataIndex];
          const inputFields = nextRow.querySelectorAll('input[type="text"]') as NodeListOf<HTMLInputElement>;
          
          // 필드 설정 순서대로 input 매칭
          fieldConfigs.forEach((field, fieldIndex) => {
            if (rowData[field.field_key] && inputFields[fieldIndex]) {
              const input = inputFields[fieldIndex];
              const value = rowData[field.field_key];
              
              input.value = value;
              // React의 상태 업데이트를 위해 input 이벤트 발생
              const inputEvent = new Event('input', { bubbles: true });
              input.dispatchEvent(inputEvent);
            }
          });
          
          dataIndex++;
        }
        
        nextRow = nextRow.nextElementSibling as HTMLTableRowElement;
      }
      
    } catch (error) {
      console.error('Error applying data to next slots:', error);
    }
  };

  // 단일 필드를 다음 빈 슬롯들에 적용
  const applySingleFieldToNextEmptySlots = (values: string[], targetFieldKey: string) => {
    try {
      const currentInput = document.activeElement as HTMLInputElement;
      if (!currentInput || currentInput.tagName !== 'INPUT') {
        return;
      }
      
      const currentRow = currentInput.closest('tr');
      if (!currentRow) {
        return;
      }
      
      let nextRow = currentRow.nextElementSibling as HTMLTableRowElement;
      let valueIndex = 0;
      
      while (nextRow && valueIndex < values.length) {
        const saveButton = nextRow.querySelector('button') as HTMLButtonElement;
        const hasInputFields = nextRow.querySelectorAll('input[type="text"]').length > 0;
        const isEmptySlot = saveButton && (saveButton.textContent?.includes('저장') || saveButton.className.includes('bg-green'));
        
        if (isEmptySlot && hasInputFields) {
          
          // 해당 필드의 input 찾기
          const inputFields = nextRow.querySelectorAll('input[type="text"]') as NodeListOf<HTMLInputElement>;
          const targetFieldIndex = fieldConfigs.findIndex(f => f.field_key === targetFieldKey);
          
          if (targetFieldIndex >= 0 && inputFields[targetFieldIndex]) {
            const input = inputFields[targetFieldIndex];
            const value = values[valueIndex];
            
            input.value = value;
            const inputEvent = new Event('input', { bubbles: true });
            input.dispatchEvent(inputEvent);
          }
          
          valueIndex++;
        }
        
        nextRow = nextRow.nextElementSibling as HTMLTableRowElement;
      }
      
    } catch (error) {
      console.error('Error applying single field to next slots:', error);
    }
  };

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
      {/* 체크박스 (빈 슬롯만) */}
      <td className="px-1 py-4 text-center border-r">
        {isEmptySlot ? (
          <input
            type="checkbox"
            checked={isSelected || false}
            onChange={(e) => onSelectionChange?.(slot.id, e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )}
      </td>
      
      {/* 번호 */}
      <td className="px-1 py-4 border-r font-medium text-center text-sm">
        #{slot.slot_number || slot.seq || slotIndex + 1}
      </td>
      
      {/* 동적 필드들 */}
      {fieldConfigs.map((field, fieldIndex) => {
        // URL 파싱 필드들은 읽기 전용
        const isReadOnlyField = ['url_product_id', 'url_item_id', 'url_vendor_item_id'].includes(field.field_key);
        
        
        return (
          <td key={field.field_key} className={`${isReadOnlyField ? 'px-1 py-2' : 'px-3 py-2'} ${fieldIndex < fieldConfigs.length - 1 ? 'border-r' : ''}`}>
            {canEdit && !isReadOnlyField ? (
              <div className="relative">
                <input
                  type="text"
                  value={formData[field.field_key] || ''}
                  onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
                  onPaste={(e) => handlePaste(e, field.field_key)}
                  placeholder={field.placeholder || `${field.label} 입력`}
                  className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    errors[field.field_key] ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  title={`${field.label} - ${canEdit ? 'Ctrl+V로 Excel 데이터를 붙여넣을 수 있습니다' : '읽기 전용'}`}
                />
                {errors[field.field_key] && (
                  <div className="absolute top-full left-0 mt-1 text-xs text-red-600 whitespace-nowrap z-10">
                    {errors[field.field_key]}
                  </div>
                )}
              </div>
            ) : (
              <div className={`text-gray-900 truncate ${isReadOnlyField ? 'text-xs' : 'text-sm'}`} title={getFieldValue(field.field_key) || formData[field.field_key] || ''}>
                {getFieldValue(field.field_key) || formData[field.field_key] || '-'}
              </div>
            )}
          </td>
        );
      })}
      
      {/* 시스템 필드들 */}
      <td className="px-3 py-4 text-center border-r text-gray-400 text-sm">
        {slot.rank || '-'}
      </td>
      <td className="px-3 py-4 text-center border-r text-gray-400 text-sm">
        {slot.startDate ? new Date(slot.startDate).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).replace(/\./g, '-').replace(/-$/, '') : '-'}
      </td>
      <td className="px-3 py-4 text-center border-r text-gray-400 text-sm">
        {slot.endDate ? new Date(slot.endDate).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).replace(/\./g, '-').replace(/-$/, '') : '-'}
      </td>
      
      {/* 통합된 상태 컬럼 (상태 + 토글 스위치) */}
      <td className="px-3 py-4 text-center border-r">
        <div className="flex flex-col items-center gap-2">
          {/* 상태 표시 */}
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            isEmptySlot ? 'bg-orange-100 text-orange-800' :
            slot.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
            slot.status === 'active' ? 'bg-green-100 text-green-800' :
            slot.status === 'paused' ? 'bg-gray-100 text-gray-800' :
            slot.status === 'rejected' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {isEmptySlot ? '입력 대기' :
             slot.status === 'pending' ? '승인 대기' :
             slot.status === 'active' ? '활성' :
             slot.status === 'paused' ? '일시정지' :
             slot.status === 'rejected' ? '거절됨' :
             slot.status}
          </span>
          
          {/* 토글 스위치 (active/paused 상태에서만) */}
          {(slot.status === 'active' || slot.status === 'paused') && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">활성</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={slot.status === 'paused'}
                  onChange={slot.status === 'active' ? onPause : onResume}
                />
                <div className={`w-6 h-3 rounded-full peer peer-focus:outline-none peer-focus:ring-1 peer-focus:ring-blue-300 ${
                  slot.status === 'active' ? 'bg-green-500' : 'bg-orange-500'
                } peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-2.5 after:w-2.5 after:transition-all`}></div>
              </label>
              <span className="text-xs text-gray-500">정지</span>
            </div>
          )}
        </div>
      </td>
      
      {/* 액션 버튼 */}
      <td className="px-1 py-4 text-center">
        {isEmptySlot ? (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-2 py-1 text-xs font-medium rounded ${
              isSaving 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isSaving ? '저장 중...' : '저장'}
          </button>
        ) : canEdit && onSave ? (
          // 선슬롯발행 모드에서 active/pending 상태도 수정 가능
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-2 py-1 text-xs font-medium rounded ${
              isSaving 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isSaving ? '저장 중...' : '수정'}
          </button>
        ) : (
          <div className="flex justify-center gap-1 items-center">
            {/* 수정 버튼 */}
            {((slot.status === 'active' && isPreAllocationMode) || 
              (slot.status === 'pending' || slot.status === 'rejected')) && (
              <button
                onClick={isPreAllocationMode && canEdit ? handleSave : onEdit}
                disabled={isPreAllocationMode && isSaving}
                className={`px-2 py-1 text-white rounded text-xs font-medium ${
                  isPreAllocationMode && isSaving 
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isPreAllocationMode && isSaving ? '저장 중...' : '수정'}
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
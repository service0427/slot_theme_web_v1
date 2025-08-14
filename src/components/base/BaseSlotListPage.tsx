import { useState, useEffect, useMemo } from 'react';
import { useSlotContext } from '@/adapters/react/hooks/useSlotContext';
import { useCashContext, useAuthContext } from '@/adapters/react';
import { useConfig } from '@/contexts/ConfigContext';
import { useSystemSettings } from '@/contexts/SystemSettingsContext';
import { fieldConfigService, FieldConfig } from '@/adapters/services/ApiFieldConfigService';
import { BaseEmptySlotCard } from './BaseEmptySlotCard';
import { BaseSlotEditModal } from './BaseSlotEditModal';
import { CombinedSlotRow } from './CombinedSlotRow';
import { BasePreAllocationForm, PreAllocationData } from './BasePreAllocationForm';

// 빈 슬롯 데이터 입력 행 컴포넌트
interface EmptySlotRowProps {
  slot: any;
  slotIndex: number;
  fieldConfigs: FieldConfig[];
  onSave: (data: { customFields: Record<string, string> }) => void;
  onBulkPaste?: (slotIndex: number, fieldKey: string, values: string[]) => void;
  allEmptySlots?: any[];
  isSelected?: boolean;
  onSelectionChange?: (slotId: string, checked: boolean) => void;
}

function EmptySlotRow({ slot, slotIndex, fieldConfigs, onSave, onBulkPaste, allEmptySlots, isSelected, onSelectionChange }: EmptySlotRowProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // formData를 props로 받거나 로컬 상태로 관리
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    // slot의 기존 데이터가 있으면 사용
    if (slot.formData) {
      return slot.formData;
    }
    const initialData: Record<string, string> = {};
    fieldConfigs.forEach(field => {
      initialData[field.field_key] = '';
    });
    return initialData;
  });

  // 부모로부터 데이터 변경 감지 - formData가 있을 때만 업데이트
  // 선택 상태 변경으로 인한 리렌더링 시 데이터 유지
  useEffect(() => {
    if (slot.formData && Object.keys(slot.formData).length > 0) {
      setFormData(slot.formData);
    }
  }, [slot.formData]);

  // 필드 값 변경 처리
  const handleFieldChange = (fieldKey: string, value: string) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [fieldKey]: value
      };
      
      // 부모 컴포넌트에 변경사항 전달 (선택적)
      if (slot.onFormDataChange) {
        slot.onFormDataChange(slot.id, newData);
      }
      
      return newData;
    });
    
    // 오류 삭제
    if (errors[fieldKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldKey];
        return newErrors;
      });
    }
  };

  // 키보드 네비게이션 처리 (Tab, Enter 키로 다음 필드로 이동)
  const handleKeyDown = (e: React.KeyboardEvent, fieldIndex: number) => {
    if (e.key === 'Tab' || e.key === 'Enter') {
      if (e.key === 'Enter') {
        e.preventDefault();
        // Enter 키로 다음 필드로 이동
        const nextFieldIndex = fieldIndex + 1;
        if (nextFieldIndex < fieldConfigs.length) {
          const nextInput = document.querySelector(
            `input[data-field-index="${nextFieldIndex}"]`
          ) as HTMLInputElement;
          if (nextInput) {
            nextInput.focus();
            nextInput.select();
          }
        } else {
          // 마지막 필드에서 Enter 누르면 저장
          handleSave();
        }
      }
    }
  };

  // 붙여넣기 처리 (Excel/스프레드시트에서 복사한 데이터)
  const handlePaste = (e: React.ClipboardEvent, fieldKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 클립보드에서 텍스트 데이터 가져오기
    const pasteData = e.clipboardData.getData('text/plain');
    
    if (!pasteData) {
      return;
    }
    
    // 탭으로 구분되어 있는지 확인 (가로로 복사 - 여러 필드에 입력)
    if (pasteData.includes('\t')) {
      // 탭이 있으면 같은 행의 여러 필드에 분배
      const firstLine = pasteData.split(/[\r\n]+/)[0];
      const values = firstLine.split('\t');
      
      // 현재 필드부터 순서대로 값 설정
      const currentFieldIndex = fieldConfigs.findIndex(f => f.field_key === fieldKey);
      if (currentFieldIndex === -1) return;
      
      const newFormData = { ...formData };
      let pastedCount = 0;
      
      values.forEach((value, index) => {
        const targetFieldIndex = currentFieldIndex + index;
        if (targetFieldIndex < fieldConfigs.length) {
          const targetField = fieldConfigs[targetFieldIndex];
          const cleanValue = value.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
          if (cleanValue) {
            newFormData[targetField.field_key] = cleanValue;
            pastedCount++;
          }
        }
      });
      
      setFormData(newFormData);
      
      // 성공 피드백
      if (pastedCount > 0) {
        const input = e.currentTarget as HTMLInputElement;
        if (input) {
          const originalBg = input.style.backgroundColor;
          input.style.backgroundColor = '#e8f5e9';
          setTimeout(() => {
            input.style.backgroundColor = originalBg;
          }, 500);
        }
      }
    } 
    // 줄바꿈으로 구분된 경우 (세로로 복사 - 여러 슬롯에 입력)
    else if (pasteData.includes('\n') || pasteData.includes('\r')) {
      // 줄바꿈으로 분리
      const lines = pasteData.split(/[\r\n]+/).filter(line => line.trim().length > 0);
      
      if (lines.length > 0) {
        // 첫 번째 값은 현재 필드에 입력
        const cleanValue = lines[0].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
        if (cleanValue) {
          setFormData(prev => ({
            ...prev,
            [fieldKey]: cleanValue
          }));
        }
        
        // 여러 줄이 있으면 부모 컴포넌트에 전달
        if (lines.length > 1 && onBulkPaste) {
          // 모든 줄의 값을 정리해서 부모에게 전달
          const allValues = lines.map(line => 
            line.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '')
          ).filter(v => v);
          
          // 부모 컴포넌트가 다른 슬롯들에도 값 설정
          onBulkPaste(slotIndex, fieldKey, allValues);
        }
        
        // 성공 피드백
        const input = e.currentTarget as HTMLInputElement;
        if (input) {
          const originalBg = input.style.backgroundColor;
          input.style.backgroundColor = '#e8f5e9';
          setTimeout(() => {
            input.style.backgroundColor = originalBg;
          }, 500);
        }
      }
    }
    // 그 외 (단일 값)
    else {
      const cleanValue = pasteData.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
      if (cleanValue) {
        setFormData(prev => ({
          ...prev,
          [fieldKey]: cleanValue
        }));
        
        // 성공 피드백
        const input = e.currentTarget as HTMLInputElement;
        if (input) {
          const originalBg = input.style.backgroundColor;
          input.style.backgroundColor = '#e8f5e9';
          setTimeout(() => {
            input.style.backgroundColor = originalBg;
          }, 500);
        }
      }
    }
  };

  // 유효성 검사
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    fieldConfigs.forEach(field => {
      if (field.is_required && !formData[field.field_key]?.trim()) {
        newErrors[field.field_key] = `${field.label}은(는) 필수 필드입니다.`;
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 저장
  const handleSave = async () => {
    if (!validateForm()) return;
    
    setIsSaving(true);
    try {
      await onSave({ customFields: formData });
    } catch (error) {
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <tr className="hover:bg-gray-50">
      {/* 체크박스 */}
      <td className="px-3 py-4 text-center border-r">
        <input
          type="checkbox"
          checked={isSelected || false}
          onChange={(e) => onSelectionChange?.(slot.id, e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
      </td>
      
      {/* 번호 */}
      <td className="px-3 py-4 border-r bg-blue-50 font-medium text-center text-blue-700">
        #{slot.slot_number || slotIndex + 1}
      </td>
      
      {/* 상태 */}
      <td className="px-3 py-4 border-r">
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
          입력 대기
        </span>
      </td>
      
      {/* 동적 필드들 */}
      {fieldConfigs.map((field, fieldIndex) => (
        <td key={field.field_key} className={`px-3 py-2 ${fieldIndex < fieldConfigs.length - 1 ? 'border-r' : ''}`}>
          <div className="relative">
            <input
              type="text"
              value={formData[field.field_key] || ''}
              onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
              onPaste={(e) => handlePaste(e, field.field_key)}
              onKeyDown={(e) => handleKeyDown(e, fieldIndex)}
              placeholder={field.placeholder || `${field.label} 입력`}
              data-field-index={fieldIndex}
              className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                errors[field.field_key] ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              title={`${field.label} - Ctrl+V로 Excel 데이터를 붙여넣을 수 있습니다`}
            />
            {errors[field.field_key] && (
              <div className="absolute top-full left-0 mt-1 text-xs text-red-600 whitespace-nowrap z-10">
                {errors[field.field_key]}
              </div>
            )}
          </div>
        </td>
      ))}
      
      {/* 시스템 필드들 - 비어있음 */}
      <td className="px-3 py-4 text-center border-r text-gray-400 text-sm">
        -
      </td>
      <td className="px-3 py-4 text-center border-r text-gray-400 text-sm">
        -
      </td>
      <td className="px-3 py-4 text-center border-r text-gray-400 text-sm">
        저장 후
      </td>
      <td className="px-3 py-4 text-center border-r text-gray-400 text-sm">
        저장 후
      </td>
      <td className="px-3 py-4 text-center border-r text-gray-400 text-sm">
        {new Date().toLocaleDateString()}
      </td>
      <td className="px-3 py-4 text-center border-r">
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
          대기
        </span>
      </td>
      
      {/* 액션 버튼 */}
      <td className="px-3 py-4 text-center">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`px-3 py-1 text-xs font-medium rounded ${
            isSaving 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {isSaving ? '저장 중...' : '저장'}
        </button>
      </td>
    </tr>
  );
}

type ViewType = 'grid' | 'list';

interface SlotListPageStyles {
  container: string;
  header: {
    title: string;
    subtitle: string;
  };
  actionBar: string;
  button: {
    primary: string;
    secondary: string;
    disabled: string;
  };
  viewToggle: {
    container: string;
    active: string;
    inactive: string;
  };
  searchContainer: string;
  searchInput: string;
  select: string;
  gridContainer: string;
  tableContainer: string;
  pagination: {
    container: string;
    button: string;
    activeButton: string;
    disabledButton: string;
  };
  emptyState: string;
  errorText: string;
}

interface BaseSlotListPageProps {
  styles?: SlotListPageStyles;
  SlotRegistrationModal: any;
  SlotBulkRegistrationModal: any;
  UserSlotCard: any;
  UserSlotListItem: any;
}

const defaultStyles: SlotListPageStyles = {
  container: "p-6",
  header: {
    title: "text-2xl font-bold mb-2",
    subtitle: "text-gray-600"
  },
  actionBar: "mb-6 flex justify-between items-center",
  button: {
    primary: "bg-blue-600 text-white hover:bg-blue-700 px-6 py-3 rounded-lg font-medium",
    secondary: "bg-green-600 text-white rounded-lg hover:bg-green-700 px-6 py-3 font-medium",
    disabled: "bg-gray-300 text-gray-500 cursor-not-allowed px-6 py-3 rounded-lg font-medium"
  },
  viewToggle: {
    container: "flex rounded-lg border border-gray-300 overflow-hidden",
    active: "bg-blue-600 text-white px-4 py-2",
    inactive: "bg-white text-gray-600 hover:bg-gray-50 px-4 py-2"
  },
  searchContainer: "mb-4 bg-white p-4 rounded-lg shadow",
  searchInput: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500",
  select: "px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500",
  gridContainer: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
  tableContainer: "bg-white rounded-lg shadow overflow-hidden",
  pagination: {
    container: "mt-6 flex justify-center items-center gap-2",
    button: "px-3 py-2 border rounded hover:bg-gray-50",
    activeButton: "px-3 py-2 border rounded bg-blue-600 text-white",
    disabledButton: "px-3 py-2 border rounded opacity-50 cursor-not-allowed"
  },
  emptyState: "bg-gray-50 rounded-lg p-8 text-center",
  errorText: "text-sm text-red-600 mb-4"
};

export function BaseSlotListPage({ 
  styles = defaultStyles,
  SlotRegistrationModal,
  SlotBulkRegistrationModal,
  UserSlotCard,
  UserSlotListItem
}: BaseSlotListPageProps) {
  const { slots, slotPrice, createSlot, pauseSlot, resumeSlot, loadUserSlots, fillEmptySlot, updateSlot, isLoading } = useSlotContext();
  const { config } = useConfig();
  const { getSetting } = useSystemSettings();
  const { user } = useAuthContext();
  const cashContext = config.useCashSystem ? useCashContext() : null;
  const balance = cashContext?.balance;
  
  // 슬롯 운영 모드 확인
  const slotOperationMode = getSetting('slotOperationMode', 'business') || 'normal';
  const isPreAllocationMode = slotOperationMode === 'pre-allocation';
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showBulkRegistrationModal, setShowBulkRegistrationModal] = useState(false);
  const [viewType, setViewType] = useState<ViewType>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([]);
  const [fieldConfigsLoading, setFieldConfigsLoading] = useState(true);
  const [emptySlotsForms, setEmptySlotsForms] = useState<Record<string, Record<string, string>>>({});
  // 모든 슬롯의 formData를 중앙 관리
  const [slotsFormData, setSlotsFormData] = useState<Record<string, Record<string, string>>>({});
  // 선슬롯발행 모드에서는 개별 저장으로 변경 - 체크박스 제거
  // const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [editingSlot, setEditingSlot] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreAllocationForm, setShowPreAllocationForm] = useState(false);

  useEffect(() => {
    loadUserSlots();
    loadFieldConfigs();
  }, []);

  // 슬롯의 formData 변경 핸들러
  const handleFormDataChange = (slotId: string, newFormData: Record<string, string>) => {
    setSlotsFormData(prev => ({
      ...prev,
      [slotId]: newFormData
    }));
  };

  // 벌크 페이스트 핸들러
  const handleBulkPaste = (startFromSlotIndex: number, fieldKey: string, values: string[]) => {
    console.log('[handleBulkPaste] 시작:', { startFromSlotIndex, fieldKey, values });
    
    values.forEach((value, valueIndex) => {
      const targetSlotIndex = startFromSlotIndex + valueIndex;
      if (targetSlotIndex < paginatedSlots.length && value?.trim()) {
        const targetSlot = paginatedSlots[targetSlotIndex];
        if (targetSlot) {
          console.log(`[handleBulkPaste] 슬롯 ${targetSlot.id}(인덱스: ${targetSlotIndex})에 ${fieldKey}=${value} 설정`);
          setSlotsFormData(prev => ({
            ...prev,
            [targetSlot.id]: {
              ...prev[targetSlot.id] || {},
              [fieldKey]: value.trim()
            }
          }));
        }
      }
    });
  };

  // 필드 설정 로드
  const loadFieldConfigs = async () => {
    try {
      setFieldConfigsLoading(true);
      const configs = await fieldConfigService.getFieldConfigs();
      
      // 리스트에 표시할 필드들만 가져와서 order 순으로 정렬
      // is_enabled와 show_in_list 둘 다 true인 필드만 표시
      const listFields = configs
        .filter(field => field.is_enabled && field.show_in_list)
        .sort((a, b) => a.display_order - b.display_order);
      
      // URL 파싱 필드들을 하드코딩으로 추가 (시스템 자동 생성 필드)
      const urlParsingFields: FieldConfig[] = [
        {
          field_key: 'url_product_id',
          label: '상품ID',
          field_type: 'text',
          is_required: false,
          is_enabled: true,
          show_in_list: true,
          is_searchable: false,
          display_order: 100,
          is_system_generated: true
        },
        {
          field_key: 'url_item_id',
          label: '아이템ID',
          field_type: 'text',
          is_required: false,
          is_enabled: true,
          show_in_list: true,
          is_searchable: false,
          display_order: 101,
          is_system_generated: true
        },
        {
          field_key: 'url_vendor_item_id',
          label: '판매자ID',
          field_type: 'text',
          is_required: false,
          is_enabled: true,
          show_in_list: true,
          is_searchable: false,
          display_order: 102,
          is_system_generated: true
        }
      ];
      
      // 사용자 설정 필드와 URL 파싱 필드 결합
      const allFields = [...listFields, ...urlParsingFields].sort((a, b) => a.display_order - b.display_order);
      setFieldConfigs(allFields);
    } catch (error) {
      console.error('필드 설정 로드 실패:', error);
    } finally {
      setFieldConfigsLoading(false);
    }
  };

  // 필터링 및 검색
  const filteredSlots = useMemo(() => {
    const filtered = slots.filter(slot => {      
      // 검색어 필터
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        
        // 키워드 검색 - 여러 필드에서 검색
        const keywordMatch = 
          slot.customFields?.keyword?.toLowerCase().includes(query) ||
          slot.customFields?.keywords?.toLowerCase().includes(query) ||
          slot.keyword?.toLowerCase().includes(query);
          
        // URL 검색 - 여러 URL 필드에서 검색  
        const urlMatch = 
          slot.customFields?.url?.toLowerCase().includes(query) ||
          slot.customFields?.landingUrl?.toLowerCase().includes(query) ||
          slot.url?.toLowerCase().includes(query);
          
        // 기타 필드 검색
        const otherMatch = 
          slot.customFields?.description?.toLowerCase().includes(query) ||
          slot.customFields?.mid?.toLowerCase().includes(query) ||
          slot.mid?.toLowerCase().includes(query);
        
        if (!keywordMatch && !urlMatch && !otherMatch) {
          return false;
        }
      }
      
      // 상태 필터
      if (statusFilter !== 'all') {
        const now = new Date();
        const start = slot.startDate ? new Date(slot.startDate) : null;
        const end = slot.endDate ? new Date(slot.endDate) : null;
        
        let actualStatus = '';
        
        if (slot.status === 'empty') {
          actualStatus = 'empty';
        } else if (slot.status === 'pending' && slotOperationMode !== 'pre-allocation') {
          actualStatus = 'pending';
        } else if (slot.status === 'paused') {
          actualStatus = 'paused';
        } else if (slot.status === 'rejected') {
          actualStatus = 'rejected';
        } else if (slot.status === 'active') {
          if (start && now < start) {
            actualStatus = 'waiting';
          } else if (end && now > end) {
            actualStatus = 'completed';
          } else {
            actualStatus = 'active';
          }
        }
        
        if (actualStatus !== statusFilter) {
          return false;
        }
      }
      
      return true;
    });

    // 정렬: 슬롯 번호 순으로 정렬
    return filtered.sort((a, b) => {
      const aNumber = a.slot_number || a.seq || 0;
      const bNumber = b.slot_number || b.seq || 0;
      return aNumber - bNumber;
    });
  }, [slots, searchQuery, statusFilter]);
  
  // 빈 슬롯 필터링 (선슬롯발행 모드용)
  const emptySlots = useMemo(() => {
    if (slotOperationMode !== 'pre-allocation') return [];
    const empty = slots.filter(slot => slot.status === 'empty');
    return empty;
  }, [slots, slotOperationMode]);

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

  // 선슬롯발행 생성 핸들러
  const handlePreAllocationCreate = async (data: PreAllocationData) => {
    try {
      
      // TODO: API 호출로 빈 슬롯들을 생성하는 로직
      // 임시로 alert를 사용하여 기능 확인
      alert(`${data.slotCount}개의 빈 슬롯이 생성되었습니다.\n기간: ${data.startDate} ~ ${data.endDate}`);
      
      // 슬롯 목록 새로고침
      await loadUserSlots();
      
      setShowPreAllocationForm(false);
    } catch (error) {
      console.error('Pre-allocation creation failed:', error);
      throw error;
    }
  };

  const handleFillEmptySlot = async (data: { customFields: Record<string, string> }, slotId: string) => {
    if (!slotId) return;
    
    const success = await fillEmptySlot(slotId, data);
    if (success) {
      // 성공 메시지 표시
      alert('슬롯이 성공적으로 채워졌습니다!');
      // 슬롯 목록 새로고침
      loadUserSlots();
    }
  };

  // 선슬롯발행 모드에서 active/pending 슬롯 업데이트
  const handleUpdateSlot = async (data: { customFields: Record<string, string> }, slotId: string) => {
    if (!slotId) return;
    
    try {
      const success = await updateSlot(slotId, data);
      if (success) {
        // 성공 메시지 표시
        alert('슬롯이 성공적으로 수정되었습니다!');
        // 슬롯 목록 새로고침
        loadUserSlots();
      }
    } catch (error) {
      console.error('슬롯 업데이트 실패:', error);
      alert('슬롯 수정에 실패했습니다.');
    }
  };

  // 슬롯 수정 처리
  const handleEditSlot = async (slotId: string, data: Record<string, string>) => {
    try {
      const token = localStorage.getItem('accessToken');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
      const response = await fetch(`${apiUrl}/slots/${slotId}/update-fields`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          customFields: data
        })
      });

      if (response.ok) {
        alert('슬롯이 성공적으로 수정되었습니다!');
        await loadUserSlots();
        setShowEditModal(false);
        setEditingSlot(null);
      } else {
        const error = await response.json();
        alert(`수정 실패: ${error.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('슬롯 수정 오류:', error);
      alert('슬롯 수정 중 오류가 발생했습니다.');
    }
  };

  // 선택한 슬롯들 일괄 저장 - 체크박스 제거로 사용 안 함
  /*
  const handleBulkSave = async () => {
    const selectedSlotIds = Array.from(selectedSlots);
    if (selectedSlotIds.length === 0) return;
    
    const confirmMessage = `선택한 ${selectedSlotIds.length}개 슬롯을 저장하시겠습니까?`;
    if (!confirm(confirmMessage)) return;
    
    let successCount = 0;
    let failCount = 0;
    
    console.log('[DEBUG] 선택한 슬롯들:', selectedSlotIds);
    console.log('[DEBUG] 폼 데이터:', emptySlotsForms);
    
    for (const slotId of selectedSlotIds) {
      const formData = emptySlotsForms[slotId] || {};
      console.log(`[DEBUG] 슬롯 ${slotId}의 formData:`, formData);
      
      // 선발행 모드에서는 빈 슬롯도 저장 가능
      const slot = slots.find(s => s.id === slotId);
      console.log(`[DEBUG] 슬롯 정보:`, slot);
      console.log(`[DEBUG] issue_type: ${slot?.issue_type}, is_empty: ${slot?.is_empty}`);
      
      // issue_type이 'pre_issued' 또는 'pre-issued' 또는 status가 'empty'인 경우 모두 처리
      const isPreAllocatedEmptySlot = 
        (slot?.issue_type === 'pre_issued' || slot?.issue_type === 'pre-issued' || slot?.status === 'empty') 
        && slot?.is_empty;
      
      console.log(`[DEBUG] isPreAllocatedEmptySlot: ${isPreAllocatedEmptySlot}`);
      
      if (isPreAllocatedEmptySlot || (formData && Object.keys(formData).some(key => formData[key]))) {
        // 선발행 빈 슬롯이거나 데이터가 있으면 저장
        const success = await fillEmptySlot(slotId, { customFields: formData });
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      } else {
        // 일반 빈 폼은 건너뛰기
        failCount++;
      }
    }
    
    // 결과 메시지
    let message = '';
    if (successCount > 0) {
      message += `${successCount}개 슬롯이 성공적으로 저장되었습니다.`;
    }
    if (failCount > 0) {
      if (message) message += '\n';
      message += `${failCount}개 슬롯 저장에 실패했습니다. (비어있거나 오류)`;
    }
    
    alert(message);
    
    // 성공한 것들은 선택 해제하고 리스트 새로고침
    if (successCount > 0) {
      setSelectedSlots(new Set());
      loadUserSlots();
    }
  };
  */

  // 기존 handleBulkPaste 함수 제거됨

  const canAffordSlot = !config.useCashSystem || (balance && balance.amount >= slotPrice);

  return (
    <div className={styles.container}>
      <div className="mb-6">
        <h1 className={styles.header.title}>내 광고 슬롯</h1>
        {slotOperationMode === 'normal' && (
          <p className={styles.header.subtitle}>
            {searchQuery || statusFilter !== 'all' 
              ? `검색 결과: ${filteredSlots.length}개 / 전체: ${slots.length}개`
              : `보유 슬롯: ${slots.length}개`
            }
            {config.useCashSystem && ` | 슬롯 가격: ${slotPrice.toLocaleString()}원`}
          </p>
        )}
      </div>

      {/* 액션 바 */}
      <div className={styles.actionBar}>
        <div className="flex gap-3">
          {slotOperationMode === 'normal' ? (
            <>
              <button
                onClick={() => setShowRegistrationModal(true)}
                disabled={!canAffordSlot}
                className={canAffordSlot ? styles.button.primary : styles.button.disabled}
              >
                {config.useCashSystem 
                  ? `개별 등록 (${slotPrice.toLocaleString()}원)`
                  : '개별 등록 신청'
                }
              </button>
              
              <button
                onClick={() => setShowBulkRegistrationModal(true)}
                className={styles.button.secondary}
              >
                대량 등록
              </button>
            </>
          ) : user?.role === 'operator' ? (
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowPreAllocationForm(true)}
                className={styles.button.primary}
              >
                선슬롯발행 생성
              </button>
              <span className="text-sm text-gray-600">
                할당된 슬롯: {slots.length}개
              </span>
              <span className="text-sm text-green-600 font-medium">
                사용 중: {slots.filter(slot => slot.status !== 'empty').length}개
              </span>
              <span className="text-sm text-orange-600 font-medium">
                사용 가능: {slots.filter(slot => slot.status === 'empty').length}개
              </span>
            </div>
          ) : (
            // 일반 사용자는 선슬롯발행 모드에서 아무것도 표시 안 함
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                할당된 슬롯: {slots.length}개
              </span>
              <span className="text-sm text-green-600 font-medium">
                사용 중: {slots.filter(slot => slot.status !== 'empty').length}개
              </span>
              <span className="text-sm text-orange-600 font-medium">
                사용 가능: {slots.filter(slot => slot.status === 'empty').length}개
              </span>
            </div>
          )}
        </div>

        {/* 뷰 타입 전환 - 삭제 */}
        {false && (
        <div className="flex items-center gap-4">
          <div className={styles.viewToggle.container}>
            <button
              onClick={() => setViewType('grid')}
              className={viewType === 'grid' ? styles.viewToggle.active : styles.viewToggle.inactive}
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
              className={viewType === 'list' ? styles.viewToggle.active : styles.viewToggle.inactive}
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
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className={styles.select}
            >
              <option value={10}>10개씩</option>
              <option value={20}>20개씩</option>
              <option value={50}>50개씩</option>
              <option value={100}>100개씩</option>
            </select>
          )}
        </div>
        )}
      </div>

      {config.useCashSystem && !canAffordSlot && (
        <p className={styles.errorText}>
          캐시가 부족합니다. 현재 잔액: {balance?.amount.toLocaleString() || 0}원
        </p>
      )}

      {/* 검색 및 필터 영역 */}
      <div className={styles.searchContainer}>
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="키워드, URL로 검색..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className={styles.searchInput}
            />
          </div>
          
          {/* 먼저 상태 드롭박스를 표시 */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className={styles.select}
          >
            <option value="all">전체 상태</option>
            <option value="empty">입력 대기</option>
            {slotOperationMode !== 'pre-allocation' && <option value="pending">승인 대기</option>}
            <option value="waiting">대기중</option>
            <option value="active">활성</option>
            <option value="completed">완료</option>
            <option value="paused">일시정지</option>
            <option value="rejected">거절됨</option>
          </select>
          
          {/* 선슬롯발행 모드에서 전체 저장 버튼 */}
          {slotOperationMode === 'pre-allocation' && (
            <button
              onClick={async () => {
                // 완료가 아닌 모든 슬롯 찾기 (input이 있는 슬롯)
                const editableSlots = [];
                const rows = document.querySelectorAll('tbody tr');
                
                for (const row of rows) {
                  const inputs = row.querySelectorAll('input[type="text"]');
                  if (inputs.length > 0) {
                    // input이 있으면 편집 가능한 슬롯
                    const firstCell = row.querySelector('td:first-child');
                    const slotNumberText = firstCell?.textContent || '';
                    const slotNumber = parseInt(slotNumberText.replace('#', '')) || 0;
                    
                    // 해당 번호의 슬롯 찾기
                    const slot = paginatedSlots.find(s => 
                      (s.slot_number === slotNumber) || 
                      (s.seq === slotNumber)
                    );
                    
                    if (slot) {
                      const formData = {};
                      let hasRequiredFields = true;
                      let missingFields = [];
                      
                      inputs.forEach((input: HTMLInputElement, index) => {
                        if (fieldConfigs[index]) {
                          const fieldKey = fieldConfigs[index].field_key;
                          const value = input.value?.trim() || '';
                          formData[fieldKey] = value;
                          
                          // 필수 필드 체크
                          if (fieldConfigs[index].is_required && !value) {
                            hasRequiredFields = false;
                            missingFields.push(fieldConfigs[index].label);
                          }
                        }
                      });
                      
                      // 필수 필드가 모두 있을 때만 저장 대상에 추가
                      if (hasRequiredFields) {
                        editableSlots.push({ slot, formData });
                      } else {
                        console.log(`슬롯 #${slot.slot_number || slot.seq} 스킵 (필수 필드 누락: ${missingFields.join(', ')})`);
                      }
                    }
                  }
                }
                
                if (editableSlots.length === 0) {
                  alert('저장할 슬롯이 없습니다.');
                  return;
                }
                
                let successCount = 0;
                let failCount = 0;
                
                for (const { slot, formData } of editableSlots) {
                  let success = false;
                  
                  if (slot.status === 'empty') {
                    // 빈 슬롯은 fillEmptySlot 사용
                    success = await fillEmptySlot(slot.id, { customFields: formData });
                  } else {
                    // 나머지는 updateSlot 사용
                    success = await updateSlot(slot.id, { customFields: formData });
                  }
                  
                  if (success) {
                    successCount++;
                  } else {
                    failCount++;
                  }
                }
                
                alert('저장되었습니다.');
                loadUserSlots();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
            >
              저장
            </button>
          )}
        </div>
      </div>

      {/* 슬롯 목록 */}
      {isLoading || fieldConfigsLoading ? (
        <div className="text-center py-8">로딩 중...</div>
      ) : filteredSlots.length === 0 ? (
        <div className={styles.emptyState}>
          {searchQuery || statusFilter !== 'all' ? (
            // 검색 조건이 있을 때
            <>
              <p className="text-gray-600 mb-4 text-lg font-medium">검색결과가 없습니다.</p>
              <p className="text-sm text-gray-500">
                다른 검색 조건으로 다시 시도해보세요.
              </p>
            </>
          ) : (
            // 전체 상태에서 슬롯이 없을 때
            <>
              <p className="text-gray-600 mb-4 text-lg font-medium">운영자가 슬롯을 발급해줘야 합니다.</p>
              <p className="text-sm text-gray-500">
                관리자에게 문의하여 슬롯을 발급받으세요.
              </p>
            </>
          )}
        </div>
      ) : (
        <>
          {/* 선슬롯발행 모드: 통합 테이블 (빈 슬롯 + 사용 중 슬롯) */}
          {slotOperationMode === 'pre-allocation' && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-4 text-blue-600">전체 슬롯 목록</h3>
              <div className="bg-white rounded-lg shadow border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed">
                    <thead className="bg-blue-50 border-b">
                      <tr>
                        <th className="w-12 px-1 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider border-r">
                          번호
                        </th>
                        {/* 관리자가 설정한 필드들 */}
                        {fieldConfigs.map((field, index) => (
                          <th 
                            key={field.field_key} 
                            className={`px-3 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider ${index < fieldConfigs.length - 1 ? 'border-r' : ''}`}
                            style={{ 
                              width: ['url_product_id', 'url_item_id', 'url_vendor_item_id'].includes(field.field_key) 
                                ? '80px' 
                                : `${Math.max(150, field.label.length * 12)}px` 
                            }}
                          >
                            {field.label}
                            {field.is_required && <span className="text-red-500 ml-1">*</span>}
                          </th>
                        ))}
                        {/* 시스템 필드들 */}
                        <th className="w-16 px-3 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider border-r">
                          순위
                        </th>
                        <th className="w-24 px-3 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider border-r">
                          시작일
                        </th>
                        <th className="w-24 px-3 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider border-r">
                          종료일
                        </th>
                        <th className="w-24 px-3 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                          상태/활성화
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedSlots.map((slot, slotIndex) => {
                        // 현재 슬롯이 빈 슬롯 배열에서 몇 번째 인덱스인지 계산
                        const emptySlotIndex = slot.status === 'empty' ? emptySlots.findIndex(es => es.id === slot.id) : -1;
                        
                        return (
                          <CombinedSlotRow
                            key={slot.id}
                            slot={{
                              ...slot,
                              formData: slotsFormData[slot.id],
                              onFormDataChange: handleFormDataChange
                            }}
                            slotIndex={slotIndex}
                            fieldConfigs={fieldConfigs}
                            onSave={
                              slot.status === 'empty' 
                                ? (data) => handleFillEmptySlot(data, slot.id)
                                : (isPreAllocationMode && (slot.status === 'active' || slot.status === 'pending'))
                                  ? (data) => handleUpdateSlot(data, slot.id)  // 선슬롯발행 모드에서는 active/pending 업데이트
                                  : undefined
                            }
                            onEdit={(!isPreAllocationMode && slot.status !== 'empty') ? () => {
                              setEditingSlot(slot);
                              setShowEditModal(true);
                            } : undefined}
                            onPause={slot.status === 'active' ? async () => {
                              await pauseSlot(slot.id);
                              loadUserSlots();
                            } : undefined}
                            onResume={slot.status === 'paused' ? async () => {
                              await resumeSlot(slot.id);
                              loadUserSlots();
                            } : undefined}
                            onBulkPaste={handleBulkPaste}
                          />
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="bg-gray-50 px-4 py-3 border-t">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-2">
                      <span className="text-red-500">*</span>
                      <span>필수 필드</span>
                    </span>
                    <span>• Excel에서 여러 셀을 복사하여 Ctrl+V로 한 번에 붙여넣기 가능</span>
                    <span>• Tab/Enter로 다음 필드 이동</span>
                    <span>• 각 슬롯의 상태 옆 저장 버튼으로 개별 저장</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* 일반 모드: 기존 슬롯 목록 */}
          {slotOperationMode !== 'pre-allocation' && filteredSlots.length > 0 && (
            <>
              {viewType === 'grid' ? (
                <div className={styles.gridContainer}>
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
            <div className={styles.tableContainer}>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">번호</th>
                    {/* 관리자가 설정한 필드들 */}
                    {fieldConfigs.map(field => (
                      <th key={field.field_key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {field.label}
                      </th>
                    ))}
                    {/* 시스템 필드들 */}
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">순위</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">시작일</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">종료일</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">상태/활성화</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedSlots.map(slot => (
                    <UserSlotListItem
                      key={slot.id}
                      slot={slot}
                      fieldConfigs={fieldConfigs}
                      onPause={() => pauseSlot(slot.id)}
                      onResume={() => resumeSlot(slot.id)}
                      onEdit={() => {
                        setEditingSlot(slot);
                        setShowEditModal(true);
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
              )}
            </>
          )}

          {/* 페이징 */}
          {totalPages > 1 && (
            <div className={styles.pagination.container}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={currentPage === 1 ? styles.pagination.disabledButton : styles.pagination.button}
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
                    className={currentPage === pageNum ? styles.pagination.activeButton : styles.pagination.button}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={currentPage === totalPages ? styles.pagination.disabledButton : styles.pagination.button}
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

      {/* 슬롯 수정 모달 */}
      <BaseSlotEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingSlot(null);
        }}
        onSubmit={handleEditSlot}
        slot={editingSlot}
      />

      {/* 선슬롯발행 생성 폼 */}
      <BasePreAllocationForm
        isOpen={showPreAllocationForm}
        onClose={() => setShowPreAllocationForm(false)}
        onSubmit={handlePreAllocationCreate}
      />

    </div>
  );
}
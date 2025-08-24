import { useState, useEffect } from 'react';
import { fieldConfigService, FieldConfig } from '@/adapters/services/ApiFieldConfigService';

interface BaseSlotEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (slotId: string, data: Record<string, string>) => Promise<void>;
  slot: any;
}

export function BaseSlotEditModal({ isOpen, onClose, onSubmit, slot }: BaseSlotEditModalProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [originalData, setOriginalData] = useState<Record<string, string>>({});
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && slot) {
      loadFieldConfigs();
      loadSlotData();
    }
  }, [isOpen, slot]);

  const loadFieldConfigs = async () => {
    try {
      setIsLoading(true);
      const configs = await fieldConfigService.getFieldConfigs();
      const enabledFields = configs.filter(field => field.is_enabled);
      setFieldConfigs(enabledFields);
    } catch (error) {
      // console.error('필드 설정 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSlotData = async () => {
    if (!slot) return;
    
    try {
      const token = localStorage.getItem('accessToken');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
      const response = await fetch(`${apiUrl}/slots/${slot.id}/field-values`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const values: Record<string, string> = {};
        
        // slot_field_values 테이블의 값들
        if (data.fieldValues) {
          data.fieldValues.forEach((fv: any) => {
            values[fv.field_key] = fv.value || '';
          });
        }
        
        // slots 테이블의 기본 값들 (fallback)
        if (!values.url && slot.url) values.url = slot.url;
        if (!values.keyword && slot.keyword) values.keyword = slot.keyword;
        if (!values.mid && slot.mid) values.mid = slot.mid;
        
        setFormData(values);
        setOriginalData(values); // 원본 데이터 저장
      }
    } catch (error) {
      // console.error('슬롯 데이터 로드 실패:', error);
      // fallback으로 slots 테이블의 값 사용
      const fallbackData = {
        url: slot.url || '',
        keyword: slot.keyword || '',
        mid: slot.mid || ''
      };
      setFormData(fallbackData);
      setOriginalData(fallbackData); // 원본 데이터 저장
    }
  };

  const validateCoupangUrl = (url: string): string | null => {
    if (!url) return null;
    
    const isCoupangDomain = /coupang\.com/.test(url);
    
    if (isCoupangDomain) {
      // 정확한 URL 패턴 체크 (www는 선택사항)
      const isValidCoupangUrl = /https?:\/\/(www\.)?coupang\.com\/vp\/products\/\d+/.test(url);
      const hasItemId = url.includes('itemId=') && /itemId=\d+/.test(url);
      const hasVendorItemId = url.includes('vendorItemId=') && /vendorItemId=\d+/.test(url);
      
      if (!isValidCoupangUrl) {
        return '올바른 쿠팡 URL 형식: https://www.coupang.com/vp/products/{상품ID}';
      } else if (!hasItemId || !hasVendorItemId) {
        return '쿠팡 URL 필수 파라미터: itemId, vendorItemId';
      }
    }
    
    return null;
  };

  const handleFieldChange = (fieldKey: string, value: string) => {
    let processedValue = value;
    
    // URL 필드인 경우 &q= 이후 제거
    if (fieldKey === 'url' && value.includes('&q=')) {
      processedValue = value.split('&q=')[0];
    }
    
    setFormData(prev => ({
      ...prev,
      [fieldKey]: processedValue
    }));
    
    // URL 검증
    if (fieldKey === 'url') {
      const error = validateCoupangUrl(processedValue);
      if (error) {
        setErrors(prev => ({ ...prev, url: error }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.url;
          return newErrors;
        });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // URL 검증
    const urlError = validateCoupangUrl(formData.url || '');
    if (urlError) {
      setErrors({ url: urlError });
      return;
    }
    
    // 키워드나 URL 변경 체크
    const keywordChanged = (originalData.keyword || '') !== (formData.keyword || '');
    const urlChanged = (originalData.url || '') !== (formData.url || '');
    
    if (keywordChanged || urlChanged) {
      if (!confirm('키워드, URL 변경할 경우 기존 순위 정보는 초기화 됩니다.\n계속하시겠습니까?')) {
        return;
      }
      
      // rank_daily 데이터 실제 삭제
      try {
        const token = localStorage.getItem('accessToken');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
        const response = await fetch(`${apiUrl}/slots/${slot.id}/rank-data`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('Rank data deleted:', result.message);
        } else {
          console.error('Failed to delete rank data');
        }
      } catch (error) {
        console.error('Failed to delete rank data:', error);
      }
    }
    
    setIsSaving(true);
    
    try {
      await onSubmit(slot.id, formData);
      onClose();
    } catch (error) {
      alert('수정 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">슬롯 수정</h2>
        
        {isLoading ? (
          <div className="text-center py-4">로딩 중...</div>
        ) : (
          <form onSubmit={handleSubmit}>
            {fieldConfigs
              // URL 파싱 필드들은 수정 모달에서 제외
              .filter(field => !['url_product_id', 'url_item_id', 'url_vendor_item_id'].includes(field.field_key))
              .map(field => (
                <div key={field.field_key} className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                    {field.is_required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <input
                    type="text"
                    value={formData[field.field_key] || ''}
                    onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.is_required}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors[field.field_key] ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors[field.field_key] && (
                    <p className="text-xs text-red-500 mt-1">{errors[field.field_key]}</p>
                  )}
                  {!errors[field.field_key] && field.description && (
                    <p className="text-xs text-gray-500 mt-1">{field.description}</p>
                  )}
                </div>
              ))}
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSaving || Object.keys(errors).length > 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useConfig } from '@/contexts/ConfigContext';
import { fieldConfigService, FieldConfig } from '@/adapters/services/ApiFieldConfigService';

interface BaseSlotRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    customFields: Record<string, string>;
  }) => void;
  slotPrice: number;
}

export function BaseSlotRegistrationModal({ isOpen, onClose, onSubmit, slotPrice }: BaseSlotRegistrationModalProps) {
  const { config } = useConfig();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // 필드 설정 로드
  useEffect(() => {
    if (isOpen) {
      loadFieldConfigs();
    }
  }, [isOpen]);

  const loadFieldConfigs = async () => {
    try {
      setLoading(true);
      const configs = await fieldConfigService.getFieldConfigs();
      // 활성화된 필드들만 가져와서 order 순으로 정렬
      const enabledConfigs = configs
        .filter(field => field.is_enabled)
        .sort((a, b) => a.display_order - b.display_order);
      setFieldConfigs(enabledConfigs);
    } catch (error) {
      console.error('필드 설정 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // enabled된 필드들만 가져와서 order 순으로 정렬
  const enabledFields = fieldConfigs;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 필수 필드 검증
    const requiredFields = enabledFields.filter(field => 
      fieldConfigs.length > 0 ? field.is_required : field.required
    );
    for (const field of requiredFields) {
      const fieldKey = fieldConfigs.length > 0 ? field.field_key : field.id;
      const fieldLabel = fieldConfigs.length > 0 ? field.label : field.label;
      if (!formData[fieldKey] || formData[fieldKey].trim() === '') {
        alert(`${fieldLabel}은(는) 필수 입력 항목입니다.`);
        return;
      }
    }
    
    onSubmit({
      customFields: formData
    });

    // 폼 초기화
    setFormData({});
  };
  
  const handleFieldChange = (fieldId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };
  
  const renderField = (field: any) => {
    const fieldKey = fieldConfigs.length > 0 ? field.field_key : field.id;
    const fieldType = fieldConfigs.length > 0 ? field.field_type : field.type;
    const fieldPlaceholder = fieldConfigs.length > 0 ? field.placeholder : field.placeholder;
    const isRequired = fieldConfigs.length > 0 ? field.is_required : field.required;
    
    const value = formData[fieldKey] || '';
    
    switch (fieldType) {
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={fieldPlaceholder}
            rows={3}
            required={isRequired}
          />
        );
      case 'url':
        return (
          <input
            type="url"
            value={value}
            onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={fieldPlaceholder}
            required={isRequired}
          />
        );
      case 'email':
        return (
          <input
            type="email"
            value={value}
            onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={fieldPlaceholder}
            required={isRequired}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={fieldPlaceholder}
            required={isRequired}
          />
        );
      default: // text
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={fieldPlaceholder}
            required={isRequired}
          />
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* 배경 오버레이 */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* 모달 컨텐츠 */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
          {/* 헤더 */}
          <div className="mb-4">
            <h3 className="text-lg font-bold">
              {config.useCashSystem ? '새 슬롯 등록' : '새 슬롯 등록 신청'}
            </h3>
            {config.useCashSystem && (
              <p className="text-sm text-gray-600 mt-1">
                슬롯 등록 시 {slotPrice.toLocaleString()}원이 차감됩니다.
              </p>
            )}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">필드 설정을 불러오는 중...</p>
            </div>
          ) : enabledFields.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">활성화된 입력 필드가 없습니다.</p>
              <p className="text-sm text-gray-400 mt-2">시스템 설정에서 필드를 활성화해주세요.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {enabledFields.map((field) => {
                const fieldKey = fieldConfigs.length > 0 ? field.field_key : field.id;
                const fieldLabel = fieldConfigs.length > 0 ? field.label : field.label;
                const isRequired = fieldConfigs.length > 0 ? field.is_required : field.required;
                
                return (
                  <div key={fieldKey}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {fieldLabel}
                      {isRequired && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {renderField(field)}
                  </div>
                );
              })}

              <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                취소
              </button>
              <button
                type="submit"
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {config.useCashSystem 
                  ? `등록 (${slotPrice.toLocaleString()}원)`
                  : '신청하기'
                }
              </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
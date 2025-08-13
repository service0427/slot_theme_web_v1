import { useState } from 'react';
import { useConfig } from '@/contexts/ConfigContext';

interface SlotRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    customFields: Record<string, string>;
  }) => void;
  slotPrice: number;
}

export function SlotRegistrationModal({ isOpen, onClose, onSubmit, slotPrice }: SlotRegistrationModalProps) {
  const { config } = useConfig();
  const [formData, setFormData] = useState<Record<string, string>>({});
  
  // enabled된 필드들만 가져와서 order 순으로 정렬
  const enabledFields = config.slotFields
    .filter(field => field.enabled)
    .sort((a, b) => a.order - b.order);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 필수 필드 검증
    const requiredFields = enabledFields.filter(field => field.required);
    for (const field of requiredFields) {
      if (!formData[field.id] || formData[field.id].trim() === '') {
        alert(`${field.label}은(는) 필수 입력 항목입니다.`);
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
    const value = formData[field.id] || '';
    
    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={field.placeholder}
            rows={3}
            required={field.required}
          />
        );
      case 'url':
        return (
          <input
            type="url"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={field.placeholder}
            required={field.required}
          />
        );
      case 'email':
        return (
          <input
            type="email"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={field.placeholder}
            required={field.required}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={field.placeholder}
            required={field.required}
          />
        );
      default: // text
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={field.placeholder}
            required={field.required}
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

          <form onSubmit={handleSubmit} className="space-y-4">
            {enabledFields.map((field) => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {renderField(field)}
              </div>
            ))}

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
        </div>
      </div>
    </div>
  );
}
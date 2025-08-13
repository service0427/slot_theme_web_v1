import React, { useState } from 'react';
import { useSystemSettings } from '@/contexts/SystemSettingsContext';

interface BasePreAllocationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PreAllocationData) => Promise<void>;
}

export interface PreAllocationData {
  slotCount: number;
  startDate: string;
  endDate: string;
  workCount?: number;
  amount?: number;
  description?: string;
}

export function BasePreAllocationForm({ isOpen, onClose, onSubmit }: BasePreAllocationFormProps) {
  const { getSetting } = useSystemSettings();
  const slotOperationMode = getSetting('slotOperationMode', 'business') || 'normal';

  // 선슬롯발행 모드가 아니면 렌더링하지 않음
  if (slotOperationMode !== 'pre-allocation' || !isOpen) {
    return null;
  }

  const [formData, setFormData] = useState<PreAllocationData>({
    slotCount: 10,
    startDate: new Date().toISOString().split('T')[0], // 오늘 날짜
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30일 후
    workCount: 0,
    amount: 0,
    description: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 필수 필드 검증
    if (!formData.slotCount || formData.slotCount < 1) {
      newErrors.slotCount = '슬롯 개수는 1개 이상이어야 합니다.';
    }
    if (formData.slotCount > 100) {
      newErrors.slotCount = '슬롯 개수는 100개를 초과할 수 없습니다.';
    }
    if (!formData.startDate) {
      newErrors.startDate = '시작일은 필수입니다.';
    }
    if (!formData.endDate) {
      newErrors.endDate = '종료일은 필수입니다.';
    }
    if (formData.startDate && formData.endDate && formData.startDate >= formData.endDate) {
      newErrors.endDate = '종료일은 시작일보다 늦어야 합니다.';
    }

    // 선택 필드 검증
    if (formData.workCount !== undefined && formData.workCount < 0) {
      newErrors.workCount = '작업 수는 0 이상이어야 합니다.';
    }
    if (formData.amount !== undefined && formData.amount < 0) {
      newErrors.amount = '금액은 0 이상이어야 합니다.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const confirmMessage = `${formData.slotCount}개의 빈 슬롯을 생성하시겠습니까?\n기간: ${formData.startDate} ~ ${formData.endDate}`;
    if (!confirm(confirmMessage)) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
      // 폼 초기화
      setFormData({
        slotCount: 10,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        workCount: 0,
        amount: 0,
        description: ''
      });
    } catch (error) {
      alert('슬롯 생성 중 오류가 발생했습니다.');
      console.error('Pre-allocation creation error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof PreAllocationData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // 에러 제거
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">선슬롯발행 생성</h2>
          <p className="text-sm text-gray-600 mt-1">
            관리자가 미리 빈 슬롯을 생성하여 사용자에게 할당합니다.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* 슬롯 개수 - 필수 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              슬롯 개수 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={formData.slotCount}
              onChange={(e) => handleInputChange('slotCount', parseInt(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.slotCount ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
            />
            {errors.slotCount && (
              <p className="mt-1 text-xs text-red-600">{errors.slotCount}</p>
            )}
          </div>

          {/* 기간 - 필수 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                시작일 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.startDate ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                disabled={isSubmitting}
              />
              {errors.startDate && (
                <p className="mt-1 text-xs text-red-600">{errors.startDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                종료일 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.endDate ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                disabled={isSubmitting}
              />
              {errors.endDate && (
                <p className="mt-1 text-xs text-red-600">{errors.endDate}</p>
              )}
            </div>
          </div>

          {/* 작업 수 - 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              작업 수 (선택사항)
            </label>
            <input
              type="number"
              min="0"
              value={formData.workCount || ''}
              onChange={(e) => handleInputChange('workCount', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="예: 30 (작업 예상 개수)"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.workCount ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
            />
            {errors.workCount && (
              <p className="mt-1 text-xs text-red-600">{errors.workCount}</p>
            )}
          </div>

          {/* 금액 - 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              금액 (선택사항)
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              value={formData.amount || ''}
              onChange={(e) => handleInputChange('amount', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="예: 50000 (원)"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.amount ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
            />
            {errors.amount && (
              <p className="mt-1 text-xs text-red-600">{errors.amount}</p>
            )}
          </div>

          {/* 설명 - 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              설명 (선택사항)
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="슬롯에 대한 추가 설명이나 메모"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              disabled={isSubmitting}
            />
          </div>

          {/* 요약 정보 */}
          <div className="bg-blue-50 rounded-md p-3 text-sm">
            <h4 className="font-medium text-blue-900 mb-2">생성 요약</h4>
            <ul className="text-blue-800 space-y-1">
              <li>• 생성할 슬롯: <strong>{formData.slotCount}개</strong></li>
              <li>• 운영 기간: <strong>{formData.startDate} ~ {formData.endDate}</strong></li>
              {formData.workCount && (
                <li>• 예상 작업 수: <strong>{formData.workCount}개</strong></li>
              )}
              {formData.amount && (
                <li>• 설정 금액: <strong>{formData.amount.toLocaleString()}원</strong></li>
              )}
            </ul>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            취소
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '생성 중...' : '슬롯 생성'}
          </button>
        </div>
      </div>
    </div>
  );
}
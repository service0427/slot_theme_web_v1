import React, { useState, useEffect } from 'react';
import { useSystemSettings } from '@/contexts/SystemSettingsContext';

export interface PreAllocationData {
  userId: string;
  slotCount: number;
  startDate: string;
  endDate: string;
  workCount?: number;
  amount?: number;
  description?: string;
  isTest?: boolean;
}

interface SlotAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAllocate: (data: PreAllocationData) => Promise<void>;
  userName: string;
  userId: string;
  currentAllocation?: {
    allocated: number;
    used: number;
  };
}

export function BaseSlotAllocationModal({
  isOpen,
  onClose,
  onAllocate,
  userName,
  userId,
  currentAllocation
}: SlotAllocationModalProps) {
  const { getSetting } = useSystemSettings();
  
  // 선슬롯발행 모드가 기본
  const [formData, setFormData] = useState<PreAllocationData>({
    userId: userId,
    slotCount: 10,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10일 후 (기본값)
    workCount: undefined,
    amount: undefined,
    description: '',
    isTest: false
  });
  
  const [selectedDuration, setSelectedDuration] = useState<number>(10); // 기본 10일
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 사용자의 마지막 선슬롯 발행 금액 조회
  const loadLastAllocationAmount = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
      
      console.log(`[DEBUG] 마지막 금액 조회 시작: userId=${userId}`);
      
      // 해당 사용자의 슬롯 목록을 가져와서 마지막 금액 확인
      const response = await fetch(`${API_BASE_URL}/slots?userId=${userId}&limit=1&sortBy=createdAt&sortOrder=desc`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log(`[DEBUG] API 응답 상태: ${response.status}`);
      
      if (response.ok) {
        const result = await response.json();
        console.log('[DEBUG] API 응답 데이터:', result);
        
        if (result.success && result.data && result.data.items && result.data.items.length > 0) {
          const lastSlot = result.data.items[0];
          console.log('[DEBUG] 마지막 슬롯 데이터:', lastSlot);
          
          // pre_allocation_amount 필드에서 금액 가져오기
          const amount = lastSlot.pre_allocation_amount ? parseFloat(lastSlot.pre_allocation_amount) : 0;
          
          if (amount > 0) {
            console.log(`[DEBUG] 금액 설정: ${amount}`);
            setFormData(prev => ({
              ...prev,
              amount: amount
            }));
          } else {
            console.log('[DEBUG] 금액이 없거나 0원:', amount);
          }
        } else {
          console.log('[DEBUG] 슬롯 데이터가 없거나 비어있음');
        }
      } else {
        console.log(`[DEBUG] API 호출 실패: ${response.status}`);
      }
    } catch (error) {
      console.error('마지막 할당 금액 조회 실패:', error);
    }
  };

  // 모달이 열릴 때마다 마지막 금액 조회
  useEffect(() => {
    if (isOpen && userId) {
      loadLastAllocationAmount();
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.slotCount || formData.slotCount < 1) {
      newErrors.slotCount = '슬롯 개수는 1개 이상이어야 합니다.';
    }
    if (formData.slotCount > 1000) {
      newErrors.slotCount = '슬롯 개수는 1000개를 초과할 수 없습니다.';
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const slotType = formData.isTest ? '테스트 슬롯 (3일 무료)' : '선슬롯';
    const confirmMessage = `${userName}님에게 ${formData.slotCount}개의 ${slotType}을 발행하시겠습니까?\n기간: ${formData.startDate} ~ ${formData.endDate}`;
    if (!confirm(confirmMessage)) {
      return;
    }

    setIsLoading(true);
    try {
      await onAllocate({ ...formData, userId });
      onClose();
      // 폼 초기화
      setFormData({
        userId: userId,
        slotCount: 10,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        workCount: undefined,
        amount: undefined,
        description: '',
        isTest: false
      });
      setSelectedDuration(7);
    } catch (error) {
      console.error('선슬롯 발행 실패:', error);
      alert('선슬롯 발행에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof PreAllocationData, value: any) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };
      
      // 시작일이 변경되면 종료일 재계산
      if (field === 'startDate') {
        const startDate = new Date(value);
        const duration = newData.isTest ? 3 : selectedDuration;
        startDate.setDate(startDate.getDate() + duration);
        newData.endDate = startDate.toISOString().split('T')[0];
      }
      
      // 테스트 슬롯 옵션이 변경되면 종료일 재계산
      if (field === 'isTest') {
        const startDate = new Date(newData.startDate);
        const duration = value ? 3 : selectedDuration;
        startDate.setDate(startDate.getDate() + duration);
        newData.endDate = startDate.toISOString().split('T')[0];
      }
      
      return newData;
    });
    
    // 에러 제거
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };
  
  // 기간 선택 핸들러
  const handleDurationChange = (duration: number) => {
    setSelectedDuration(duration);
    
    // 테스트 슬롯이면 무조건 3일
    if (formData.isTest) {
      duration = 3;
    }
    
    // 종료일 재계산
    if (formData.startDate) {
      const startDate = new Date(formData.startDate);
      startDate.setDate(startDate.getDate() + duration);
      setFormData(prev => ({
        ...prev,
        endDate: startDate.toISOString().split('T')[0]
      }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">선슬롯 발행</h2>
          <p className="text-sm text-gray-600 mt-1">
            <span className="font-medium">{userName}</span>님에게 선슬롯을 발행합니다.
          </p>
          
          {currentAllocation && (
            <div className="mt-2 p-3 bg-gray-50 rounded">
              <p className="text-sm">
                현재 할당: <span className="font-medium">{currentAllocation.allocated}개</span>
              </p>
              <p className="text-sm">
                사용 중: <span className="font-medium">{currentAllocation.used}개</span>
              </p>
              <p className="text-sm">
                사용 가능: <span className="font-medium">{currentAllocation.allocated - currentAllocation.used}개</span>
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* 슬롯 개수 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              슬롯 개수 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max="1000"
              value={formData.slotCount}
              onChange={(e) => handleInputChange('slotCount', parseInt(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.slotCount ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.slotCount && (
              <p className="mt-1 text-xs text-red-600">{errors.slotCount}</p>
            )}
            {currentAllocation && (
              <p className="text-xs text-gray-500 mt-1">
                현재 {currentAllocation.allocated}개 + {formData.slotCount}개 = 총 {currentAllocation.allocated + formData.slotCount}개
              </p>
            )}
          </div>

          {/* 기간 설정 - 그리드 레이아웃 */}
          <div className="grid grid-cols-2 gap-3">
            {/* 시작일 */}
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
                disabled={isLoading}
              />
              {errors.startDate && (
                <p className="mt-1 text-xs text-red-600">{errors.startDate}</p>
              )}
            </div>

            {/* 기간 선택 드롭박스 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                기간 선택 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.isTest ? 3 : selectedDuration}
                onChange={(e) => handleDurationChange(Number(e.target.value))}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formData.isTest ? 'bg-gray-100 border-gray-300 text-gray-500' : 'border-gray-300'
                }`}
                disabled={isLoading || formData.isTest}
              >
                <option value={1}>1일</option>
                <option value={3}>3일</option>
                <option value={7}>7일</option>
                <option value={10}>10일</option>
                <option value={30}>30일</option>
              </select>
            </div>
          </div>

          {/* 테스트 슬롯 옵션 */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isTest"
              checked={formData.isTest}
              onChange={(e) => handleInputChange('isTest', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={isLoading}
            />
            <label htmlFor="isTest" className="ml-2 text-sm text-gray-700">
              테스트 슬롯 (3일 무료 체험)
            </label>
          </div>
          
          {formData.isTest && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <p className="text-sm text-yellow-800">
                테스트 슬롯은 3일간 무료로 제공되며, 연장 시에도 결제가 필요하지 않습니다.
              </p>
            </div>
          )}

          {/* 종룼일 자동 표시 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              종료일 (자동 계산)
            </label>
            <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700">
              {formData.endDate ? new Date(formData.endDate).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : '-'}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              시작일로부터 {formData.isTest ? '3' : selectedDuration}일 후
            </p>
          </div>

          {/* 작업 수와 금액 - 그리드 레이아웃 - 주석처리 */}
          {/* <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                작업 수 (선택)
              </label>
              <input
                type="number"
                min="0"
                value={formData.workCount || ''}
                onChange={(e) => handleInputChange('workCount', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="예: 30"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                금액 (선택)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={formData.amount || ''}
                onChange={(e) => handleInputChange('amount', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="예: 50000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
            </div>
          </div> */}

          {/* 설명 (선택) */}
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
              disabled={isLoading}
            />
          </div>

          {/* 요약 정보 */}
          <div className="bg-blue-50 rounded-md p-3 text-sm">
            <h4 className="font-medium text-blue-900 mb-2">발행 요약</h4>
            <ul className="text-blue-800 space-y-1">
              <li>• 대상자: <strong>{userName}</strong></li>
              <li>• 발행할 슬롯: <strong>{formData.slotCount}개{formData.isTest ? ' (테스트)' : ''}</strong></li>
              <li>• 운영 기간: <strong>{formData.startDate} ~ {formData.endDate}</strong></li>
              {/* {formData.workCount && (
                <li>• 예상 작업 수: <strong>{formData.workCount}개</strong></li>
              )}
              {formData.amount && (
                <li>• 설정 금액: <strong>{formData.amount.toLocaleString()}원</strong></li>
              )} */}
            </ul>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            취소
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '발행 중...' : '선슬롯 발행'}
          </button>
        </div>
      </div>
    </div>
  );
}
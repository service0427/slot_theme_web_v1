import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface SlotExtensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExtend: (extensionDays: number) => void;
  slotInfo: {
    id: string;
    keyword: string;
    url: string;
    endDate: string;
    isExpired: boolean;
  };
}

export function BaseSlotExtensionModal({
  isOpen,
  onClose,
  onExtend,
  slotInfo
}: SlotExtensionModalProps) {
  const [selectedDays, setSelectedDays] = useState(10); // 기본값 10일
  const [isExtending, setIsExtending] = useState(false);
  const [calculatedDates, setCalculatedDates] = useState<{
    startDate: string;
    endDate: string;
  }>({ startDate: '', endDate: '' });

  // 연장 날짜 계산
  useEffect(() => {
    if (!slotInfo) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const originalEndDate = new Date(slotInfo.endDate);
    originalEndDate.setHours(0, 0, 0, 0);

    let startDate: Date;
    if (originalEndDate >= today) {
      // 아직 활성 - 원본 종료일 다음날부터
      startDate = new Date(originalEndDate);
      startDate.setDate(startDate.getDate() + 1);
    } else {
      // 이미 만료 - 오늘부터
      startDate = today;
    }

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + selectedDays - 1);

    setCalculatedDates({
      startDate: startDate.toLocaleDateString('ko-KR'),
      endDate: endDate.toLocaleDateString('ko-KR')
    });
  }, [slotInfo, selectedDays]);

  const handleExtend = async () => {
    setIsExtending(true);
    try {
      await onExtend(selectedDays);
      onClose();
    } catch (error) {
      // 에러는 상위 컴포넌트에서 처리
    } finally {
      setIsExtending(false);
    }
  };

  if (!isOpen) return null;

  const extensionOptions = [
    { value: 1, label: '1일' },
    { value: 7, label: '7일' },
    { value: 10, label: '10일' },
    { value: 30, label: '30일' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">슬롯 연장</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* 슬롯 정보 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">키워드:</span>
                <span className="font-medium">{slotInfo.keyword}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">URL:</span>
                <span className="font-medium truncate ml-2" title={slotInfo.url}>
                  {slotInfo.url}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">현재 종료일:</span>
                <span className="font-medium">
                  {new Date(slotInfo.endDate).toLocaleDateString('ko-KR')}
                  {slotInfo.isExpired && (
                    <span className="text-red-500 text-xs ml-1">(만료됨)</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* 연장 기간 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              연장 기간 선택
            </label>
            <div className="grid grid-cols-4 gap-2">
              {extensionOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setSelectedDays(option.value)}
                  className={`py-2 px-3 rounded-lg border transition-colors ${
                    selectedDays === option.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* 계산된 날짜 표시 */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              연장 후 기간
            </h4>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-blue-700">시작일:</span>
                <span className="font-medium text-blue-900">
                  {calculatedDates.startDate}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">종료일:</span>
                <span className="font-medium text-blue-900">
                  {calculatedDates.endDate}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">총 기간:</span>
                <span className="font-medium text-blue-900">
                  {selectedDays}일
                </span>
              </div>
            </div>
          </div>

          {/* 안내 메시지 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>안내:</strong> 연장된 슬롯은 자동으로 승인되며, 결제 완료 상태로 생성됩니다.
            </p>
          </div>

          {/* 버튼 */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={isExtending}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
            >
              취소
            </button>
            <button
              onClick={handleExtend}
              disabled={isExtending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isExtending ? '연장 중...' : '연장하기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
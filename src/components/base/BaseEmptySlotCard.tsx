import React from 'react';

interface EmptySlotCardProps {
  slotNumber: number;
  onClick: () => void;
}

export function BaseEmptySlotCard({ slotNumber, onClick }: EmptySlotCardProps) {
  return (
    <div 
      onClick={onClick}
      className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 hover:bg-gray-100 hover:border-gray-400 cursor-pointer transition-all"
    >
      <div className="text-center">
        <div className="mb-3">
          <svg 
            className="w-12 h-12 mx-auto text-gray-400"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 4v16m8-8H4" 
            />
          </svg>
        </div>
        
        <h3 className="text-lg font-medium text-gray-700 mb-1">
          슬롯 #{slotNumber}
        </h3>
        
        <p className="text-sm text-gray-500">
          클릭하여 광고 정보를 입력하세요
        </p>
        
        <div className="mt-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
            빈 슬롯
          </span>
        </div>
      </div>
    </div>
  );
}
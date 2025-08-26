import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

interface AdvancedSearchDropdownProps {
  onSearch: (filters: SearchFilters) => void;
  isAdmin?: boolean;
  reset?: boolean;
  onResetComplete?: () => void;
}

export interface SearchFilters {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  searchType: 'all' | 'keyword' | 'url' | 'productName' | 'userId' | 'slotNumber';
  searchQuery: string;
  status?: string;
}

export function BaseAdvancedSearchDropdown({ onSearch, isAdmin = false, reset, onResetComplete }: AdvancedSearchDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // 오늘 날짜와 3개월 전 날짜 계산
  const today = new Date();
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  
  const getInitialFilters = (): SearchFilters => ({
    dateRange: {
      startDate: threeMonthsAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    },
    searchType: 'all',
    searchQuery: '',
    status: 'all'
  });
  
  const [filters, setFilters] = useState<SearchFilters>(getInitialFilters());

  // 날짜 범위 프리셋
  const handleDatePreset = (preset: string) => {
    const now = new Date();
    let startDate = new Date();
    
    switch(preset) {
      case 'today':
        startDate = new Date();
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(now.getMonth() - 6);
        break;
      default:
        return;
    }
    
    setFilters(prev => ({
      ...prev,
      dateRange: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0]
      }
    }));
  };

  // reset prop이 true가 되면 필터 초기화
  useEffect(() => {
    if (reset) {
      setFilters(getInitialFilters());
      setIsOpen(false);
      onResetComplete?.();
    }
  }, [reset]);
  
  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = () => {
    onSearch(filters);
    setIsOpen(false);
  };

  const handleReset = () => {
    const resetFilters: SearchFilters = {
      dateRange: {
        startDate: threeMonthsAgo.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      },
      searchType: 'all',
      searchQuery: '',
      status: 'all'
    };
    setFilters(resetFilters);
    onSearch(resetFilters);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors ${
          isOpen 
            ? 'bg-purple-50 border-purple-500 text-purple-600' 
            : 'bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100'
        }`}
      >
        <Search className="w-4 h-4" />
        <span>상세 검색</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-96 bg-white border border-gray-200 rounded-lg shadow-xl z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">상세 검색</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* 안내 메시지 */}
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <span className="font-semibold">💡 안내:</span> 왼쪽 일반 검색창과 상세 검색은 별개로 작동합니다.
                상세 조건으로 검색하려면 아래 필드를 입력 후 검색 버튼을 클릭하세요.
              </p>
            </div>

            {/* 검색 기간 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                검색 기간 <span className="text-xs text-gray-500">(시작일/종료일 기준)</span>
              </label>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => handleDatePreset('today')}
                  className="px-3 py-1 text-xs border rounded hover:bg-gray-50"
                >
                  오늘
                </button>
                <button
                  onClick={() => handleDatePreset('week')}
                  className="px-3 py-1 text-xs border rounded hover:bg-gray-50"
                >
                  1주일
                </button>
                <button
                  onClick={() => handleDatePreset('month')}
                  className="px-3 py-1 text-xs border rounded hover:bg-gray-50"
                >
                  1개월
                </button>
                <button
                  onClick={() => handleDatePreset('3months')}
                  className="px-3 py-1 text-xs border rounded hover:bg-gray-50"
                >
                  3개월
                </button>
                <button
                  onClick={() => handleDatePreset('6months')}
                  className="px-3 py-1 text-xs border rounded hover:bg-gray-50"
                >
                  6개월
                </button>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={filters.dateRange.startDate}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, startDate: e.target.value }
                  }))}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm"
                />
                <span className="text-gray-500">~</span>
                <input
                  type="date"
                  value={filters.dateRange.endDate}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, endDate: e.target.value }
                  }))}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>

            {/* 검색 조건 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">검색 조건</label>
              <div className="flex gap-2">
                <select
                  value={filters.searchType}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    searchType: e.target.value as SearchFilters['searchType']
                  }))}
                  className="w-32 px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="all">전체</option>
                  <option value="keyword">키워드</option>
                  <option value="url">URL</option>
                  <option value="productName">상품명</option>
                  {isAdmin && (
                    <>
                      <option value="userId">사용자ID</option>
                      <option value="slotNumber">슬롯번호</option>
                    </>
                  )}
                </select>
                <input
                  type="text"
                  value={filters.searchQuery}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    searchQuery: e.target.value
                  }))}
                  placeholder="검색어를 입력하세요"
                  className="flex-1 px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>

            {/* 상태 필터 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">상태</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  status: e.target.value
                }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="all">전체</option>
                <option value="active">활성 (진행중)</option>
                <option value="waiting">대기 (예정)</option>
                <option value="completed">완료 (만료)</option>
                <option value="paused">일시정지</option>
                <option value="pending">승인 대기</option>
                <option value="empty">빈슬롯</option>
                <option value="rejected">거절됨</option>
              </select>
            </div>


            {/* 버튼 */}
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                초기화
              </button>
              <button
                onClick={handleSearch}
                className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                검색
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
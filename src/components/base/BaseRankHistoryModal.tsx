import React, { useState, useEffect } from 'react';

interface RankData {
  date: string;
  rank: number | null;
  prev_rank: number | null;
}

interface RankHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  slotId: string;
  keyword: string;
  startDate: string;
  endDate: string;
}

export function BaseRankHistoryModal({ 
  isOpen, 
  onClose, 
  slotId, 
  keyword, 
  startDate, 
  endDate 
}: RankHistoryModalProps) {
  const [rankHistory, setRankHistory] = useState<RankData[]>([]);
  const [loading, setLoading] = useState(false);
  const [actualDateRange, setActualDateRange] = useState<{startDate: string, endDate: string}>({
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    if (isOpen && slotId) {
      fetchRankHistory();
    }
  }, [isOpen, slotId]);

  const fetchRankHistory = async () => {
    setLoading(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`${API_BASE_URL}/slots/${slotId}/rank-history?startDate=${startDate}&endDate=${endDate}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setRankHistory(result.data || []);
        if (result.dateRange) {
          setActualDateRange(result.dateRange);
        }
      } else {
        alert('순위 히스토리 조회에 실패했습니다.');
      }
    } catch (error) {
      console.error('순위 히스토리 조회 오류:', error);
      alert('순위 히스토리 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    
    // YYYY-MM-DD 형태의 문자열을 직접 파싱
    const [year, month, day] = dateString.split('-');
    if (!year || !month || !day) return dateString;
    
    return `${year}. ${month.padStart(2, '0')}. ${day.padStart(2, '0')}.`;
  };

  const getRankChange = (currentRank: number | null, prevRank: number | null) => {
    if (!currentRank || !prevRank) return null;
    
    const change = prevRank - currentRank;
    if (change > 0) return { type: 'up', value: change };
    if (change < 0) return { type: 'down', value: Math.abs(change) };
    return { type: 'same', value: 0 };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">순위 히스토리</h3>
            <p className="text-sm text-gray-500">{keyword}</p>
            <p className="text-xs text-gray-400">
              {actualDateRange.startDate ? formatDate(actualDateRange.startDate) : ''} ~ {actualDateRange.endDate ? formatDate(actualDateRange.endDate) : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">순위 데이터를 불러오는 중...</span>
            </div>
          ) : rankHistory.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              조회된 순위 데이터가 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-10 gap-2 max-h-[500px] overflow-auto">
              {rankHistory.map((item, index) => {
                const change = getRankChange(item.rank, item.prev_rank);
                const dayOfWeek = new Date(item.date).getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                
                return (
                  <div 
                    key={index} 
                    className={`p-2 rounded-md border transition-all hover:shadow-sm ${
                      isWeekend 
                        ? (item.rank 
                           ? 'bg-red-50 border-red-300 hover:bg-red-100' 
                           : 'bg-red-50 border-red-200 hover:bg-red-100')
                        : (item.rank 
                           ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' 
                           : 'bg-gray-50 border-gray-200 hover:bg-gray-100')
                    }`}
                  >
                    {/* 날짜 */}
                    <div className="text-[10px] font-medium text-gray-600 mb-1 text-center">
                      <div>{new Date(item.date).getMonth() + 1}.{new Date(item.date).getDate().toString().padStart(2, '0')}</div>
                      <div className="text-[9px] text-gray-400">
                        {['일', '월', '화', '수', '목', '금', '토'][dayOfWeek]}
                      </div>
                    </div>
                    
                    {/* 순위 */}
                    <div className="text-center mb-1">
                      {item.rank ? (
                        <div className="bg-white rounded-full w-8 h-8 mx-auto flex items-center justify-center border border-blue-300">
                          <span className="font-bold text-blue-800 text-xs">{item.rank}</span>
                        </div>
                      ) : (
                        <div className="bg-gray-200 rounded-full w-8 h-8 mx-auto flex items-center justify-center border border-gray-300">
                          <span className="text-gray-500 text-xs">-</span>
                        </div>
                      )}
                    </div>
                    
                    {/* 변화 */}
                    <div className="text-center">
                      {change ? (
                        <span className={`inline-flex items-center px-1 py-0.5 rounded text-[8px] font-bold ${
                          change.type === 'up' 
                            ? 'bg-green-100 text-green-800' 
                            : change.type === 'down' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {change.type === 'up' && `▲${change.value}`}
                          {change.type === 'down' && `▼${change.value}`}
                          {change.type === 'same' && '='}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-[8px]">-</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
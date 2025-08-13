import { useState } from 'react';

export function RankingPage() {
  const [activeTab, setActiveTab] = useState<'keywords' | 'advertisers'>('keywords');

  // Mock 키워드 성과 데이터
  const keywordRankings = [
    { 
      rank: 1, 
      keyword: '마케팅 자동화', 
      category: '마케팅',
      searchVolume: 12500,
      competition: 'high',
      impressions: 45000, 
      clicks: 3200, 
      ctr: 7.11,
      cpc: 850,
      conversions: 124,
      cvr: 3.88,
      spend: 2720000
    },
    { 
      rank: 2, 
      keyword: '디지털 마케팅', 
      category: '마케팅',
      searchVolume: 18900,
      competition: 'high',
      impressions: 38000, 
      clicks: 2800, 
      ctr: 7.37,
      cpc: 780,
      conversions: 98,
      cvr: 3.50,
      spend: 2184000
    },
    { 
      rank: 3, 
      keyword: 'SNS 광고', 
      category: '광고',
      searchVolume: 9800,
      competition: 'medium',
      impressions: 32000, 
      clicks: 2100, 
      ctr: 6.56,
      cpc: 620,
      conversions: 85,
      cvr: 4.05,
      spend: 1302000
    },
    { 
      rank: 4, 
      keyword: 'SEO 최적화', 
      category: 'SEO',
      searchVolume: 7600,
      competition: 'medium',
      impressions: 28000, 
      clicks: 1800, 
      ctr: 6.43,
      cpc: 550,
      conversions: 72,
      cvr: 4.00,
      spend: 990000
    },
    { 
      rank: 5, 
      keyword: '콘텐츠 마케팅', 
      category: '마케팅',
      searchVolume: 6200,
      competition: 'low',
      impressions: 22000, 
      clicks: 1500, 
      ctr: 6.82,
      cpc: 480,
      conversions: 58,
      cvr: 3.87,
      spend: 720000
    }
  ];

  // Mock 광고주 성과 데이터
  const advertiserRankings = [
    {
      rank: 1,
      advertiser: '삼성전자',
      campaigns: 12,
      totalImpressions: 2500000,
      totalClicks: 180000,
      avgCtr: 7.20,
      totalSpend: 85000000,
      totalConversions: 4200,
      roi: 156.8
    },
    {
      rank: 2,
      advertiser: 'LG전자',
      campaigns: 8,
      totalImpressions: 1800000,
      totalClicks: 125000,
      avgCtr: 6.94,
      totalSpend: 62000000,
      totalConversions: 3100,
      roi: 142.3
    },
    {
      rank: 3,
      advertiser: '현대자동차',
      campaigns: 10,
      totalImpressions: 1600000,
      totalClicks: 98000,
      avgCtr: 6.13,
      totalSpend: 54000000,
      totalConversions: 2800,
      roi: 138.5
    },
    {
      rank: 4,
      advertiser: 'SK텔레콤',
      campaigns: 6,
      totalImpressions: 1200000,
      totalClicks: 78000,
      avgCtr: 6.50,
      totalSpend: 42000000,
      totalConversions: 2200,
      roi: 125.4
    },
    {
      rank: 5,
      advertiser: '카카오',
      campaigns: 15,
      totalImpressions: 980000,
      totalClicks: 68000,
      avgCtr: 6.94,
      totalSpend: 38000000,
      totalConversions: 1900,
      roi: 118.7
    }
  ];

  const getCompetitionBadge = (level: string) => {
    const styles = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[level as keyof typeof styles]}`}>
        {level === 'low' ? '낮음' : level === 'medium' ? '중간' : '높음'}
      </span>
    );
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">성과 순위</h1>

      {/* 탭 메뉴 */}
      <div className="border-b mb-6">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('keywords')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'keywords'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            키워드 순위
          </button>
          <button
            onClick={() => setActiveTab('advertisers')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'advertisers'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            광고주 순위
          </button>
        </div>
      </div>

      {/* 키워드 순위 */}
      {activeTab === 'keywords' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">순위</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">키워드</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">카테고리</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">검색량</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">경쟁도</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CTR</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CPC</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">전환율</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">지출</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {keywordRankings.map((item) => (
                <tr key={item.rank} className={item.rank <= 3 ? 'bg-yellow-50' : ''}>
                  <td className="px-6 py-4 text-sm font-medium">
                    {item.rank <= 3 ? (
                      <span className="text-yellow-600 font-bold">{item.rank}위</span>
                    ) : (
                      `${item.rank}위`
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">{item.keyword}</td>
                  <td className="px-6 py-4 text-sm">{item.category}</td>
                  <td className="px-6 py-4 text-sm">{item.searchVolume.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm">{getCompetitionBadge(item.competition)}</td>
                  <td className="px-6 py-4 text-sm font-medium text-blue-600">{item.ctr}%</td>
                  <td className="px-6 py-4 text-sm">{item.cpc.toLocaleString()}원</td>
                  <td className="px-6 py-4 text-sm font-medium text-green-600">{item.cvr}%</td>
                  <td className="px-6 py-4 text-sm font-medium">{item.spend.toLocaleString()}원</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 광고주 순위 */}
      {activeTab === 'advertisers' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">순위</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">광고주</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">캠페인</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">노출수</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">클릭수</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">평균 CTR</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">전환수</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">총 지출</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {advertiserRankings.map((item) => (
                <tr key={item.rank} className={item.rank <= 3 ? 'bg-yellow-50' : ''}>
                  <td className="px-6 py-4 text-sm font-medium">
                    {item.rank <= 3 ? (
                      <span className="text-yellow-600 font-bold">{item.rank}위</span>
                    ) : (
                      `${item.rank}위`
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">{item.advertiser}</td>
                  <td className="px-6 py-4 text-sm">{item.campaigns}개</td>
                  <td className="px-6 py-4 text-sm">{item.totalImpressions.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm">{item.totalClicks.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm font-medium text-blue-600">{item.avgCtr}%</td>
                  <td className="px-6 py-4 text-sm">{item.totalConversions.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm font-medium">{item.totalSpend.toLocaleString()}원</td>
                  <td className="px-6 py-4 text-sm font-medium text-green-600">{item.roi}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
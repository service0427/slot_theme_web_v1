import { useState, useEffect } from 'react';
import { useCashContext } from '@/adapters/react';

interface BaseCashHistoryPageProps {
  className?: string;
  titleClassName?: string;
  tabsClassName?: string;
  tabClassName?: string;
  activeTabClassName?: string;
  inactiveTabClassName?: string;
  tableClassName?: string;
  tableHeaderClassName?: string;
  loadingClassName?: string;
}

export function BaseCashHistoryPage({
  className = "p-6",
  titleClassName = "text-2xl font-bold mb-6",
  tabsClassName = "border-b mb-6",
  tabClassName = "px-6 py-3 font-medium transition-colors",
  activeTabClassName = "text-blue-600 border-b-2 border-blue-600",
  inactiveTabClassName = "text-gray-600 hover:text-gray-900",
  tableClassName = "bg-white rounded-lg shadow overflow-hidden",
  tableHeaderClassName = "bg-gray-50",
  loadingClassName = "text-center py-8"
}: BaseCashHistoryPageProps) {
  const { chargeRequests, cashHistory, loadChargeRequests, loadCashHistory, isLoading } = useCashContext();
  const [activeTab, setActiveTab] = useState<'charge' | 'history'>('charge');

  useEffect(() => {
    loadChargeRequests();
    loadCashHistory();
  }, []);

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };

    const labels = {
      pending: '대기중',
      approved: '승인',
      rejected: '거부',
      cancelled: '취소',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      charge: '충전',
      purchase: '구매',
      refund: '환불',
      withdrawal: '출금',
      bonus: '보너스',
      expire: '만료',
    };
    return labels[type] || type;
  };

  return (
    <div className={className}>
      <h1 className={titleClassName}>캐시 내역</h1>

      <div className={tabsClassName}>
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('charge')}
            className={`${tabClassName} ${
              activeTab === 'charge' ? activeTabClassName : inactiveTabClassName
            }`}
          >
            충전 내역
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`${tabClassName} ${
              activeTab === 'history' ? activeTabClassName : inactiveTabClassName
            }`}
          >
            사용 내역
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className={loadingClassName}>로딩 중...</div>
      ) : (
        <>
          {activeTab === 'charge' && (
            <div className={tableClassName}>
              <table className="w-full">
                <thead className={tableHeaderClassName}>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      요청일시
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      충전금액
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      보너스
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      입금자명
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      상태
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {chargeRequests.map((request) => (
                    <tr key={request.id}>
                      <td className="px-6 py-4 text-sm">
                        {new Date(request.requestedAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        {request.amount.toLocaleString()}원
                      </td>
                      <td className="px-6 py-4 text-sm text-blue-600">
                        +{request.bonusAmount.toLocaleString()}원
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {request.accountHolder}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(request.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'history' && (
            <div className={tableClassName}>
              <table className="w-full">
                <thead className={tableHeaderClassName}>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      일시
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      유형
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      금액
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      설명
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {cashHistory.map((history) => (
                    <tr key={history.id}>
                      <td className="px-6 py-4 text-sm">
                        {new Date(history.transactionAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`font-medium ${
                          history.type === 'charge' || history.type === 'refund'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                          {getTransactionTypeLabel(history.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <span className={
                          history.type === 'charge' || history.type === 'refund'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }>
                          {history.type === 'charge' || history.type === 'refund' ? '+' : '-'}
                          {Math.abs(history.amount).toLocaleString()}원
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {history.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
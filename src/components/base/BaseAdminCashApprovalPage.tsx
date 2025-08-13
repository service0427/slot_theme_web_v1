import React, { useState, useEffect } from 'react';
import { useCashContext } from '@/adapters/react/hooks/useCashContext';
import { CashCharge } from '@/core/models/CashCharge';

interface AdminCashApprovalThemeProps {
  containerClass?: string;
  headerClass?: string;
  titleClass?: string;
  subtitleClass?: string;
  loadingClass?: string;
  emptyStateClass?: string;
  tableContainerClass?: string;
  tableClass?: string;
  tableHeaderClass?: string;
  tableRowClass?: string;
  approveButtonClass?: string;
  rejectButtonClass?: string;
}

interface BaseAdminCashApprovalPageProps {
  theme?: AdminCashApprovalThemeProps;
}

export const BaseAdminCashApprovalPage: React.FC<BaseAdminCashApprovalPageProps> = ({
  theme = {}
}) => {
  const { loadPendingCharges, approveCashCharge, rejectCashCharge } = useCashContext();
  const [pendingCharges, setPendingCharges] = useState<CashCharge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 기본 스타일
  const defaultTheme: AdminCashApprovalThemeProps = {
    containerClass: 'p-6',
    headerClass: 'mb-6',
    titleClass: 'text-2xl font-bold mb-2',
    subtitleClass: 'text-gray-600',
    loadingClass: 'p-6',
    emptyStateClass: 'bg-gray-50 rounded-lg p-8 text-center',
    tableContainerClass: 'bg-white rounded-lg shadow overflow-hidden',
    tableClass: 'w-full',
    tableHeaderClass: 'bg-gray-50',
    tableRowClass: 'hover:bg-gray-50',
    approveButtonClass: 'px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700',
    rejectButtonClass: 'px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700'
  };

  // 테마 병합
  const mergedTheme = { ...defaultTheme, ...theme };

  useEffect(() => {
    loadPendingCharges().then(charges => {
      setPendingCharges(charges);
      setIsLoading(false);
    });
  }, []);

  const handleApprove = async (chargeId: string) => {
    const success = await approveCashCharge(chargeId);
    if (success) {
      setPendingCharges(prev => prev.filter(c => c.id !== chargeId));
    }
  };

  const handleReject = async (chargeId: string) => {
    const success = await rejectCashCharge(chargeId);
    if (success) {
      setPendingCharges(prev => prev.filter(c => c.id !== chargeId));
    }
  };

  if (isLoading) {
    return <div className={mergedTheme.loadingClass}>로딩 중...</div>;
  }

  return (
    <div className={mergedTheme.containerClass}>
      <div className={mergedTheme.headerClass}>
        <h1 className={mergedTheme.titleClass}>캐시 충전 승인 관리</h1>
        <p className={mergedTheme.subtitleClass}>
          승인 대기 중인 충전: {pendingCharges.length}건
        </p>
      </div>

      {pendingCharges.length === 0 ? (
        <div className={mergedTheme.emptyStateClass}>
          <p className="text-gray-600">승인 대기 중인 충전 요청이 없습니다.</p>
        </div>
      ) : (
        <div className={mergedTheme.tableContainerClass}>
          <table className={mergedTheme.tableClass}>
            <thead className={mergedTheme.tableHeaderClass}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">신청일</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">사용자</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">충전 금액</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">입금일시</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">입금자명</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pendingCharges.map(charge => (
                <tr key={charge.id} className={mergedTheme.tableRowClass}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(charge.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    User #{charge.userId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {charge.amount.toLocaleString()}원
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {charge.depositAt ? new Date(charge.depositAt).toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {charge.accountHolder || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(charge.id)}
                        className={mergedTheme.approveButtonClass}
                      >
                        승인
                      </button>
                      <button
                        onClick={() => handleReject(charge.id)}
                        className={mergedTheme.rejectButtonClass}
                      >
                        거부
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
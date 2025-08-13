import { useState, useCallback, useMemo } from 'react';
import { useSlotContext } from '@/adapters/react/hooks/useSlotContext';
import { useCashContext } from '@/adapters/react';
import { useConfig } from '@/contexts/ConfigContext';
import { BaseSpreadsheetGrid } from './BaseSpreadsheetGrid';
import { SpreadsheetFieldMapper } from '@/core/utils/SpreadsheetFieldMapper';
import { SpreadsheetValidationError } from '@/core/components/SpreadsheetGrid';

interface BaseSlotBulkRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BaseSlotBulkRegistrationModal({ isOpen, onClose, onSuccess }: BaseSlotBulkRegistrationModalProps) {
  const { config } = useConfig();
  const { slotPrice, createSlot } = useSlotContext();
  const cashContext = config.useCashSystem ? useCashContext() : null;
  const balance = cashContext?.balance;

  // 스프레드시트 상태
  const [spreadsheetData, setSpreadsheetData] = useState<string[][]>([]);
  const [validationErrors, setValidationErrors] = useState<SpreadsheetValidationError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResults, setSubmitResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  // ConfigContext의 slotFields를 스프레드시트 컬럼으로 변환 (메모화)
  const columns = useMemo(() => 
    SpreadsheetFieldMapper.mapSlotFieldsToColumns(config.slotFields),
    [config.slotFields]
  );

  // 스프레드시트 데이터 변경 처리
  const handleDataChange = useCallback((data: string[][]) => {
    setSpreadsheetData(data);
    setSubmitResults(null); // 데이터 변경 시 결과 초기화
  }, []);

  // 검증 오류 처리 (메모화)
  const handleValidationError = useCallback((errors: SpreadsheetValidationError[]) => {
    setValidationErrors(errors);
  }, []);

  // 엑셀 업로드 처리
  const handleExcelUpload = useCallback((data: string[][]) => {
    setSpreadsheetData(data);
    setSubmitResults(null);
  }, []);

  // 유효한 행 개수 계산
  const getValidRowCount = useCallback(() => {
    return spreadsheetData.filter(row => 
      row.some(cell => cell && cell.trim() !== '')
    ).length;
  }, [spreadsheetData]);

  // 총 비용 계산
  const getTotalCost = useCallback(() => {
    if (!config.useCashSystem) return 0;
    return getValidRowCount() * slotPrice;
  }, [config.useCashSystem, getValidRowCount, slotPrice]);

  // 잔액 충분 여부 확인
  const hasEnoughBalance = useCallback(() => {
    if (!config.useCashSystem) return true;
    if (!balance) return false;
    return balance.amount >= getTotalCost();
  }, [config.useCashSystem, balance, getTotalCost]);

  // 슬롯 일괄 등록 처리
  const handleBulkSubmit = useCallback(async () => {
    if (validationErrors.length > 0) {
      alert('입력 오류를 먼저 수정해주세요.');
      return;
    }

    const validRows = spreadsheetData.filter(row => 
      row.some(cell => cell && cell.trim() !== '')
    );

    if (validRows.length === 0) {
      alert('등록할 슬롯 데이터를 입력해주세요.');
      return;
    }

    if (config.useCashSystem && !hasEnoughBalance()) {
      alert(`잔액이 부족합니다. 필요 금액: ${getTotalCost().toLocaleString()}원, 현재 잔액: ${balance?.amount.toLocaleString() || 0}원`);
      return;
    }

    const confirmMessage = config.useCashSystem 
      ? `${validRows.length}개의 슬롯을 등록하시겠습니까?\n총 비용: ${getTotalCost().toLocaleString()}원`
      : `${validRows.length}개의 슬롯을 등록 신청하시겠습니까?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsSubmitting(true);
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      // 각 행을 개별 슬롯으로 등록
      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        const customFields = SpreadsheetFieldMapper.mapSpreadsheetRowToCustomFields(row, columns);
        
        try {
          const success = await createSlot({ customFields });
          if (success) {
            results.success++;
          } else {
            results.failed++;
            results.errors.push(`행 ${i + 1}: 등록 실패`);
          }
        } catch (error) {
          results.failed++;
          results.errors.push(`행 ${i + 1}: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        }

        // 진행률 표시를 위한 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setSubmitResults(results);

      if (results.success > 0) {
        const message = results.failed > 0 
          ? `${results.success}개 성공, ${results.failed}개 실패`
          : `${results.success}개 슬롯이 성공적으로 등록되었습니다.`;
        
        alert(message);

        if (results.failed === 0) {
          // 모두 성공했으면 모달 닫고 성공 콜백 실행
          onClose();
          onSuccess?.();
        }
      } else {
        alert('모든 슬롯 등록이 실패했습니다.');
      }
    } catch (error) {
      console.error('Bulk registration error:', error);
      alert('일괄 등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    validationErrors,
    spreadsheetData,
    columns,
    config.useCashSystem,
    hasEnoughBalance,
    getTotalCost,
    balance,
    createSlot,
    onClose,
    onSuccess
  ]);

  const validRowCount = getValidRowCount();
  const totalCost = getTotalCost();

  if (!isOpen) return null;

  return (
    <>
      {/* 모달 배경 */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* 모달 컨텐츠 */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-[98vh] overflow-hidden flex flex-col">
          {/* 헤더 */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <h2 className="text-xl font-bold">슬롯 대량 등록</h2>
                <p className="text-gray-600 text-sm">
                  여러 개의 슬롯을 한 번에 등록할 수 있습니다.
                </p>
                {/* 정보 카드들을 헤더로 이동 */}
                <div className="flex gap-2 ml-auto">
                  <div className="bg-blue-50 border border-blue-200 rounded px-2 py-1 text-center">
                    <div className="text-blue-800 font-medium text-xs">등록 예정</div>
                    <div className="text-sm font-bold text-blue-900">{validRowCount}개</div>
                  </div>
                  
                  {config.useCashSystem && (
                    <>
                      <div className="bg-green-50 border border-green-200 rounded px-2 py-1 text-center">
                        <div className="text-green-800 font-medium text-xs">현재 잔액</div>
                        <div className="text-sm font-bold text-green-900">
                          {balance?.amount.toLocaleString() || 0}원
                        </div>
                      </div>

                      <div className={`border rounded px-2 py-1 text-center ${
                        hasEnoughBalance() ? 'bg-purple-50 border-purple-200' : 'bg-red-50 border-red-200'
                      }`}>
                        <div className={`font-medium text-xs ${
                          hasEnoughBalance() ? 'text-purple-800' : 'text-red-800'
                        }`}>
                          필요 금액
                        </div>
                        <div className={`text-sm font-bold ${
                          hasEnoughBalance() ? 'text-purple-900' : 'text-red-900'
                        }`}>
                          {totalCost.toLocaleString()}원
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl ml-4"
              >
                ×
              </button>
            </div>
          </div>

          {/* 본문 (스크롤 가능) */}
          <div className="flex-1 overflow-y-auto p-3">
            {/* 스프레드시트 */}
            <BaseSpreadsheetGrid
              noWrapper={true}
              title={
                <p className="text-gray-600 text-sm">각 행이 하나의 슬롯이 됩니다. 필수 항목은 반드시 입력해주세요.</p>
              }
              columns={columns}
              initialData={spreadsheetData}
              onChange={handleDataChange}
              onExcelUpload={handleExcelUpload}
              onValidationError={handleValidationError}
              config={{
                minRows: 5,
                enableExcelUpload: false,
                enableExcelDownload: false,
                enableKeyboardNavigation: true,
                enableCopyPaste: true,
                showRowNumbers: true,
                showAddRowButton: true,
                showDeleteRowButton: true,
                readOnly: isSubmitting
              }}
            />

            {/* 제출 결과 */}
            {submitResults && (
              <div className="mt-3 p-2 bg-gray-50 border border-gray-200 rounded">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold">등록 결과</h3>
                  <div className="flex gap-4">
                    <span className="text-sm">
                      <span className="font-bold text-green-700">{submitResults.success}</span> 성공
                    </span>
                    <span className="text-sm">
                      <span className="font-bold text-red-700">{submitResults.failed}</span> 실패
                    </span>
                  </div>
                </div>
                
                {submitResults.errors.length > 0 && (
                  <div>
                    <div className="font-medium text-red-800 mb-2">오류 상세:</div>
                    <ul className="text-sm text-red-700 space-y-1">
                      {submitResults.errors.slice(0, 10).map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                      {submitResults.errors.length > 10 && (
                        <li className="text-red-600">... 외 {submitResults.errors.length - 10}개</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* 도움말 - 더 컴팩트하게 */}
            <div className="mt-3 px-2 py-1.5 bg-blue-50 border border-blue-200 rounded text-xs">
              <div className="flex items-center gap-3 text-blue-800">
                <span className="font-medium">💡</span>
                <span>Ctrl+C/V: 복사/붙여넣기</span>
                <span>|</span>
                <span>화살표키: 이동</span>
                <span>|</span>
                <span>빨간점: 입력오류</span>
                <span>|</span>
                <span>빈 행: 제외됨</span>
              </div>
            </div>
          </div>

          {/* 푸터 */}
          <div className="px-4 py-2 border-t border-gray-200">
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50"
                disabled={isSubmitting}
              >
                취소
              </button>
              
              <button
                onClick={handleBulkSubmit}
                disabled={isSubmitting || validRowCount === 0 || validationErrors.length > 0 || (config.useCashSystem && !hasEnoughBalance())}
                className={`px-6 py-2 rounded font-medium ${
                  isSubmitting || validRowCount === 0 || validationErrors.length > 0 || (config.useCashSystem && !hasEnoughBalance())
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : config.useCashSystem
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    등록 중...
                  </div>
                ) : config.useCashSystem ? (
                  `${validRowCount}개 슬롯 등록 (${totalCost.toLocaleString()}원)`
                ) : (
                  `${validRowCount}개 슬롯 신청`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
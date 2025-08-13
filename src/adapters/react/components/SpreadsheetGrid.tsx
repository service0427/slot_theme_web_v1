import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  SpreadsheetProps,
  SpreadsheetCell,
  SpreadsheetRange,
  SpreadsheetDataProcessor,
  DEFAULT_SPREADSHEET_CONFIG,
  SpreadsheetValidationError
} from '@/core/components/SpreadsheetGrid';
import { MockSpreadsheetService } from '@/core/services/SpreadsheetService';

interface ReactSpreadsheetGridProps extends SpreadsheetProps {
  className?: string;
}

export const ReactSpreadsheetGrid: React.FC<ReactSpreadsheetGridProps> = ({
  columns,
  initialData = [],
  config = {},
  onChange,
  onCellChange,
  onRowAdd,
  onRowDelete,
  onExcelUpload,
  onValidationError,
  className = ''
}) => {
  const finalConfig = { ...DEFAULT_SPREADSHEET_CONFIG, ...config };
  const spreadsheetService = new MockSpreadsheetService();
  
  // 상태 관리
  const [data, setData] = useState<string[][]>(() => 
    SpreadsheetDataProcessor.initializeData(initialData, columns, finalConfig.minRows)
  );
  const [selectedCell, setSelectedCell] = useState<SpreadsheetCell | null>(null);
  const [selectedRange, setSelectedRange] = useState<SpreadsheetRange | null>(null);
  const [editingCell, setEditingCell] = useState<SpreadsheetCell | null>(null);
  const [editValue, setEditValue] = useState('');
  const [, setIsComposing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<SpreadsheetValidationError[]>([]);
  
  // 참조
  const gridRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 데이터 변경 시 검증
  useEffect(() => {
    const errors = SpreadsheetDataProcessor.validateData(data, columns);
    setValidationErrors(errors);
    if (onValidationError) {
      onValidationError(errors);
    }
  }, [data, columns]);

  // 초기 데이터 변경 시 업데이트
  useEffect(() => {
    if (initialData.length > 0) {
      setData(SpreadsheetDataProcessor.initializeData(initialData, columns, finalConfig.minRows));
    }
  }, [initialData, columns]);

  // 컬럼 수 변경 시 데이터 조정
  useEffect(() => {
    setData(prevData => {
      return prevData.map(row => {
        const newRow = [...row];
        while (newRow.length < columns.length) {
          newRow.push('');
        }
        if (newRow.length > columns.length) {
          newRow.length = columns.length;
        }
        return newRow;
      });
    });
  }, [columns.length]);

  // 셀 선택 (포커스 관리 개선)
  const selectCell = useCallback((row: number, col: number) => {
    setSelectedCell({ row, col, value: data[row]?.[col] || '' });
    setSelectedRange(null);
    setEditingCell(null);
    
    // 선택된 셀에 포커스 주기 (group-mk 방식)
    setTimeout(() => {
      const rowOffset = finalConfig.showRowNumbers ? 1 : 0;
      const cell = gridRef.current?.querySelector(
        `tbody tr:nth-child(${row + 1}) td:nth-child(${col + 1 + rowOffset})`
      ) as HTMLElement;
      cell?.focus();
    }, 0);
  }, [data, finalConfig.showRowNumbers]);

  // 편집 시작
  const startEditing = useCallback((row: number, col: number) => {
    if (finalConfig.readOnly) return;
    
    const currentValue = data[row]?.[col] || '';
    setEditingCell({ row, col, value: currentValue });
    setEditValue(currentValue);
    setSelectedCell({ row, col, value: currentValue });
  }, [data, finalConfig.readOnly]);

  // 편집 완료
  const finishEditing = useCallback((save: boolean = true) => {
    if (!editingCell) return;

    if (save) {
      const newValue = editValue;
      const oldValue = data[editingCell.row]?.[editingCell.col] || '';
      
      if (newValue !== oldValue) {
        const newData = SpreadsheetDataProcessor.updateCell(
          data, 
          editingCell.row, 
          editingCell.col, 
          newValue
        );
        setData(newData);
        onChange?.(newData);
        onCellChange?.(editingCell.row, editingCell.col, newValue, oldValue);
      }
    }

    setEditingCell(null);
    setEditValue('');
  }, [editingCell, editValue, data, onChange, onCellChange]);

  // 키보드 이벤트 처리 (group-mk 방식 적용)
  const handleKeyDown = useCallback((
    e: React.KeyboardEvent, 
    row: number, 
    col: number
  ) => {
    if (!finalConfig.enableKeyboardNavigation) return;

    if (editingCell) {
      switch (e.key) {
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          
          // Tab 키인 경우 다음 셀로 이동할 위치 미리 계산
          let nextRow = row;
          let nextCol = col;
          
          if (e.key === 'Tab') {
            if (e.shiftKey) {
              nextCol = col - 1;
              if (nextCol < 0) {
                // 첫 번째 열에서 Shift+Tab이면 이전 행의 마지막 열로
                if (row > 0) {
                  nextRow = row - 1;
                  nextCol = columns.length - 1;
                }
              }
            } else {
              nextCol = col + 1;
              if (nextCol >= columns.length) {
                // 마지막 열에서 Tab이면 다음 행의 첫 번째 열로
                if (row < data.length - 1) {
                  nextRow = row + 1;
                  nextCol = 0;
                } else {
                  // 마지막 행이면 새 행 추가
                  addRow();
                  nextRow = row + 1;
                  nextCol = 0;
                }
              }
            }
          } else if (e.key === 'Enter') {
            // Enter는 아래 행 같은 열로
            if (row < data.length - 1) {
              nextRow = row + 1;
            }
          }
          
          finishEditing(true);
          // 다음 셀로 이동
          setTimeout(() => {
            selectCell(nextRow, nextCol);
          }, 10);
          break;
        case 'Escape':
          e.preventDefault();
          finishEditing(false);
          break;
      }
      return;
    }

    // 편집 중이 아닐 때
    switch (e.key) {
      case 'Enter':
      case 'F2':
        e.preventDefault();
        startEditing(row, col);
        break;
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        if (!finalConfig.readOnly) {
          const newData = SpreadsheetDataProcessor.updateCell(data, row, col, '');
          setData(newData);
          onChange?.(newData);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (row > 0) {
          selectCell(row - 1, col);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (row < data.length - 1) {
          selectCell(row + 1, col);
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (col > 0) {
          selectCell(row, col - 1);
        } else if (row > 0) {
          // 첫 번째 열에서 왼쪽 화살표를 누르면 이전 행의 마지막 열로
          selectCell(row - 1, columns.length - 1);
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (col < columns.length - 1) {
          selectCell(row, col + 1);
        } else if (row < data.length - 1) {
          // 마지막 열에서 오른쪽 화살표를 누르면 다음 행의 첫 번째 열로
          selectCell(row + 1, 0);
        }
        break;
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          if (col > 0) {
            selectCell(row, col - 1);
          } else if (row > 0) {
            // 첫 번째 열에서 Shift+Tab이면 이전 행의 마지막 열로
            selectCell(row - 1, columns.length - 1);
          }
        } else {
          if (col < columns.length - 1) {
            selectCell(row, col + 1);
          } else if (row < data.length - 1) {
            // 마지막 열에서 Tab이면 다음 행의 첫 번째 열로
            selectCell(row + 1, 0);
          } else {
            // 마지막 행의 마지막 열에서 Tab이면 새 행 추가
            addRow();
            setTimeout(() => selectCell(row + 1, 0), 50);
          }
        }
        break;
      default:
        // 한글 입력 감지
        const isKoreanChar = /^[ㄱ-ㅎㅏ-ㅣ가-힣]$/.test(e.key);
        
        // 일반 키 입력 시 편집 모드로 전환
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey && !finalConfig.readOnly && 
            columns[col].type !== 'file' && columns[col].type !== 'dropdown' && e.key !== 'Process') {
          
          if (isKoreanChar) {
            // 한글 문자는 편집 모드만 시작
            startEditing(row, col);
          } else {
            // 영문/숫자는 편집 모드 시작하고 해당 문자 입력
            e.preventDefault();
            startEditing(row, col);
            setEditValue(e.key);
          }
        }
        break;
    }
  }, [editingCell, finishEditing, selectCell, startEditing, data, columns, finalConfig, onChange]);

  // 붙여넣기 처리
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (!finalConfig.enableCopyPaste || finalConfig.readOnly) return;
    
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const pastedRows = SpreadsheetDataProcessor.parsePasteData(pastedText);
    
    if (selectedCell) {
      const newData = [...data];
      const startRow = selectedCell.row;
      const startCol = selectedCell.col;
      
      pastedRows.forEach((row, rowIndex) => {
        row.forEach((value, colIndex) => {
          const targetRow = startRow + rowIndex;
          const targetCol = startCol + colIndex;
          
          // 범위 내에서만 붙여넣기
          if (targetRow < newData.length && targetCol < columns.length) {
            newData[targetRow][targetCol] = value;
          } else if (targetRow >= newData.length && targetCol < columns.length) {
            // 행이 부족하면 추가
            while (newData.length <= targetRow) {
              newData.push(Array(columns.length).fill(''));
            }
            newData[targetRow][targetCol] = value;
          }
        });
      });
      
      setData(newData);
      onChange?.(newData);
    }
  }, [selectedCell, data, columns.length, finalConfig, onChange]);

  // 복사 처리
  const handleCopy = useCallback((e: React.ClipboardEvent) => {
    if (!finalConfig.enableCopyPaste) return;
    
    if (selectedRange) {
      e.preventDefault();
      const copyText = SpreadsheetDataProcessor.formatCopyData(data, selectedRange);
      e.clipboardData.setData('text/plain', copyText);
    } else if (selectedCell) {
      e.preventDefault();
      e.clipboardData.setData('text/plain', data[selectedCell.row][selectedCell.col]);
    }
  }, [selectedRange, selectedCell, data, finalConfig]);

  // 행 추가
  const addRow = useCallback(() => {
    if (finalConfig.readOnly) return;
    
    const newData = SpreadsheetDataProcessor.addRow(data, columns);
    setData(newData);
    onChange?.(newData);
    onRowAdd?.(newData.length - 1, newData[newData.length - 1]);
  }, [data, columns, finalConfig.readOnly, onChange, onRowAdd]);

  // 행 삭제
  const deleteRow = useCallback((rowIndex: number) => {
    if (finalConfig.readOnly) return;
    
    const rowData = data[rowIndex];
    const newData = SpreadsheetDataProcessor.deleteRow(data, rowIndex, finalConfig.minRows);
    setData(newData);
    onChange?.(newData);
    onRowDelete?.(rowIndex, rowData);
  }, [data, finalConfig.readOnly, finalConfig.minRows, onChange, onRowDelete]);

  // 엑셀 업로드 처리
  const handleExcelUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await spreadsheetService.importFromExcel(file);
    if (result.success && result.data) {
      setData(result.data);
      onChange?.(result.data);
      onExcelUpload?.(result.data);
    } else {
      alert(result.error || '엑셀 업로드 중 오류가 발생했습니다.');
    }

    // 파일 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [spreadsheetService, onChange, onExcelUpload]);

  // 엑셀 다운로드
  const handleExcelDownload = useCallback(() => {
    spreadsheetService.exportToExcel(data, columns);
  }, [data, columns, spreadsheetService]);

  // 샘플 엑셀 다운로드
  const handleSampleDownload = useCallback(() => {
    spreadsheetService.generateSampleExcel(columns);
  }, [columns, spreadsheetService]);

  // 셀 에러 확인
  const getCellError = useCallback((row: number, col: number): string | null => {
    const error = validationErrors.find(e => e.row === row && e.col === col);
    return error ? error.message : null;
  }, [validationErrors]);

  return (
    <div className={`spreadsheet-grid ${className}`}>
      {/* 툴바 */}
      {(finalConfig.enableExcelUpload || finalConfig.enableExcelDownload) && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {finalConfig.enableExcelUpload && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 text-sm bg-green-600 text-white hover:bg-green-700 rounded transition-colors"
              >
                엑셀 업로드
              </button>
            </>
          )}
          {finalConfig.enableExcelDownload && (
            <>
              <button
                onClick={handleExcelDownload}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors"
              >
                엑셀 다운로드
              </button>
              <button
                onClick={handleSampleDownload}
                className="px-3 py-1.5 text-sm bg-gray-600 text-white hover:bg-gray-700 rounded transition-colors"
              >
                샘플 다운로드
              </button>
            </>
          )}
        </div>
      )}

      {/* 스프레드시트 그리드 */}
      <div 
        ref={gridRef}
        className="inline-block min-w-full overflow-auto border border-gray-300 rounded"
        onPaste={handlePaste}
        onCopy={handleCopy}
      >
        <table className="border-collapse w-full">
          <thead>
            <tr>
              {finalConfig.showRowNumbers && (
                <th className="sticky left-0 z-20 bg-gray-100 border-r border-b border-gray-300 w-12 h-9 text-center text-xs font-medium text-gray-600">
                  #
                </th>
              )}
              {columns.map((col) => (
                <th 
                  key={col.id} 
                  className="bg-gray-100 border-r border-b border-gray-300 px-3 py-2 text-center text-xs font-medium text-gray-700 min-w-[120px]"
                  style={{ width: col.width }}
                >
                  {col.name}
                  {col.required && <span className="text-red-500 ml-1">*</span>}
                </th>
              ))}
              {finalConfig.showDeleteRowButton && (
                <th className="bg-gray-100 border-b border-gray-300 w-16"></th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50 group">
                {finalConfig.showRowNumbers && (
                  <td className="sticky left-0 z-10 bg-gray-50 border-r border-b border-gray-300 w-12 h-8 text-center text-xs font-medium text-gray-600">
                    {rowIndex + 1}
                  </td>
                )}
                {row.map((cell, colIndex) => {
                  const column = columns[colIndex];
                  const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
                  const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex;
                  const hasError = getCellError(rowIndex, colIndex);
                  
                  return (
                    <td
                      key={colIndex}
                      className={`
                        border-r border-b border-gray-300 p-0 relative h-8 outline-none cursor-pointer
                        ${isSelected && !isEditing ? 'ring-2 ring-blue-500 ring-inset bg-blue-50' : ''}
                        ${isEditing ? 'z-30' : ''}
                        ${hasError ? 'bg-red-50 border-red-300' : ''}
                        hover:bg-gray-100
                      `}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        selectCell(rowIndex, colIndex);
                      }}
                      onDoubleClick={() => {
                        if (column.type !== 'file') {
                          startEditing(rowIndex, colIndex);
                        }
                      }}
                      onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                      tabIndex={0}
                      title={hasError || undefined}
                    >
                      {isEditing ? (
                        column.type === 'dropdown' && column.options ? (
                          <select
                            ref={inputRef as any}
                            value={editValue}
                            onChange={(e) => {
                              setEditValue(e.target.value);
                              finishEditing(true);
                            }}
                            className="w-full h-full px-2 border-2 border-green-500 outline-none bg-white text-sm"
                            autoFocus
                          >
                            <option value="">선택하세요</option>
                            {column.options.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        ) : column.type === 'textarea' ? (
                          <textarea
                            ref={inputRef as any}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => finishEditing(true)}
                            onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                            className="absolute inset-0 w-full h-full px-2 py-1 border-2 border-green-500 outline-none bg-white text-sm resize-none"
                            autoFocus
                          />
                        ) : (
                          <input
                            ref={inputRef}
                            type={column.type === 'number' ? 'text' : column.type === 'email' ? 'email' : column.type === 'url' ? 'url' : 'text'}
                            value={editValue}
                            onChange={(e) => {
                              if (column.type === 'number') {
                                const value = e.target.value;
                                if (value === '' || /^\d+$/.test(value)) {
                                  setEditValue(value);
                                }
                              } else {
                                setEditValue(e.target.value);
                              }
                            }}
                            onBlur={() => finishEditing(true)}
                            onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                            onCompositionStart={() => setIsComposing(true)}
                            onCompositionEnd={() => setIsComposing(false)}
                            className="absolute inset-0 w-full h-full px-2 border-2 border-green-500 outline-none bg-white text-sm"
                            autoFocus
                            placeholder={column.placeholder}
                          />
                        )
                      ) : (
                        <div className="h-8 px-2 text-sm flex items-center">
                          {column.type === 'file' ? (
                            cell ? (
                              <span className="text-green-600 text-xs">{cell}</span>
                            ) : (
                              <span className="text-gray-400 text-xs">파일 선택</span>
                            )
                          ) : (
                            <span className={cell ? '' : 'text-gray-400'}>
                              {cell || column.placeholder || ''}
                            </span>
                          )}
                        </div>
                      )}
                      {hasError && (
                        <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full transform translate-x-1 -translate-y-1"></div>
                      )}
                    </td>
                  );
                })}
                {finalConfig.showDeleteRowButton && (
                  <td className="border-b border-gray-300 px-2 text-center">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        deleteRow(rowIndex);
                      }}
                      className="text-gray-400 hover:text-red-500 transition-colors text-sm w-6 h-6 flex items-center justify-center"
                      title="행 삭제"
                    >
                      ✕
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 하단 툴바 */}
      {finalConfig.showAddRowButton && (
        <div className="p-2 border-t border-gray-300 bg-gray-50">
          <button
            onClick={addRow}
            className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
          >
            행 추가
          </button>
        </div>
      )}

      {/* 검증 오류 표시 - 데이터가 입력된 경우에만 표시 */}
      {validationErrors.length > 0 && data.some(row => row.some(cell => cell && cell.trim() !== '')) && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
          <div className="font-medium text-red-800 mb-1">입력 오류:</div>
          <ul className="text-red-700 space-y-1">
            {validationErrors.slice(0, 5).map((error, errorIndex) => (
              <li key={errorIndex}>
                행 {error.row + 1}, {columns[error.col]?.name}: {error.message}
              </li>
            ))}
            {validationErrors.length > 5 && (
              <li className="text-red-600">... 외 {validationErrors.length - 5}개</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
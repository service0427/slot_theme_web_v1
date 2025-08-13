// 스프레드시트 그리드의 코어 비즈니스 로직과 타입 정의

export interface SpreadsheetCell {
  row: number;
  col: number;
  value: string;
}

export interface SpreadsheetColumn {
  id: string;
  name: string;
  type: 'text' | 'dropdown' | 'number' | 'file' | 'textarea' | 'url' | 'email';
  options?: string[];
  required?: boolean;
  validation?: SpreadsheetFieldValidation;
  placeholder?: string;
  width?: number;
}

export interface SpreadsheetFieldValidation {
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
}

export interface SpreadsheetRange {
  start: SpreadsheetCell;
  end: SpreadsheetCell;
}

export interface SpreadsheetConfig {
  minRows?: number;
  maxRows?: number;
  readOnly?: boolean;
  showRowNumbers?: boolean;
  showAddRowButton?: boolean;
  showDeleteRowButton?: boolean;
  enableExcelUpload?: boolean;
  enableExcelDownload?: boolean;
  enableKeyboardNavigation?: boolean;
  enableCopyPaste?: boolean;
}

export interface SpreadsheetProps {
  columns: SpreadsheetColumn[];
  initialData?: string[][];
  config?: SpreadsheetConfig;
  onChange?: (data: string[][]) => void;
  onCellChange?: (row: number, col: number, value: string, oldValue: string) => void;
  onRowAdd?: (rowIndex: number, rowData: string[]) => void;
  onRowDelete?: (rowIndex: number, rowData: string[]) => void;
  onExcelUpload?: (data: string[][]) => void;
  onFileUpload?: (file: File, fieldName: string, rowIndex: number) => void;
  onValidationError?: (errors: SpreadsheetValidationError[]) => void;
}

export interface SpreadsheetValidationError {
  row: number;
  col: number;
  message: string;
  value: string;
}

// 스프레드시트 데이터 처리 유틸리티
export class SpreadsheetDataProcessor {
  static validateCell(
    value: string, 
    column: SpreadsheetColumn, 
    row: number, 
    col: number
  ): SpreadsheetValidationError | null {
    // 필수 필드 검증
    if (column.required && (!value || value.trim() === '')) {
      return {
        row,
        col,
        message: `${column.name}은(는) 필수 입력 항목입니다.`,
        value
      };
    }

    // 타입별 검증
    switch (column.type) {
      case 'number':
        if (value && !/^\d+$/.test(value)) {
          return {
            row,
            col,
            message: `${column.name}은(는) 숫자만 입력 가능합니다.`,
            value
          };
        }
        break;
      
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return {
            row,
            col,
            message: `${column.name}은(는) 올바른 이메일 형식이어야 합니다.`,
            value
          };
        }
        break;
      
      case 'url':
        if (value && !/^https?:\/\/.+/.test(value)) {
          return {
            row,
            col,
            message: `${column.name}은(는) 올바른 URL 형식이어야 합니다.`,
            value
          };
        }
        break;
    }

    // 커스텀 검증
    if (column.validation?.custom) {
      const customError = column.validation.custom(value);
      if (customError) {
        return {
          row,
          col,
          message: customError,
          value
        };
      }
    }

    return null;
  }

  static validateData(data: string[][], columns: SpreadsheetColumn[]): SpreadsheetValidationError[] {
    const errors: SpreadsheetValidationError[] = [];
    
    for (let row = 0; row < data.length; row++) {
      // 행에 데이터가 하나라도 입력되어 있는지 확인
      const hasData = data[row].some(cell => cell && cell.trim() !== '');
      
      // 데이터가 입력된 행만 검증
      if (hasData) {
        for (let col = 0; col < columns.length; col++) {
          const value = data[row][col] || '';
          const column = columns[col];
          const error = this.validateCell(value, column, row, col);
          if (error) {
            errors.push(error);
          }
        }
      }
    }
    
    return errors;
  }

  static initializeData(
    initialData: string[][] = [], 
    columns: SpreadsheetColumn[], 
    minRows: number = 10
  ): string[][] {
    const rows = Math.max(initialData.length, minRows);
    const grid = Array(rows).fill(null).map((_, rowIndex) => 
      Array(columns.length).fill(null).map((_, colIndex) => 
        initialData[rowIndex]?.[colIndex] || ''
      )
    );
    return grid;
  }

  static addRow(data: string[][], columns: SpreadsheetColumn[]): string[][] {
    return [...data, Array(columns.length).fill('')];
  }

  static deleteRow(data: string[][], rowIndex: number, minRows: number = 1): string[][] {
    if (data.length <= minRows) return data;
    return data.filter((_, index) => index !== rowIndex);
  }

  static updateCell(data: string[][], row: number, col: number, value: string): string[][] {
    const newData = [...data];
    if (!newData[row]) {
      newData[row] = [];
    }
    newData[row] = [...newData[row]];
    newData[row][col] = value;
    return newData;
  }

  static parsePasteData(pastedText: string): string[][] {
    return pastedText.split('\n').map(row => row.split('\t'));
  }

  static formatCopyData(data: string[][], range: SpreadsheetRange): string {
    const { start, end } = range;
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    
    const copyData: string[][] = [];
    for (let r = minRow; r <= maxRow; r++) {
      const row: string[] = [];
      for (let c = minCol; c <= maxCol; c++) {
        row.push(data[r]?.[c] || '');
      }
      copyData.push(row);
    }
    
    return copyData.map(row => row.join('\t')).join('\n');
  }
}

// 기본 설정
export const DEFAULT_SPREADSHEET_CONFIG: Required<SpreadsheetConfig> = {
  minRows: 10,
  maxRows: 1000,
  readOnly: false,
  showRowNumbers: true,
  showAddRowButton: true,
  showDeleteRowButton: true,
  enableExcelUpload: true,
  enableExcelDownload: true,
  enableKeyboardNavigation: true,
  enableCopyPaste: true,
};
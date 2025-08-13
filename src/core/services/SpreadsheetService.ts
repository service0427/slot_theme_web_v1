import { SpreadsheetColumn } from '../components/SpreadsheetGrid';

export interface ExcelExportResult {
  success: boolean;
  filename?: string;
  error?: string;
}

export interface ExcelUploadResult {
  success: boolean;
  data?: string[][];
  error?: string;
}

export abstract class BaseSpreadsheetService {
  abstract exportToExcel(
    data: string[][], 
    columns: SpreadsheetColumn[],
    filename?: string
  ): Promise<ExcelExportResult>;

  abstract importFromExcel(file: File): Promise<ExcelUploadResult>;

  abstract generateSampleExcel(
    columns: SpreadsheetColumn[],
    filename?: string
  ): Promise<ExcelExportResult>;

  abstract uploadFile(
    file: File,
    fieldName: string,
    rowIndex: number
  ): Promise<{ success: boolean; url?: string; error?: string }>;
}

// Mock implementation for development
export class MockSpreadsheetService extends BaseSpreadsheetService {
  async exportToExcel(
    data: string[][], 
    columns: SpreadsheetColumn[],
    filename: string = 'spreadsheet_data.xlsx'
  ): Promise<ExcelExportResult> {
    try {
      // XLSX 동적 import
      const XLSX = await import('xlsx');
      
      // 파일 타입이 아닌 컬럼만 필터링
      const exportColumns = columns.filter(col => col.type !== 'file');
      
      // 헤더 생성
      const headers = exportColumns.map(col => col.name);
      
      // 데이터 필터링 (파일 컬럼 제외)
      const exportData = data.map(row => 
        exportColumns.map((col) => {
          const originalIndex = columns.findIndex(c => c.id === col.id);
          return row[originalIndex] || '';
        })
      );
      
      // 워크시트 데이터 생성
      const worksheetData = [headers, ...exportData];
      
      // 워크북 생성
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      
      // 파일 다운로드
      XLSX.writeFile(wb, filename);
      
      return {
        success: true,
        filename
      };
    } catch (error) {
      console.error('Excel export error:', error);
      return {
        success: false,
        error: '엑셀 내보내기 중 오류가 발생했습니다.'
      };
    }
  }

  async importFromExcel(file: File): Promise<ExcelUploadResult> {
    try {
      // XLSX 동적 import
      const XLSX = await import('xlsx');
      
      return new Promise((resolve) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // 첫 번째 시트 읽기
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // 시트 데이터를 2차원 배열로 변환
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
              header: 1,
              defval: ''
            }) as string[][];
            
            // 헤더 행 제거 (첫 번째 행)
            const dataRows = jsonData.slice(1);
            
            resolve({
              success: true,
              data: dataRows
            });
          } catch (error) {
            console.error('Excel parsing error:', error);
            resolve({
              success: false,
              error: '엑셀 파일 파싱 중 오류가 발생했습니다.'
            });
          }
        };
        
        reader.onerror = () => {
          resolve({
            success: false,
            error: '파일 읽기 중 오류가 발생했습니다.'
          });
        };
        
        reader.readAsArrayBuffer(file);
      });
    } catch (error) {
      console.error('Excel import error:', error);
      return {
        success: false,
        error: '엑셀 가져오기 중 오류가 발생했습니다.'
      };
    }
  }

  async generateSampleExcel(
    columns: SpreadsheetColumn[],
    filename: string = 'sample_template.xlsx'
  ): Promise<ExcelExportResult> {
    try {
      // XLSX 동적 import
      const XLSX = await import('xlsx');
      
      // 파일 타입이 아닌 컬럼만 필터링
      const sampleColumns = columns.filter(col => col.type !== 'file');
      
      // 헤더 행 생성
      const headers = sampleColumns.map(col => col.name);
      
      // 샘플 데이터 행 생성 (2개)
      const sampleRow1 = sampleColumns.map(col => {
        switch (col.type) {
          case 'number':
            return '1';
          case 'dropdown':
            return col.options?.[0] || '';
          case 'email':
            return 'example@email.com';
          case 'url':
            return 'https://example.com';
          default:
            return `${col.name} 예시 1`;
        }
      });
      
      const sampleRow2 = sampleColumns.map(col => {
        switch (col.type) {
          case 'number':
            return '2';
          case 'dropdown':
            return col.options?.[1] || col.options?.[0] || '';
          case 'email':
            return 'sample@email.com';
          case 'url':
            return 'https://sample.com';
          default:
            return `${col.name} 예시 2`;
        }
      });
      
      // 워크시트 데이터 생성
      const worksheetData = [headers, sampleRow1, sampleRow2];
      
      // 워크북 생성
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      
      // 파일 다운로드
      XLSX.writeFile(wb, filename);
      
      return {
        success: true,
        filename
      };
    } catch (error) {
      console.error('Sample Excel generation error:', error);
      return {
        success: false,
        error: '샘플 엑셀 생성 중 오류가 발생했습니다.'
      };
    }
  }

  async uploadFile(
    file: File,
    fieldName: string,
    rowIndex: number
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    // Mock implementation - 실제로는 파일 업로드 서비스 연동
    try {
      // 파일 크기 검증 (5MB 제한)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        return {
          success: false,
          error: '파일 크기는 5MB를 초과할 수 없습니다.'
        };
      }
      
      // 이미지 파일만 허용
      if (!file.type.startsWith('image/')) {
        return {
          success: false,
          error: '이미지 파일만 업로드 가능합니다.'
        };
      }
      
      // Mock URL 생성
      const mockUrl = `https://example.com/uploads/${fieldName}_${rowIndex}_${file.name}`;
      
      // 실제로는 여기서 파일 업로드 API 호출
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        url: mockUrl
      };
    } catch (error) {
      console.error('File upload error:', error);
      return {
        success: false,
        error: '파일 업로드 중 오류가 발생했습니다.'
      };
    }
  }
}
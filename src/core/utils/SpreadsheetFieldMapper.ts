import { SlotField } from '@/contexts/ConfigContext';
import { SpreadsheetColumn } from '../components/SpreadsheetGrid';

/**
 * ConfigContext의 SlotField를 SpreadsheetColumn으로 변환하는 유틸리티
 */
export class SpreadsheetFieldMapper {
  /**
   * SlotField 배열을 SpreadsheetColumn 배열로 변환
   */
  static mapSlotFieldsToColumns(slotFields: SlotField[]): SpreadsheetColumn[] {
    return slotFields
      .filter(field => field.enabled) // 활성화된 필드만
      .sort((a, b) => a.order - b.order) // 순서대로 정렬
      .map(field => this.mapSlotFieldToColumn(field));
  }

  /**
   * 개별 SlotField를 SpreadsheetColumn으로 변환
   */
  static mapSlotFieldToColumn(field: SlotField): SpreadsheetColumn {
    const column: SpreadsheetColumn = {
      id: field.id,
      name: field.label,
      type: this.mapFieldType(field.type),
      required: field.required,
      placeholder: field.placeholder,
    };

    // 타입별 추가 설정
    switch (field.type) {
      case 'number':
        column.validation = {
          pattern: /^\d+$/,
          custom: (value: string) => {
            if (value && !/^\d+$/.test(value)) {
              return '숫자만 입력 가능합니다.';
            }
            return null;
          }
        };
        break;

      case 'email':
        column.validation = {
          pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          custom: (value: string) => {
            if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              return '올바른 이메일 형식이 아닙니다.';
            }
            return null;
          }
        };
        break;

      case 'url':
        column.validation = {
          pattern: /^https?:\/\/.+/,
          custom: (value: string) => {
            if (value && !/^https?:\/\/.+/.test(value)) {
              return 'http:// 또는 https://로 시작하는 URL을 입력해주세요.';
            }
            return null;
          }
        };
        break;
    }

    // 특정 필드에 대한 특별 처리
    switch (field.id) {
      case 'keywords':
        column.placeholder = field.placeholder || '키워드';
        // 기존 검증 함수 백업
        const originalValidation = column.validation?.custom;
        column.validation = {
          ...column.validation,
          custom: (value: string) => {
            if (value && value.split(',').length > 10) {
              return '키워드는 최대 10개까지 입력 가능합니다.';
            }
            return originalValidation?.(value) || null;
          }
        };
        break;

      case 'mid':
        column.placeholder = field.placeholder || 'MID-123456';
        break;

      case 'landingUrl':
        column.placeholder = field.placeholder || 'https://example.com';
        break;

      case 'adText':
        column.type = 'textarea';
        column.placeholder = field.placeholder || '광고 문구를 입력하세요';
        break;

      case 'description':
        column.type = 'textarea';
        column.placeholder = field.placeholder || '상세 설명을 입력하세요';
        break;
    }

    return column;
  }

  /**
   * SlotField의 type을 SpreadsheetColumn의 type으로 매핑
   */
  private static mapFieldType(fieldType: string): SpreadsheetColumn['type'] {
    switch (fieldType) {
      case 'textarea':
        return 'textarea';
      case 'url':
        return 'url';
      case 'email':
        return 'email';
      case 'number':
        return 'number';
      case 'file':
        return 'file';
      case 'text':
      default:
        return 'text';
    }
  }

  /**
   * 스프레드시트 데이터를 customFields 형태로 변환
   */
  static mapSpreadsheetDataToCustomFields(
    data: string[][],
    columns: SpreadsheetColumn[]
  ): Record<string, string>[] {
    return data.map(row => {
      const customFields: Record<string, string> = {};
      columns.forEach((column, index) => {
        customFields[column.id] = row[index] || '';
      });
      return customFields;
    });
  }

  /**
   * customFields 배열을 스프레드시트 데이터로 변환
   */
  static mapCustomFieldsToSpreadsheetData(
    customFieldsArray: Record<string, string>[],
    columns: SpreadsheetColumn[]
  ): string[][] {
    return customFieldsArray.map(customFields => {
      return columns.map(column => customFields[column.id] || '');
    });
  }

  /**
   * 단일 customFields 객체를 스프레드시트 행으로 변환
   */
  static mapCustomFieldsToSpreadsheetRow(
    customFields: Record<string, string>,
    columns: SpreadsheetColumn[]
  ): string[] {
    return columns.map(column => customFields[column.id] || '');
  }

  /**
   * 스프레드시트 행을 customFields 객체로 변환
   */
  static mapSpreadsheetRowToCustomFields(
    row: string[],
    columns: SpreadsheetColumn[]
  ): Record<string, string> {
    const customFields: Record<string, string> = {};
    columns.forEach((column, index) => {
      customFields[column.id] = row[index] || '';
    });
    return customFields;
  }
}

/**
 * 기본 슬롯 필드 컬럼 정의 (fallback용)
 */
export const DEFAULT_SLOT_COLUMNS: SpreadsheetColumn[] = [
  {
    id: 'keywords',
    name: '키워드',
    type: 'text',
    required: true,
    placeholder: '키워드'
  },
  {
    id: 'landingUrl',
    name: '랜딩 URL',
    type: 'url',
    required: true,
    placeholder: 'https://example.com'
  },
  {
    id: 'mid',
    name: 'MID',
    type: 'text',
    required: false,
    placeholder: 'MID-123456'
  }
];
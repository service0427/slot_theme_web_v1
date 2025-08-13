import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

export interface FieldConfig {
  id?: number;
  field_key: string;
  label: string;
  field_type: 'text' | 'number' | 'url' | 'textarea' | 'select' | 'date' | 'email' | 'phone';
  is_required: boolean;
  is_enabled: boolean;
  show_in_list: boolean;
  is_searchable: boolean;
  placeholder?: string;
  validation_rule?: string;
  options?: string[];
  default_value?: string;
  display_order: number;
  created_at?: string;
  updated_at?: string;
  is_system_generated?: boolean;
  description?: string;
  required?: boolean; // 이전 버전 호환성
}

class ApiFieldConfigService {
  private getAuthHeaders() {
    const token = localStorage.getItem('accessToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  async getFieldConfigs(): Promise<FieldConfig[]> {
    try {
      const response = await axios.get(`${API_URL}/field-configs`, {
        headers: this.getAuthHeaders()
      });
      return response.data.data;
    } catch (error) {
      console.error('필드 설정 조회 실패:', error);
      throw error;
    }
  }

  async updateFieldConfigs(fields: FieldConfig[]): Promise<FieldConfig[]> {
    try {
      const response = await axios.put(
        `${API_URL}/admin/field-configs`,
        { fields },
        { headers: this.getAuthHeaders() }
      );
      return response.data.data;
    } catch (error) {
      console.error('필드 설정 업데이트 실패:', error);
      throw error;
    }
  }

  async addFieldConfig(field: Omit<FieldConfig, 'id' | 'created_at' | 'updated_at'>): Promise<FieldConfig> {
    try {
      const response = await axios.post(
        `${API_URL}/admin/field-configs`,
        field,
        { headers: this.getAuthHeaders() }
      );
      return response.data.data;
    } catch (error) {
      console.error('필드 추가 실패:', error);
      throw error;
    }
  }

  async deleteFieldConfig(fieldKey: string): Promise<void> {
    try {
      await axios.delete(
        `${API_URL}/admin/field-configs/${fieldKey}`,
        { headers: this.getAuthHeaders() }
      );
    } catch (error) {
      console.error('필드 삭제 실패:', error);
      throw error;
    }
  }

  async resetFieldConfigs(): Promise<FieldConfig[]> {
    try {
      const response = await axios.post(
        `${API_URL}/admin/field-configs/reset`,
        {},
        { headers: this.getAuthHeaders() }
      );
      return response.data.data;
    } catch (error) {
      console.error('필드 설정 초기화 실패:', error);
      throw error;
    }
  }
}

export const fieldConfigService = new ApiFieldConfigService();
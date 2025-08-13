const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

export interface SystemSetting {
  key: string;
  value: any;
  category: 'theme' | 'field' | 'business' | 'feature';
  description?: string;
}

export interface SystemSettingsResponse {
  theme?: Record<string, any>;
  field?: Record<string, any>;
  business?: Record<string, any>;
  feature?: Record<string, any>;
}

class ApiSystemSettingsService {
  private baseUrl = `${API_URL}/system-settings`;
  private cache: SystemSettingsResponse | null = null;
  private cacheTimestamp = 0;
  private cacheTimeout = 10 * 1000; // 10초 캐시 (테마 변경이 빠르게 반영되도록)

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  // 모든 설정 조회 (캐시 사용)
  async getAllSettings(forceRefresh = false): Promise<SystemSettingsResponse> {
    const now = Date.now();
    
    // 캐시가 유효하고 강제 새로고침이 아닌 경우
    if (!forceRefresh && this.cache && (now - this.cacheTimestamp) < this.cacheTimeout) {
      return this.cache;
    }

    try {
      const response = await fetch(this.baseUrl, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        this.cache = data.settings;
        this.cacheTimestamp = now;
        return data.settings;
      }
      
      throw new Error(data.error || 'Failed to fetch settings');
    } catch (error) {
      console.error('Error fetching system settings:', error);
      // 캐시가 있으면 오류 시 캐시 반환
      if (this.cache) {
        return this.cache;
      }
      throw error;
    }
  }

  // 카테고리별 설정 조회
  async getSettingsByCategory(category: string): Promise<Record<string, any>> {
    try {
      const response = await fetch(`${this.baseUrl}/category/${category}`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // 캐시 업데이트
        if (this.cache) {
          this.cache[category as keyof SystemSettingsResponse] = data.settings;
        }
        return data.settings;
      }
      
      throw new Error(data.error || 'Failed to fetch settings');
    } catch (error) {
      console.error(`Error fetching ${category} settings:`, error);
      throw error;
    }
  }

  // 특정 설정 조회
  async getSetting(key: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/key/${key}`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return data.value;
      }
      
      throw new Error(data.error || 'Failed to fetch setting');
    } catch (error) {
      console.error(`Error fetching setting ${key}:`, error);
      throw error;
    }
  }

  // 설정 업데이트 (관리자만)
  async updateSettings(settings: SystemSetting[]): Promise<void> {
    try {
      console.log('Updating settings:', settings);
      console.log('Headers:', this.getAuthHeaders());
      
      const response = await fetch(this.baseUrl, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ settings })
      });

      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to update settings');
      }
      
      // 캐시 무효화
      this.cache = null;
      this.cacheTimestamp = 0;
      
      // 설정 변경 이벤트 발생
      window.dispatchEvent(new CustomEvent('systemSettingsChanged', { 
        detail: { settings } 
      }));
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }

  // 단일 설정 업데이트 (관리자만)
  async updateSetting(key: string, value: any, category?: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/key/${key}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ value })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to update setting');
      }
      
      // 캐시 부분 업데이트
      if (this.cache && category) {
        const categorySettings = this.cache[category as keyof SystemSettingsResponse];
        if (categorySettings) {
          categorySettings[key] = value;
        }
      }
      
      // 설정 변경 이벤트 발생
      window.dispatchEvent(new CustomEvent('systemSettingsChanged', { 
        detail: { key, value } 
      }));
    } catch (error) {
      console.error(`Error updating setting ${key}:`, error);
      throw error;
    }
  }

  // 캐시 초기화
  clearCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }

  // 현재 캐시된 설정 가져오기
  getCachedSettings(): SystemSettingsResponse | null {
    return this.cache;
  }
}

export const systemSettingsService = new ApiSystemSettingsService();
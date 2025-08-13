import { 
  IUserService, 
  UserFilter, 
  UserListResponse, 
  CreateUserData, 
  UpdateUserData, 
  ServiceResult 
} from '@/core/services/UserService';
import { User } from '@/core/models/User';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

export class ApiUserService implements IUserService {
  private getAuthHeader(): HeadersInit {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  async getUsers(filter?: UserFilter): Promise<ServiceResult<UserListResponse>> {
    try {
      const params = new URLSearchParams();
      
      if (filter) {
        if (filter.search) params.append('search', filter.search);
        if (filter.role) params.append('role', filter.role);
        if (filter.status) params.append('status', filter.status);
        if (filter.page) params.append('page', filter.page.toString());
        if (filter.limit) params.append('limit', filter.limit.toString());
      }

      const response = await fetch(`${API_BASE_URL}/users?${params}`, {
        headers: this.getAuthHeader()
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || '사용자 목록을 불러오는데 실패했습니다.'
        };
      }

      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      console.error('Get users error:', error);
      return {
        success: false,
        error: '서버와의 통신 중 오류가 발생했습니다.'
      };
    }
  }

  async getUser(id: string): Promise<ServiceResult<User>> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${id}`, {
        headers: this.getAuthHeader()
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || '사용자 정보를 불러오는데 실패했습니다.'
        };
      }

      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      console.error('Get user error:', error);
      return {
        success: false,
        error: '서버와의 통신 중 오류가 발생했습니다.'
      };
    }
  }

  async createUser(data: CreateUserData): Promise<ServiceResult<User>> {
    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: this.getAuthHeader(),
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || '사용자 생성에 실패했습니다.'
        };
      }

      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      console.error('Create user error:', error);
      return {
        success: false,
        error: '서버와의 통신 중 오류가 발생했습니다.'
      };
    }
  }

  async updateUser(id: string, data: UpdateUserData): Promise<ServiceResult<User>> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'PUT',
        headers: this.getAuthHeader(),
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || '사용자 정보 수정에 실패했습니다.'
        };
      }

      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      console.error('Update user error:', error);
      return {
        success: false,
        error: '서버와의 통신 중 오류가 발생했습니다.'
      };
    }
  }

  async deleteUser(id: string): Promise<ServiceResult<void>> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeader()
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || '사용자 삭제에 실패했습니다.'
        };
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('Delete user error:', error);
      return {
        success: false,
        error: '서버와의 통신 중 오류가 발생했습니다.'
      };
    }
  }
}
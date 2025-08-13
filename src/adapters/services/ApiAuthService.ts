import { BaseAuthService, LoginCredentials, AuthResult, AuthToken } from '@/core/services/AuthService';
import { User, UserModel } from '@/core/models/User';
import { ApiNotificationService } from './ApiNotificationService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

export class ApiAuthService extends BaseAuthService {
  private accessToken: string | null = null;

  constructor() {
    super();
    // 로컬 스토리지에서 토큰 복원
    this.restoreSession();
  }

  async login(credentials: LoginCredentials): Promise<AuthResult<{ user: User; tokens: AuthToken }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || '로그인에 실패했습니다.'
        };
      }

      if (result.success && result.data) {
        const { user, tokens } = result.data;
        
        // API 응답 디버깅
        console.log('API Response:', result.data);
        console.log('User object:', user);
        
        // 사용자 모델 생성
        const userModel = new UserModel(
          user.id,
          user.email,
          user.role,
          'active', // status
          new Date(), // createdAt
          new Date(), // updatedAt
          user.fullName,
          user.phone, // phone
          undefined, // bankInfo
          undefined, // business
          new Date() // lastLoginAt
        );
        
        // permissions는 UserModel에 없으므로 별도로 추가
        (userModel as any).permissions = user.permissions;

        // 토큰 저장
        this.accessToken = tokens.accessToken;
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        
        // 인증 상태 설정
        this.setAuthState(userModel, tokens);
        
        // 디버깅용 로그
        console.log('Login successful:', {
          email: userModel.email,
          role: userModel.role,
          permissions: userModel.permissions
        });

        // 로그인 성공 시 알림 폴링 시작
        const notificationService = ApiNotificationService.getInstance();
        notificationService.startPolling();

        return {
          success: true,
          data: { user: userModel, tokens }
        };
      }

      return {
        success: false,
        error: '로그인에 실패했습니다.'
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: '서버와의 통신 중 오류가 발생했습니다.'
      };
    }
  }

  async logout(): Promise<AuthResult<void>> {
    try {
      // 로그아웃 시 알림 폴링 중지
      const notificationService = ApiNotificationService.getInstance();
      notificationService.stopPolling();
      
      // 로컬 스토리지 클리어
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      // 상태 초기화
      this.accessToken = null;
      this.setAuthState(null, null);
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        error: '로그아웃 중 오류가 발생했습니다.'
      };
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthResult<AuthToken>> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      const result = await response.json();

      if (!response.ok) {
        // 리프레시 토큰도 만료된 경우 로그아웃
        if (response.status === 403) {
          await this.logout();
        }
        return {
          success: false,
          error: result.error || '토큰 갱신에 실패했습니다.'
        };
      }

      if (result.success && result.data) {
        const tokens = result.data;
        
        // 새 토큰 저장
        this.accessToken = tokens.accessToken;
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        
        this.tokens = tokens;

        return {
          success: true,
          data: tokens
        };
      }

      return {
        success: false,
        error: '토큰 갱신에 실패했습니다.'
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      return {
        success: false,
        error: '서버와의 통신 중 오류가 발생했습니다.'
      };
    }
  }

  async updateUser(userId: string, updates: any): Promise<AuthResult<User>> {
    try {
      const requestBody = {
        fullName: updates.fullName,
        phone: updates.phone,
        password: updates.password,
        currentPassword: updates.currentPassword
      };
      
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || '프로필 업데이트에 실패했습니다.'
        };
      }

      if (result.success && result.data) {
        const updatedUser = result.data;
        
        // 현재 사용자 정보 업데이트
        if (this.currentUser && this.currentUser.id === userId) {
          this.currentUser = new UserModel(
            this.currentUser.id,
            this.currentUser.email,
            this.currentUser.role,
            this.currentUser.status,
            this.currentUser.createdAt,
            new Date(),
            updatedUser.fullName,
            updatedUser.phone,
            this.currentUser.bankInfo,
            this.currentUser.business,
            this.currentUser.lastLoginAt
          );

          this.eventEmitter.emit('authStateChange', this.currentUser);
        }

        return {
          success: true,
          data: this.currentUser!
        };
      }

      return {
        success: false,
        error: '프로필 업데이트에 실패했습니다.'
      };
    } catch (error) {
      console.error('Update user error:', error);
      return {
        success: false,
        error: '서버와의 통신 중 오류가 발생했습니다.'
      };
    }
  }

  private async restoreSession() {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');

    if (!accessToken || !refreshToken) {
      return;
    }

    this.accessToken = accessToken;

    try {
      // 현재 사용자 정보 가져오기
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const user = result.data;
          
          const userModel = new UserModel(
            user.id,
            user.email,
            user.role,
            'active',
            new Date(),
            new Date(),
            user.fullName,
            user.phone,
            undefined,
            undefined,
            new Date()
          );
          
          (userModel as any).permissions = user.permissions;

          this.setAuthState(userModel, {
            accessToken,
            refreshToken,
            expiresIn: 24 * 60 * 60 * 1000
          });
        }
      } else if (response.status === 403) {
        // 토큰이 만료된 경우 리프레시 시도
        await this.refreshToken(refreshToken);
      }
    } catch (error) {
      // 세션 복원 실패 시 조용히 로그아웃
      await this.logout();
    }
  }
}
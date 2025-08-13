import { BaseAuthService, LoginCredentials, AuthToken, AuthResult } from '@/core/services/AuthService';
import { UserModel, UserRole, UserStatus } from '@/core/models/User';

export class MockAuthService extends BaseAuthService {
  constructor() {
    super();
    // 초기화 시 localStorage에서 로그인 정보 복원
    this.restoreAuthState();
  }

  private restoreAuthState(): void {
    try {
      const storedAuth = localStorage.getItem('mockAuth');
      if (storedAuth) {
        const { user, tokens } = JSON.parse(storedAuth);
        const mockUser = new UserModel(
          user.id,
          user.email,
          user.role,
          user.status,
          new Date(user.createdAt),
          new Date(user.updatedAt),
          user.fullName
        );
        this.setAuthState(mockUser, tokens);
      }
    } catch (error) {
      console.error('Failed to restore auth state:', error);
    }
  }

  private saveAuthState(user: UserModel | null, tokens: AuthToken | null): void {
    if (user && tokens) {
      localStorage.setItem('mockAuth', JSON.stringify({ user, tokens }));
    } else {
      localStorage.removeItem('mockAuth');
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthResult<{ user: UserModel; tokens: AuthToken }>> {
    // Mock: 모든 로그인 시도 성공
    await new Promise(resolve => setTimeout(resolve, 500));

    // admin@admin.com은 operator 역할로 로그인
    const isAdmin = credentials.email === 'admin@admin.com';
    
    const mockUser = new UserModel(
      isAdmin ? '999' : '1',
      credentials.email,
      isAdmin ? 'operator' as UserRole : 'advertiser' as UserRole,
      'active' as UserStatus,
      new Date(),
      new Date(),
      isAdmin ? '관리자' : '홍길동',
      '010-1234-5678'
    );

    const mockTokens: AuthToken = {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      expiresIn: 3600
    };

    this.setAuthState(mockUser, mockTokens);
    this.saveAuthState(mockUser, mockTokens);

    return {
      success: true,
      data: {
        user: mockUser,
        tokens: mockTokens
      }
    };
  }

  async logout(): Promise<AuthResult<void>> {
    await new Promise(resolve => setTimeout(resolve, 200));
    this.setAuthState(null, null);
    this.saveAuthState(null, null);
    return { success: true };
  }

  async refreshToken(refreshToken: string): Promise<AuthResult<AuthToken>> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (refreshToken === 'mock-refresh-token') {
      const newTokens: AuthToken = {
        accessToken: 'mock-access-token-new',
        refreshToken: 'mock-refresh-token-new',
        expiresIn: 3600
      };
      return { success: true, data: newTokens };
    }

    return {
      success: false,
      error: '유효하지 않은 토큰입니다.'
    };
  }

  async updateUser(userId: string, updates: Partial<UserModel> & { password?: string }): Promise<AuthResult<UserModel>> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (!this.currentUser || this.currentUser.id !== userId) {
      return {
        success: false,
        error: '사용자를 찾을 수 없습니다.'
      };
    }

    // 비밀번호 변경 시 현재 비밀번호 확인 (실제 구현에서는 서버에서 처리)
    if (updates.password) {
      // Mock에서는 항상 성공으로 처리
    }

    // 사용자 정보 업데이트
    const updatedUser = new UserModel(
      this.currentUser.id, // ID는 변경하지 않음
      this.currentUser.email, // 이메일은 변경하지 않음
      this.currentUser.role, // 권한은 변경하지 않음
      this.currentUser.status,
      this.currentUser.createdAt,
      new Date(), // updatedAt
      updates.fullName || this.currentUser.fullName,
      updates.phone || this.currentUser.phone
    );

    this.currentUser = updatedUser;
    this.setAuthState(updatedUser, this.tokens);
    this.saveAuthState(updatedUser, this.tokens);

    return {
      success: true,
      data: updatedUser
    };
  }
}
import { IAuthService, LoginCredentials, AuthToken } from '@/core/services/AuthService';
import { UserModel, User } from '@/core/models/User';
import { LoginDto, RegisterDto } from '@/dto';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiNotificationService } from './ApiNotificationService';
import { AuthResult } from '@/types/auth.types';

// 임시 타입 정의
interface AuthModel {
  user: UserModel;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

interface ISocketService {
  connect(userId: string): Promise<void>;
  disconnect(): void;
}

export class ApiAuthService implements IAuthService {
  private authStateSubject = new BehaviorSubject<AuthModel | null>(null);
  public authState$: Observable<AuthModel | null> = this.authStateSubject.asObservable();
  private accessToken: string | null = null;
  private socketService: ISocketService | null = null;
  
  // API URL 설정
  private apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

  constructor() {
    // 토큰 복원
    this.accessToken = localStorage.getItem('accessToken');
    if (this.accessToken) {
      this.validateAndRestoreSession();
    }
  }

  setSocketService(socketService: ISocketService) {
    this.socketService = socketService;
  }

  private async validateAndRestoreSession() {
    // 세션 복원 로직
  }

  private setAuthState(user: UserModel | null, tokens: any | null) {
    const authModel = user && tokens ? { user, tokens } : null;
    this.authStateSubject.next(authModel);
  }

  get authState(): AuthModel | null {
    return this.authStateSubject.value;
  }

  // IAuthService 인터페이스 구현 - LoginCredentials 받는 메소드
  async login(credentials: LoginCredentials): Promise<AuthResult<{ user: User; tokens: AuthToken }>>;
  async login(dto: LoginDto): Promise<AuthResult<AuthModel>>;
  async login(credentialsOrDto: LoginCredentials | LoginDto): Promise<AuthResult<any>> {
    try {
      // Cloudflare 최적화: Keep-Alive 헤더 추가
      const response = await fetch(`${this.apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'keep-alive',
          'Accept-Encoding': 'gzip, deflate, br',
        },
        body: JSON.stringify(credentialsOrDto),
        // 요청 타임아웃 설정
        signal: AbortSignal.timeout(15000) // 15초 타임아웃
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error || '로그인에 실패했습니다.'
        };
      }

      const result = await response.json();
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || '로그인에 실패했습니다.'
        };
      }

      const { user, tokens } = result.data;
      
      // UserModel 생성
      const userModel = new UserModel(
        user.id,
        user.email,
        user.fullName,
        user.role
      );
      
      // permissions는 UserModel에 없으므로 별도로 추가
      (userModel as any).permissions = user.permissions;

      // 토큰 저장
      this.accessToken = tokens.accessToken;
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      
      // 사용자 정보 저장 (operator 체크를 위해)
      localStorage.setItem('user', JSON.stringify({
        id: userModel.id,
        email: userModel.email,
        role: userModel.role,
        fullName: userModel.fullName
      }));
      
      // 인증 상태 설정
      this.setAuthState(userModel, tokens);
      
      // 디버깅용 로그
      console.log('Login successful:', {
        email: userModel.email,
        role: userModel.role
      });
      
      // Socket.IO 연결
      if (this.socketService && userModel.id) {
        await this.socketService.connect(userModel.id);
      }
      
      // 로그인 성공 시 알림 서비스 시작 (운영자 제외)
      if (userModel.role !== 'operator') {
        const notificationService = ApiNotificationService.getInstance();
        notificationService.startPolling();
      }
      
      const authModel = { user: userModel, tokens };
      
      return {
        success: true,
        data: authModel
      };
    } catch (error: any) {
      console.error('Login error:', error);
      
      // 타임아웃 에러 처리
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: '서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.'
        };
      }
      
      return {
        success: false,
        error: error.message || '로그인 중 오류가 발생했습니다.'
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
      localStorage.removeItem('user'); // user 정보도 삭제
      
      // 상태 초기화
      this.accessToken = null;
      this.setAuthState(null, null);
      
      // Socket.IO 연결 해제
      if (this.socketService) {
        this.socketService.disconnect();
      }
      
      return {
        success: true
      };
    } catch (error: any) {
      console.error('Logout error:', error);
      return {
        success: false,
        error: error.message || '로그아웃 중 오류가 발생했습니다.'
      };
    }
  }

  async register(dto: RegisterDto): Promise<AuthResult<void>> {
    try {
      const response = await fetch(`${this.apiUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'keep-alive',
        },
        body: JSON.stringify(dto),
        signal: AbortSignal.timeout(15000) // 15초 타임아웃
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error || '회원가입에 실패했습니다.'
        };
      }

      const result = await response.json();
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || '회원가입에 실패했습니다.'
        };
      }

      const { user, tokens } = result.data;
      
      // UserModel 생성
      const userModel = new UserModel(
        user.id,
        user.email,
        user.fullName,
        user.role
      );
      
      // 토큰 업데이트
      this.accessToken = tokens.accessToken;
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      
      // 사용자 정보도 업데이트 (operator 체크를 위해)
      if (user) {
        const userModel = new UserModel(
          user.id,
          user.email,
          user.fullName,
          user.role
        );
        localStorage.setItem('user', JSON.stringify({
          id: userModel.id,
          email: userModel.email,
          role: userModel.role,
          fullName: userModel.fullName
        }));
      }
      
      // 인증 상태 설정
      this.setAuthState(userModel, tokens);
      
      return {
        success: true
      };
    } catch (error: any) {
      console.error('Register error:', error);
      
      // 타임아웃 에러 처리
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: '서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.'
        };
      }
      
      return {
        success: false,
        error: error.message || '회원가입 중 오류가 발생했습니다.'
      };
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<AuthResult<void>> {
    try {
      const response = await fetch(`${this.apiUrl}/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
          'Connection': 'keep-alive',
        },
        body: JSON.stringify({
          currentPassword,
          password: newPassword
        }),
        signal: AbortSignal.timeout(15000) // 15초 타임아웃
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error || '비밀번호 변경에 실패했습니다.'
        };
      }

      const result = await response.json();
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || '비밀번호 변경에 실패했습니다.'
        };
      }

      return {
        success: true
      };
    } catch (error: any) {
      console.error('Change password error:', error);
      
      // 타임아웃 에러 처리
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: '서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.'
        };
      }
      
      return {
        success: false,
        error: error.message || '비밀번호 변경 중 오류가 발생했습니다.'
      };
    }
  }

  async refreshAuth(): Promise<void> {
    // 토큰 갱신 로직
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  getCurrentUser(): UserModel | null {
    return this.authState?.user || null;
  }

  onAuthStateChange(callback: (user: UserModel | null) => void): () => void {
    const subscription = this.authState$.subscribe((authState) => {
      callback(authState?.user || null);
    });
    
    // 구독 해제 함수 반환
    return () => {
      subscription.unsubscribe();
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthResult<any>> {
    try {
      const response = await fetch(`${this.apiUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'keep-alive',
        },
        body: JSON.stringify({ refreshToken }),
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error || '토큰 갱신에 실패했습니다.'
        };
      }

      const result = await response.json();
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || '토큰 갱신에 실패했습니다.'
        };
      }

      const { tokens } = result.data;
      
      // 토큰 업데이트
      this.accessToken = tokens.accessToken;
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      
      return {
        success: true,
        data: tokens
      };
    } catch (error: any) {
      console.error('Refresh token error:', error);
      return {
        success: false,
        error: error.message || '토큰 갱신 중 오류가 발생했습니다.'
      };
    }
  }

  async updateUser(userId: string, updates: Partial<UserModel>): Promise<AuthResult<UserModel>> {
    try {
      const response = await fetch(`${this.apiUrl}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
          'Connection': 'keep-alive',
        },
        body: JSON.stringify(updates),
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error || '사용자 정보 업데이트에 실패했습니다.'
        };
      }

      const result = await response.json();
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || '사용자 정보 업데이트에 실패했습니다.'
        };
      }

      const updatedUser = result.data;
      const userModel = new UserModel(
        updatedUser.id,
        updatedUser.email,
        updatedUser.fullName,
        updatedUser.role
      );
      
      // 현재 인증 상태가 있으면 업데이트
      if (this.authState) {
        const authModel = { user: userModel, tokens: this.authState.tokens };
        this.authStateSubject.next(authModel);
      }
      
      return {
        success: true,
        data: userModel
      };
    } catch (error: any) {
      console.error('Update user error:', error);
      return {
        success: false,
        error: error.message || '사용자 정보 업데이트 중 오류가 발생했습니다.'
      };
    }
  }
}
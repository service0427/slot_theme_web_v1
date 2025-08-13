import { Store } from './Store';
import { User } from '../models/User';
import { IAuthService, LoginCredentials } from '../services/AuthService';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export class AuthStore extends Store<AuthState> {
  constructor(private authService: IAuthService) {
    super({
      user: authService.getCurrentUser(),
      isAuthenticated: authService.isAuthenticated(),
      isLoading: false,
      error: null
    });

    // 서비스의 상태 변경 구독
    this.authService.onAuthStateChange((user) => {
      this.setState({
        user,
        isAuthenticated: user !== null,
        error: null
      });
    });
  }

  async login(credentials: LoginCredentials): Promise<void> {
    this.setState({ isLoading: true, error: null });
    
    try {
      const result = await this.authService.login(credentials);
      
      if (result.success && result.data) {
        this.setState({
          user: result.data.user,
          isAuthenticated: true,
          isLoading: false
        });
      } else {
        this.setState({
          error: result.error || '로그인에 실패했습니다.',
          isLoading: false
        });
      }
    } catch (error) {
      this.setState({
        error: '로그인 중 오류가 발생했습니다.',
        isLoading: false
      });
    }
  }

  async logout(): Promise<void> {
    this.setState({ isLoading: true });
    
    try {
      await this.authService.logout();
      this.setState({
        user: null,
        isAuthenticated: false,
        isLoading: false
      });
    } catch (error) {
      this.setState({
        error: '로그아웃 중 오류가 발생했습니다.',
        isLoading: false
      });
    }
  }

  async updateUser(updates: Partial<User>): Promise<{ success: boolean; error?: string }> {
    this.setState({ isLoading: true, error: null });
    
    try {
      if (!this.state.user) {
        throw new Error('사용자가 로그인되어 있지 않습니다.');
      }

      const result = await this.authService.updateUser(this.state.user.id, updates);
      
      if (result.success && result.data) {
        this.setState({
          user: result.data,
          isLoading: false
        });
        return { success: true };
      } else {
        this.setState({
          error: result.error || '사용자 정보 업데이트에 실패했습니다.',
          isLoading: false
        });
        return { success: false, error: result.error };
      }
    } catch (error) {
      this.setState({
        error: '사용자 정보 업데이트 중 오류가 발생했습니다.',
        isLoading: false
      });
      return { success: false, error: '사용자 정보 업데이트 중 오류가 발생했습니다.' };
    }
  }
}
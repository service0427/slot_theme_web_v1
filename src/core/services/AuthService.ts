import { User, UserModel } from '../models/User';
import { EventEmitter } from '../utils/EventEmitter';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface IAuthService {
  login(credentials: LoginCredentials): Promise<AuthResult<{ user: User; tokens: AuthToken }>>;
  logout(): Promise<AuthResult<void>>;
  refreshToken(refreshToken: string): Promise<AuthResult<AuthToken>>;
  updateUser(userId: string, updates: Partial<User>): Promise<AuthResult<User>>;
  getCurrentUser(): User | null;
  isAuthenticated(): boolean;
  onAuthStateChange(callback: (user: User | null) => void): () => void;
}

export abstract class BaseAuthService implements IAuthService {
  protected currentUser: UserModel | null = null;
  protected tokens: AuthToken | null = null;
  protected eventEmitter = new EventEmitter<{
    authStateChange: User | null;
  }>();

  abstract login(credentials: LoginCredentials): Promise<AuthResult<{ user: User; tokens: AuthToken }>>;
  abstract logout(): Promise<AuthResult<void>>;
  abstract refreshToken(refreshToken: string): Promise<AuthResult<AuthToken>>;
  abstract updateUser(userId: string, updates: Partial<User>): Promise<AuthResult<User>>;

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null && this.tokens !== null;
  }

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    return this.eventEmitter.on('authStateChange', callback);
  }

  protected setAuthState(user: UserModel | null, tokens: AuthToken | null): void {
    this.currentUser = user;
    this.tokens = tokens;
    this.eventEmitter.emit('authStateChange', user);
  }
}
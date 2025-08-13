import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { BaseAuthService, LoginCredentials, AuthResult, AuthToken } from '@/core/services/AuthService';
import { User, UserModel } from '@/core/models/User';
import { db } from '@/core/database/pool';

export class PostgresAuthService extends BaseAuthService {
  private readonly TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24시간

  async login(credentials: LoginCredentials): Promise<AuthResult<{ user: User; tokens: AuthToken }>> {
    try {
      // 사용자 조회
      const query = `
        SELECT id, email, password, full_name, role, is_active
        FROM users
        WHERE email = $1
      `;
      
      const result = await db.query(query, [credentials.email]);
      
      if (result.rows.length === 0) {
        return {
          success: false,
          error: '이메일 또는 비밀번호가 올바르지 않습니다.'
        };
      }

      const userRow = result.rows[0];

      // 계정 활성화 상태 확인
      if (!userRow.is_active) {
        return {
          success: false,
          error: '비활성화된 계정입니다. 관리자에게 문의하세요.'
        };
      }

      // 비밀번호 검증
      const isValidPassword = await bcrypt.compare(credentials.password, userRow.password);
      
      if (!isValidPassword) {
        return {
          success: false,
          error: '이메일 또는 비밀번호가 올바르지 않습니다.'
        };
      }

      // 사용자 모델 생성
      const user = new UserModel(
        userRow.id,
        userRow.email,
        userRow.role,
        'active',
        new Date(),
        new Date(),
        userRow.full_name
      );
      user.permissions = this.getRolePermissions(userRow.role);

      // 토큰 생성 (실제 프로덕션에서는 JWT 사용 권장)
      const tokens: AuthToken = {
        accessToken: `at_${uuidv4()}`,
        refreshToken: `rt_${uuidv4()}`,
        expiresIn: this.TOKEN_EXPIRY
      };

      // 인증 상태 저장
      this.setAuthState(user, tokens);

      // 마지막 로그인 시간 업데이트
      await db.query(
        'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      return {
        success: true,
        data: { user, tokens }
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: '로그인 중 오류가 발생했습니다.'
      };
    }
  }

  async logout(): Promise<AuthResult<void>> {
    try {
      // 인증 상태 초기화
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

  async refreshToken(_refreshToken: string): Promise<AuthResult<AuthToken>> {
    try {
      // 실제 구현에서는 리프레시 토큰 검증 로직 필요
      if (!this.currentUser) {
        return {
          success: false,
          error: '인증이 필요합니다.'
        };
      }

      const newTokens: AuthToken = {
        accessToken: `at_${uuidv4()}`,
        refreshToken: `rt_${uuidv4()}`,
        expiresIn: this.TOKEN_EXPIRY
      };

      this.tokens = newTokens;

      return {
        success: true,
        data: newTokens
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      return {
        success: false,
        error: '토큰 갱신 중 오류가 발생했습니다.'
      };
    }
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<AuthResult<User>> {
    try {
      // const allowedUpdates = ['full_name', 'password']; // 미사용 변수
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // 업데이트 필드 구성
      if (updates.fullName) {
        updateFields.push(`full_name = $${paramIndex++}`);
        values.push(updates.fullName);
      }

      if (updates.password) {
        const hashedPassword = await bcrypt.hash(updates.password, 10);
        updateFields.push(`password = $${paramIndex++}`);
        values.push(hashedPassword);
      }

      if (updateFields.length === 0) {
        return {
          success: false,
          error: '업데이트할 필드가 없습니다.'
        };
      }

      // 업데이트 실행
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(userId);

      const query = `
        UPDATE users
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, email, full_name, role
      `;

      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: '사용자를 찾을 수 없습니다.'
        };
      }

      const updatedRow = result.rows[0];

      // 현재 사용자 정보 업데이트
      if (this.currentUser && this.currentUser.id === userId) {
        this.currentUser = new UserModel(
          this.currentUser.id,
          this.currentUser.email,
          this.currentUser.role,
          this.currentUser.status,
          this.currentUser.createdAt,
          new Date(),
          updatedRow.full_name,
          this.currentUser.phone,
          this.currentUser.bankInfo,
          this.currentUser.business,
          this.currentUser.lastLoginAt
        );
        this.currentUser.permissions = this.getRolePermissions(this.currentUser.role);

        this.eventEmitter.emit('authStateChange', this.currentUser);
      }

      return {
        success: true,
        data: this.currentUser!
      };
    } catch (error) {
      console.error('Update user error:', error);
      return {
        success: false,
        error: '사용자 정보 업데이트 중 오류가 발생했습니다.'
      };
    }
  }

  private getRolePermissions(role: string): string[] {
    const permissionMap: Record<string, string[]> = {
      admin: ['view_all', 'edit_all', 'delete_all', 'manage_users'],
      operator: ['view_all', 'edit_all', 'manage_users'],
      user: ['view_own', 'edit_own']
    };

    return permissionMap[role] || ['view_own'];
  }
}
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { pool } from '../config/database';
import { jwtConfig } from '../config/jwt';
import { AuthRequest } from '../middleware/auth';

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: '이메일과 비밀번호를 입력해주세요.'
      });
    }

    // 사용자 조회
    const result = await pool.query(
      'SELECT id, email, password, full_name, phone, role, is_active FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: '이메일 또는 비밀번호가 올바르지 않습니다.'
      });
    }

    const user = result.rows[0];

    // 계정 활성화 상태 확인
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        error: '비활성화된 계정입니다. 관리자에게 문의하세요.'
      });
    }

    // 비밀번호 검증
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: '이메일 또는 비밀번호가 올바르지 않습니다.'
      });
    }

    // JWT 토큰 생성
    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn } as SignOptions
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      jwtConfig.secret,
      { expiresIn: jwtConfig.refreshExpiresIn } as SignOptions
    );

    // 마지막 로그인 시간 업데이트
    await pool.query(
      'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // 권한 매핑
    const permissions = getPermissionsByRole(user.role);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          phone: user.phone,
          role: user.role,
          permissions
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: 24 * 60 * 60 * 1000 // 24시간 (밀리초)
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: '로그인 중 오류가 발생했습니다.'
    });
  }
}

export async function refreshToken(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: '리프레시 토큰이 필요합니다.'
      });
    }

    jwt.verify(refreshToken, jwtConfig.secret, async (err: any, decoded: any) => {
      if (err) {
        return res.status(403).json({
          success: false,
          error: '유효하지 않은 토큰입니다.'
        });
      }

      // 사용자 정보 조회
      const result = await pool.query(
        'SELECT id, email, role FROM users WHERE id = $1',
        [decoded.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '사용자를 찾을 수 없습니다.'
        });
      }

      const user = result.rows[0];

      // 새 토큰 생성
      const newAccessToken = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role
        },
        jwtConfig.secret,
        { expiresIn: jwtConfig.expiresIn } as SignOptions
      );

      const newRefreshToken = jwt.sign(
        { id: user.id },
        jwtConfig.secret,
        { expiresIn: jwtConfig.refreshExpiresIn } as SignOptions
      );

      res.json({
        success: true,
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn: 24 * 60 * 60 * 1000
        }
      });
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: '토큰 갱신 중 오류가 발생했습니다.'
    });
  }
}

export async function updateProfile(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { fullName, phone, password, currentPassword } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '인증이 필요합니다.'
      });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // 이름 업데이트
    if (fullName) {
      updates.push(`full_name = $${paramIndex++}`);
      values.push(fullName);
    }

    // 전화번호 업데이트
    if (phone) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(phone);
    }

    // 비밀번호 업데이트
    if (password && currentPassword) {
      // 현재 비밀번호 확인
      const userResult = await pool.query(
        'SELECT password FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '사용자를 찾을 수 없습니다.'
        });
      }

      const isValidPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          error: '현재 비밀번호가 올바르지 않습니다.'
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push(`password = $${paramIndex++}`);
      values.push(hashedPassword);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: '업데이트할 필드가 없습니다.'
      });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);

    const query = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, full_name, phone, role
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '사용자를 찾을 수 없습니다.'
      });
    }

    const updatedUser = result.rows[0];

    res.json({
      success: true,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.full_name,
        phone: updatedUser.phone,
        role: updatedUser.role,
        permissions: getPermissionsByRole(updatedUser.role)
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: '프로필 업데이트 중 오류가 발생했습니다.'
    });
  }
}

export async function getCurrentUser(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '인증이 필요합니다.'
      });
    }

    const result = await pool.query(
      'SELECT id, email, full_name, phone, role FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '사용자를 찾을 수 없습니다.'
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        role: user.role,
        permissions: getPermissionsByRole(user.role)
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: '사용자 정보 조회 중 오류가 발생했습니다.'
    });
  }
}

function getPermissionsByRole(role: string): string[] {
  const permissionMap: Record<string, string[]> = {
    admin: ['view_all', 'edit_all', 'delete_all', 'manage_users'],
    operator: ['view_all', 'edit_all', 'manage_users'],
    user: ['view_own', 'edit_own']
  };

  return permissionMap[role] || ['view_own'];
}
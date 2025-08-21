import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { pool } from '../config/database';
import { jwtConfig } from '../config/jwt';
import { AuthRequest } from '../middleware/auth';

export async function login(req: Request, res: Response) {
  try {
    const startTime = Date.now();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: '이메일과 비밀번호를 입력해주세요.'
      });
    }

    // 사용자 조회
    // [LOGIN] 1. DB 조회 시작: email
    const dbStartTime = Date.now();
    const result = await pool.query(
      'SELECT id, email, password, full_name, role, is_active FROM users WHERE email = $1',
      [email]
    );
    // [LOGIN] 2. DB 조회 완료: Date.now() - dbStartTime ms

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
    // [LOGIN] 3. bcrypt 비교 시작
    const bcryptStartTime = Date.now();
    const isValidPassword = await bcrypt.compare(password, user.password);
    // [LOGIN] 4. bcrypt 비교 완료: Date.now() - bcryptStartTime ms
    
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
    // [LOGIN] 5. 로그인 시간 업데이트 시작
    const updateStartTime = Date.now();
    await pool.query(
      'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );
    // [LOGIN] 6. 로그인 시간 업데이트 완료: Date.now() - updateStartTime ms

    // 권한 매핑
    const permissions = getPermissionsByRole(user.role);

    // [LOGIN] 전체 소요 시간: Date.now() - startTime ms
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
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
    // Login error: error
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
    // Token refresh error: error
    res.status(500).json({
      success: false,
      error: '토큰 갱신 중 오류가 발생했습니다.'
    });
  }
}

export async function updateProfile(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { fullName, password, currentPassword } = req.body;

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

      const hashedPassword = await bcrypt.hash(password, 8); // 성능 최적화: 10 -> 8
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
      RETURNING id, email, full_name, role
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
        role: updatedUser.role,
        permissions: getPermissionsByRole(updatedUser.role)
      }
    });
  } catch (error) {
    // Update profile error: error
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
      'SELECT id, email, full_name, role FROM users WHERE id = $1',
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
    // Get current user error: error
    res.status(500).json({
      success: false,
      error: '사용자 정보 조회 중 오류가 발생했습니다.'
    });
  }
}

// 개발자 전용: 사용자 전환
export async function switchUser(req: AuthRequest, res: Response) {
  try {
    const currentUserId = req.user?.id;
    const currentUserRole = req.user?.role;
    const { targetUserId } = req.body;

    // 개발자 권한 확인
    if (currentUserRole !== 'developer') {
      return res.status(403).json({
        success: false,
        error: '개발자 계정만 사용자 전환이 가능합니다.'
      });
    }

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        error: '전환할 사용자 ID를 입력해주세요.'
      });
    }

    // 대상 사용자 조회
    const result = await pool.query(
      'SELECT id, email, full_name, role, is_active FROM users WHERE id = $1',
      [targetUserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '대상 사용자를 찾을 수 없습니다.'
      });
    }

    const targetUser = result.rows[0];

    // 계정 활성화 상태 확인
    if (!targetUser.is_active) {
      return res.status(400).json({
        success: false,
        error: '비활성화된 계정으로는 전환할 수 없습니다.'
      });
    }

    // 대상 사용자의 JWT 토큰 생성
    const accessToken = jwt.sign(
      {
        id: targetUser.id,
        email: targetUser.email,
        role: targetUser.role,
        switched_from: currentUserId // 개발자 ID 저장
      },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn } as SignOptions
    );

    const refreshToken = jwt.sign(
      { 
        id: targetUser.id,
        switched_from: currentUserId 
      },
      jwtConfig.secret,
      { expiresIn: jwtConfig.refreshExpiresIn } as SignOptions
    );

    // 권한 매핑
    const permissions = getPermissionsByRole(targetUser.role);

    res.json({
      success: true,
      data: {
        user: {
          id: targetUser.id,
          email: targetUser.email,
          fullName: targetUser.full_name,
          role: targetUser.role,
          permissions
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Switch user error:', error);
    res.status(500).json({
      success: false,
      error: '사용자 전환 중 오류가 발생했습니다.'
    });
  }
}

function getPermissionsByRole(role: string): string[] {
  const permissionMap: Record<string, string[]> = {
    admin: ['view_all', 'edit_all', 'delete_all', 'manage_users'],
    operator: ['view_all', 'edit_all', 'manage_users'],
    developer: ['view_all', 'edit_all', 'manage_users', 'switch_user'], // 개발자는 사용자 전환 권한 추가
    user: ['view_own', 'edit_own']
  };

  return permissionMap[role] || ['view_own'];
}
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../config/database';
import { AuthRequest } from '../middleware/auth';

export async function getUsers(req: AuthRequest, res: Response) {
  try {
    const { search, role, status, page = 1, limit = 10 } = req.query;
    const currentUserId = req.user?.id;
    
    let query = `
      SELECT 
        id, 
        email, 
        full_name, 
        role, 
        is_active,
        created_at,
        updated_at
      FROM users
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    // 운영자와 개발자는 리스트에서 제외 (일반 사용자만 표시)
    query += ` AND role NOT IN ('operator', 'developer')`;
    
    // 현재 로그인한 관리자 제외
    if (currentUserId) {
      query += ` AND id != $${paramIndex}`;
      params.push(currentUserId);
      paramIndex++;
    }
    
    // 검색 조건
    if (search) {
      query += ` AND (email ILIKE $${paramIndex} OR full_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    // 역할 필터
    if (role) {
      query += ` AND role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }
    
    // 상태 필터
    if (status !== undefined) {
      query += ` AND is_active = $${paramIndex}`;
      params.push(status === 'active');
      paramIndex++;
    }
    
    // 정렬
    query += ' ORDER BY created_at DESC';
    
    // 페이지네이션
    const offset = (Number(page) - 1) * Number(limit);
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(Number(limit), offset);
    
    // 전체 개수 조회
    let countQuery = `
      SELECT COUNT(*) as total
      FROM users
      WHERE 1=1
    `;
    
    const countParams: any[] = [];
    let countParamIndex = 1;
    
    // 운영자와 개발자는 카운트에서도 제외 (일반 사용자만 카운트)
    countQuery += ` AND role NOT IN ('operator', 'developer')`;
    
    // 현재 로그인한 관리자 제외
    if (currentUserId) {
      countQuery += ` AND id != $${countParamIndex}`;
      countParams.push(currentUserId);
      countParamIndex++;
    }
    
    if (search) {
      countQuery += ` AND (email ILIKE $${countParamIndex} OR full_name ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }
    
    if (role) {
      countQuery += ` AND role = $${countParamIndex}`;
      countParams.push(role);
      countParamIndex++;
    }
    
    if (status !== undefined) {
      countQuery += ` AND is_active = $${countParamIndex}`;
      countParams.push(status === 'active');
    }
    
    const [usersResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);
    
    const users = usersResult.rows.map(user => ({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      isActive: user.is_active,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    }));
    
    const total = parseInt(countResult.rows[0].total);
    
    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    // Get users error: error
    res.status(500).json({
      success: false,
      error: '사용자 목록 조회 중 오류가 발생했습니다.'
    });
  }
}

export async function getUser(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT id, email, full_name, role, is_active, created_at, updated_at FROM users WHERE id = $1',
      [id]
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
        role: user.role,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    });
  } catch (error) {
    // Get user error: error
    res.status(500).json({
      success: false,
      error: '사용자 조회 중 오류가 발생했습니다.'
    });
  }
}

export async function createUser(req: AuthRequest, res: Response) {
  try {
    const { email, password, fullName, role = 'user' } = req.body;
    
    if (!email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        error: '필수 정보를 입력해주세요.'
      });
    }
    
    // 아이디 영문자와 숫자만 허용
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    if (!alphanumericRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: '아이디는 영문자와 숫자만 사용 가능합니다.'
      });
    }
    
    // 이메일 중복 확인
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: '이미 사용 중인 이메일입니다.'
      });
    }
    
    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 8); // 성능 최적화: 10 -> 8
    
    // 사용자 생성
    const result = await pool.query(
      `INSERT INTO users (email, password, full_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, role, is_active, created_at`,
      [email, hashedPassword, fullName, role]
    );
    
    const newUser = result.rows[0];
    
    res.status(201).json({
      success: true,
      data: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.full_name,
        role: newUser.role,
        isActive: newUser.is_active,
        createdAt: newUser.created_at
      }
    });
  } catch (error) {
    // Create user error: error
    res.status(500).json({
      success: false,
      error: '사용자 생성 중 오류가 발생했습니다.'
    });
  }
}

export async function updateUser(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { fullName, role, isActive, password } = req.body;
    
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (fullName !== undefined) {
      updates.push(`full_name = $${paramIndex++}`);
      values.push(fullName);
    }
    
    if (role !== undefined) {
      updates.push(`role = $${paramIndex++}`);
      values.push(role);
    }
    
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(isActive);
    }
    
    if (password) {
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
    values.push(id);
    
    const query = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, full_name, role, is_active, updated_at
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
        isActive: updatedUser.is_active,
        updatedAt: updatedUser.updated_at
      }
    });
  } catch (error) {
    // Update user error: error
    res.status(500).json({
      success: false,
      error: '사용자 정보 업데이트 중 오류가 발생했습니다.'
    });
  }
}

export async function deleteUser(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    
    // 자기 자신은 삭제할 수 없음
    if (req.user?.id === id) {
      return res.status(400).json({
        success: false,
        error: '자신의 계정은 삭제할 수 없습니다.'
      });
    }
    
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '사용자를 찾을 수 없습니다.'
      });
    }
    
    res.json({
      success: true,
      message: '사용자가 삭제되었습니다.'
    });
  } catch (error) {
    // Delete user error: error
    res.status(500).json({
      success: false,
      error: '사용자 삭제 중 오류가 발생했습니다.'
    });
  }
}
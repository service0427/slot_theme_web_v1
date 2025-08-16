import { Request, Response } from 'express';
import { pool } from '../config/database';

// 공지사항 목록 조회
export const getAnnouncements = async (req: Request, res: Response) => {
  try {
    const { category, page = 1, limit = 10, includeInactive = false } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const userId = (req as any).user?.id || null;
    
    let query: string;
    let params: any[] = [];
    let paramIndex = 1;
    
    // 로그인한 사용자가 있는 경우
    if (userId) {
      query = `
        SELECT 
          a.*,
          CASE WHEN ar.user_id IS NOT NULL THEN true ELSE false END as is_read
        FROM announcements a
        LEFT JOIN announcement_reads ar ON a.id = ar.announcement_id AND ar.user_id = $1
        WHERE 1=1
      `;
      params.push(userId);
      paramIndex = 2;
    } else {
      // 로그인하지 않은 경우
      query = `
        SELECT 
          a.*,
          false as is_read
        FROM announcements a
        WHERE 1=1
      `;
      paramIndex = 1;
    }
    
    // 활성화된 공지만 보기
    if (!includeInactive) {
      query += ` AND a.is_active = true`;
      query += ` AND (a.start_date IS NULL OR a.start_date <= NOW())`;
      query += ` AND (a.end_date IS NULL OR a.end_date >= NOW())`;
    }
    
    // 카테고리 필터
    if (category) {
      query += ` AND a.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    
    // 정렬: 고정 공지 먼저, 그다음 최신순
    query += ` ORDER BY a.is_pinned DESC, a.created_at DESC`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(Number(limit), offset);
    
    const result = await pool.query(query, params);
    
    // 전체 개수 조회
    let countQuery = `
      SELECT COUNT(*) as total
      FROM announcements a
      WHERE 1=1
    `;
    
    const countParams: any[] = [];
    let countParamIndex = 1;
    
    if (!includeInactive) {
      countQuery += ` AND a.is_active = true`;
      countQuery += ` AND (a.start_date IS NULL OR a.start_date <= NOW())`;
      countQuery += ` AND (a.end_date IS NULL OR a.end_date >= NOW())`;
    }
    
    if (category) {
      countQuery += ` AND a.category = $${countParamIndex}`;
      countParams.push(category);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);
    
    res.json({
      success: true,
      data: {
        announcements: result.rows,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({
      success: false,
      error: '공지사항 목록을 불러오는데 실패했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// 공지사항 상세 조회
export const getAnnouncement = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    
    // 공지사항 조회
    const result = await pool.query(
      `SELECT * FROM announcements WHERE id = $1 AND is_active = true`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '공지사항을 찾을 수 없습니다.'
      });
    }
    
    // 조회수 증가
    await pool.query(
      `UPDATE announcements SET view_count = view_count + 1 WHERE id = $1`,
      [id]
    );
    
    // 읽음 표시
    if (userId) {
      await pool.query(
        `INSERT INTO announcement_reads (announcement_id, user_id) 
         VALUES ($1, $2) 
         ON CONFLICT (announcement_id, user_id) DO NOTHING`,
        [id, userId]
      );
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching announcement:', error);
    res.status(500).json({
      success: false,
      error: '공지사항을 불러오는데 실패했습니다.'
    });
  }
};

// HTML에서 평문 텍스트 추출
const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>/g, '').trim();
};

// 공지사항 생성 (관리자만)
export const createAnnouncement = async (req: Request, res: Response) => {
  try {
    console.log('[createAnnouncement] Request body:', req.body);
    console.log('[createAnnouncement] User:', (req as any).user);
    
    const user = (req as any).user;
    
    // 관리자/개발자 권한 체크
    if (user?.role !== 'operator' && user?.role !== 'developer') {
      return res.status(403).json({
        success: false,
        error: '관리자 또는 개발자만 공지사항을 작성할 수 있습니다.'
      });
    }
    
    const {
      title,
      content,
      content_type = 'html',
      images = [],
      category = 'general',
      priority = 'normal',
      is_pinned = false,
      start_date,
      end_date
    } = req.body;
    
    // HTML 컨텐츠에서 평문 추출 (검색용)
    const content_plain = content_type === 'html' ? stripHtml(content) : content;
    
    // 작성자 이름 가져오기
    const authorResult = await pool.query(
      'SELECT full_name FROM users WHERE id = $1',
      [user.id]
    );
    const authorName = authorResult.rows[0]?.full_name || 'Admin';
    
    // start_date와 end_date를 null로 변환 (빈 문자열인 경우)
    const startDate = start_date || null;
    const endDate = end_date || null;
    
    console.log('[createAnnouncement] Inserting with values:', {
      title,
      content_length: content?.length,
      content_plain_length: content_plain?.length,
      content_type,
      images,
      category,
      priority,
      is_pinned,
      author_id: user.id,
      author_name: authorName,
      start_date: startDate,
      end_date: endDate
    });
    
    const result = await pool.query(
      `INSERT INTO announcements 
       (title, content, content_plain, content_type, images, category, priority, is_pinned, author_id, author_name, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [title, content, content_plain, content_type, JSON.stringify(images), category, priority, is_pinned, user.id, authorName, startDate, endDate]
    );
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({
      success: false,
      error: '공지사항 생성에 실패했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// 공지사항 수정 (관리자만)
export const updateAnnouncement = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    
    // 관리자/개발자 권한 체크
    if (user?.role !== 'operator' && user?.role !== 'developer') {
      return res.status(403).json({
        success: false,
        error: '관리자 또는 개발자만 공지사항을 수정할 수 있습니다.'
      });
    }
    
    const {
      title,
      content,
      content_type = 'html',
      images = [],
      category,
      priority,
      is_pinned,
      is_active,
      start_date,
      end_date
    } = req.body;
    
    // HTML 컨텐츠에서 평문 추출 (검색용)
    const content_plain = content_type === 'html' ? stripHtml(content) : content;
    
    // start_date와 end_date를 null로 변환 (빈 문자열인 경우)
    const startDate = start_date || null;
    const endDate = end_date || null;
    
    const result = await pool.query(
      `UPDATE announcements 
       SET title = $1, content = $2, content_plain = $3, content_type = $4, images = $5,
           category = $6, priority = $7, is_pinned = $8, is_active = $9, 
           start_date = $10, end_date = $11, updated_at = CURRENT_TIMESTAMP
       WHERE id = $12
       RETURNING *`,
      [title, content, content_plain, content_type, JSON.stringify(images), category, priority, is_pinned, is_active, startDate, endDate, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '공지사항을 찾을 수 없습니다.'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({
      success: false,
      error: '공지사항 수정에 실패했습니다.'
    });
  }
};

// 공지사항 삭제 (관리자만)
export const deleteAnnouncement = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    
    // 관리자/개발자 권한 체크
    if (user?.role !== 'operator' && user?.role !== 'developer') {
      return res.status(403).json({
        success: false,
        error: '관리자 또는 개발자만 공지사항을 삭제할 수 있습니다.'
      });
    }
    
    const result = await pool.query(
      `DELETE FROM announcements WHERE id = $1 RETURNING id`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '공지사항을 찾을 수 없습니다.'
      });
    }
    
    res.json({
      success: true,
      message: '공지사항이 삭제되었습니다.'
    });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({
      success: false,
      error: '공지사항 삭제에 실패했습니다.'
    });
  }
};

// 고정 공지사항 조회 (공지사항 바용)
export const getPinnedAnnouncements = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, title, content, content_type, category, priority
       FROM announcements 
       WHERE is_pinned = true 
         AND is_active = true
         AND (start_date IS NULL OR start_date <= NOW())
         AND (end_date IS NULL OR end_date >= NOW())
       ORDER BY priority DESC, created_at DESC`,
      []
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching pinned announcements:', error);
    res.status(500).json({
      success: false,
      error: '고정 공지사항을 불러오는데 실패했습니다.'
    });
  }
};
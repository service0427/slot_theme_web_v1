import { Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest } from '../middleware/auth';

// URL 파싱 함수
function parseUrl(url: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  
  // Coupang URL 파싱
  if (url.includes('coupang.com')) {
    // products/숫자 패턴 매칭
    const productMatch = url.match(/\/products\/(\d+)/);
    if (productMatch) {
      parsed.url_product_id = productMatch[1];
    }
    
    // itemId=숫자 패턴 매칭
    const itemMatch = url.match(/itemId=(\d+)/);
    if (itemMatch) {
      parsed.url_item_id = itemMatch[1];
    }
    
    // vendorItemId=숫자 패턴 매칭
    const vendorMatch = url.match(/vendorItemId=(\d+)/);
    if (vendorMatch) {
      parsed.url_vendor_item_id = vendorMatch[1];
    }
  }
  
  // 11번가 URL 파싱 (예시)
  if (url.includes('11st.co.kr')) {
    const productMatch = url.match(/\/products\/(\d+)/);
    if (productMatch) {
      parsed.url_product_id = productMatch[1];
    }
  }
  
  // 네이버 스마트스토어 URL 파싱 (예시)
  if (url.includes('smartstore.naver.com')) {
    const productMatch = url.match(/\/products\/(\d+)/);
    if (productMatch) {
      parsed.url_product_id = productMatch[1];
    }
  }
  
  return parsed;
}

// 슬롯 목록 조회
export async function getSlots(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { page = 1, limit = 10, search = '', status = '' } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    let query = '';
    let countQuery = '';
    const params: any[] = [];
    const countParams: any[] = [];

    // 관리자는 모든 슬롯 조회, 일반 사용자는 자신의 슬롯만 조회
    if (userRole === 'operator') {
      query = `
        SELECT s.*, u.email as user_email, u.full_name as user_name, s.approved_price
        FROM slots s
        JOIN users u ON s.user_id = u.id
        WHERE 1=1
      `;
      countQuery = 'SELECT COUNT(*) FROM slots s WHERE 1=1';
    } else {
      params.push(userId);
      countParams.push(userId);
      query = `
        SELECT s.*, u.email as user_email, u.full_name as user_name, s.approved_price
        FROM slots s
        JOIN users u ON s.user_id = u.id
        WHERE s.user_id = $1
      `;
      countQuery = 'SELECT COUNT(*) FROM slots s WHERE s.user_id = $1';
    }

    // 검색 조건 추가
    if (search) {
      const searchParam = `%${search}%`;
      const paramIndex = params.length + 1;
      params.push(searchParam);
      countParams.push(searchParam);
      query += ` AND (s.keyword ILIKE $${paramIndex} OR s.url ILIKE $${paramIndex})`;
      countQuery += ` AND (s.keyword ILIKE $${countParams.length} OR s.url ILIKE $${countParams.length})`;
    }

    // 상태 필터
    if (status) {
      params.push(status);
      countParams.push(status);
      query += ` AND s.status = $${params.length}`;
      countQuery += ` AND s.status = $${countParams.length}`;
    }

    // 정렬 및 페이징
    query += ' ORDER BY s.created_at DESC';
    params.push(limit, offset);
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    // 데이터 조회
    const [dataResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);

    // 각 슬롯의 field_values도 함께 조회
    const slots = dataResult.rows;
    for (const slot of slots) {
      const fieldValuesResult = await pool.query(
        'SELECT field_key, value FROM slot_field_values WHERE slot_id = $1',
        [slot.id]
      );
      slot.fieldValues = fieldValuesResult.rows;
    }

    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / Number(limit));

    res.json({
      success: true,
      data: {
        items: slots,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalCount,
          totalPages
        }
      }
    });
  } catch (error) {
    console.error('Get slots error:', error);
    res.status(500).json({
      success: false,
      error: '슬롯 목록 조회 중 오류가 발생했습니다.'
    });
  }
}

// 슬롯 생성
export async function createSlot(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { keyword, url, mid, dailyBudget } = req.body;

    if (!keyword || !url) {
      return res.status(400).json({
        success: false,
        error: '키워드와 URL은 필수입니다.'
      });
    }

    // 사용자별 다음 seq 번호 가져오기
    const seqResult = await pool.query(
      'SELECT get_next_seq_for_user($1) as next_seq',
      [userId]
    );
    const nextSeq = seqResult.rows[0].next_seq;

    const result = await pool.query(
      `INSERT INTO slots (user_id, seq, keyword, url, mid, daily_budget)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, nextSeq, keyword, url, mid, dailyBudget || 0]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create slot error:', error);
    res.status(500).json({
      success: false,
      error: '슬롯 생성 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
}

// 슬롯 상태 변경
export async function updateSlotStatus(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // 유효한 상태값 체크
    const validStatuses = ['active', 'paused', 'deleted'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: '유효하지 않은 상태값입니다.'
      });
    }

    // 슬롯 조회
    const slotResult = await pool.query('SELECT * FROM slots WHERE id = $1', [id]);
    if (slotResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '슬롯을 찾을 수 없습니다.'
      });
    }

    const slot = slotResult.rows[0];

    // 권한 확인 (관리자 또는 슬롯 소유자만 가능)
    if (userRole !== 'operator' && slot.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: '권한이 없습니다.'
      });
    }

    // 상태 업데이트
    const updateResult = await pool.query(
      'UPDATE slots SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );

    res.json({
      success: true,
      data: updateResult.rows[0]
    });
  } catch (error) {
    console.error('Update slot status error:', error);
    res.status(500).json({
      success: false,
      error: '슬롯 상태 변경 중 오류가 발생했습니다.'
    });
  }
}

// 슬롯 승인/거절 (관리자 전용)
export async function approveSlot(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { approved, rejectionReason, approvedPrice } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // 관리자 권한 확인
    if (userRole !== 'operator') {
      return res.status(403).json({
        success: false,
        error: '관리자 권한이 필요합니다.'
      });
    }

    const status = approved ? 'active' : 'rejected';
    const query = approved
      ? `UPDATE slots 
         SET status = $1, approved_at = CURRENT_TIMESTAMP, approved_by = $2, approved_price = $3, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $4 RETURNING *`
      : `UPDATE slots 
         SET status = $1, rejection_reason = $2, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $3 RETURNING *`;

    const params = approved ? [status, userId, approvedPrice || null, id] : [status, rejectionReason, id];
    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '슬롯을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Approve slot error:', error);
    res.status(500).json({
      success: false,
      error: '슬롯 승인/거절 중 오류가 발생했습니다.'
    });
  }
}

// 슬롯 상세 조회
export async function getSlotById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const result = await pool.query(
      `SELECT s.*, u.email as user_email, u.full_name as user_name
       FROM slots s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '슬롯을 찾을 수 없습니다.'
      });
    }

    const slot = result.rows[0];

    // 권한 확인 (관리자 또는 슬롯 소유자만 가능)
    if (userRole !== 'operator' && slot.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: '권한이 없습니다.'
      });
    }

    res.json({
      success: true,
      data: slot
    });
  } catch (error) {
    console.error('Get slot by id error:', error);
    res.status(500).json({
      success: false,
      error: '슬롯 조회 중 오류가 발생했습니다.'
    });
  }
}

// 슬롯 수정
export async function updateSlot(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { keyword, url, mid, dailyBudget } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // 슬롯 조회
    const slotResult = await pool.query('SELECT * FROM slots WHERE id = $1', [id]);
    if (slotResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '슬롯을 찾을 수 없습니다.'
      });
    }

    const slot = slotResult.rows[0];

    // 권한 확인 (관리자 또는 슬롯 소유자만 가능)
    if (userRole !== 'operator' && slot.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: '권한이 없습니다.'
      });
    }

    // 업데이트
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (keyword !== undefined) {
      updates.push(`keyword = $${paramIndex++}`);
      values.push(keyword);
    }
    if (url !== undefined) {
      updates.push(`url = $${paramIndex++}`);
      values.push(url);
    }
    if (mid !== undefined) {
      updates.push(`mid = $${paramIndex++}`);
      values.push(mid);
    }
    if (dailyBudget !== undefined) {
      updates.push(`daily_budget = $${paramIndex++}`);
      values.push(dailyBudget);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: '업데이트할 내용이 없습니다.'
      });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const query = `UPDATE slots SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, values);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update slot error:', error);
    res.status(500).json({
      success: false,
      error: '슬롯 수정 중 오류가 발생했습니다.'
    });
  }
}

// 사용자에게 슬롯 할당 (관리자 전용)
export async function allocateSlots(req: AuthRequest, res: Response) {
  try {
    const { userId } = req.params;
    const { slotCount, startDate, endDate, workCount, amount, description } = req.body;
    const adminRole = req.user?.role;

    // 관리자 권한 확인
    if (adminRole !== 'operator') {
      return res.status(403).json({
        success: false,
        error: '관리자 권한이 필요합니다.'
      });
    }

    if (!slotCount || slotCount < 1 || slotCount > 1000) {
      return res.status(400).json({
        success: false,
        error: '유효하지 않은 슬롯 수입니다. (1~1000)'
      });
    }

    // 시스템 설정에서 선슬롯발행 모드 확인
    const slotModeResult = await pool.query(
      "SELECT value FROM system_settings WHERE key = 'slotOperationMode' AND category = 'business'"
    );
    const slotOperationMode = slotModeResult.rows[0]?.value || 'normal';

    // 트랜잭션 시작
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 기존 할당 정보 확인
      const existingAllocation = await client.query(
        'SELECT * FROM user_slot_allocations WHERE user_id = $1',
        [userId]
      );

      let allocationId;
      let totalAllocated;

      if (existingAllocation.rows.length > 0) {
        // 기존 할당에 추가
        const current = existingAllocation.rows[0];
        totalAllocated = current.allocated_slots + slotCount;
        
        await client.query(
          'UPDATE user_slot_allocations SET allocated_slots = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 RETURNING id',
          [totalAllocated, userId]
        );
        allocationId = current.id;
      } else {
        // 새로운 할당 생성
        const result = await client.query(
          'INSERT INTO user_slot_allocations (user_id, allocated_slots, used_slots) VALUES ($1, $2, 0) RETURNING id',
          [userId, slotCount]
        );
        allocationId = result.rows[0].id;
        totalAllocated = slotCount;
      }

      // 빈 슬롯 생성 - 각각 seq 번호 할당
      const startNumber = existingAllocation.rows.length > 0 
        ? existingAllocation.rows[0].allocated_slots + 1 
        : 1;

      for (let i = 0; i < slotCount; i++) {
        // 사용자별 다음 seq 번호 가져오기
        const seqResult = await client.query(
          'SELECT get_next_seq_for_user($1) as next_seq',
          [userId]
        );
        const nextSeq = seqResult.rows[0].next_seq;

        // 선슬롯발행 모드에서는 empty 상태로, 일반 모드에서는 기존대로
        const slotStatus = slotOperationMode === 'pre-allocation' ? 'empty' : 'empty';
        
        await client.query(
          `INSERT INTO slots (
            user_id, 
            seq,
            allocation_id, 
            slot_number,
            is_empty,
            status,
            keyword,
            url,
            mid,
            pre_allocation_start_date,
            pre_allocation_end_date,
            pre_allocation_work_count,
            pre_allocation_amount,
            pre_allocation_description,
            created_at
          ) VALUES ($1, $2, $3, $4, true, $5, '', '', '', $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)`,
          [
            userId, 
            nextSeq, 
            allocationId, 
            startNumber + i, 
            slotStatus,
            startDate || null,
            endDate || null,
            workCount || null,
            amount || null,
            description || null
          ]
        );
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        data: {
          userId,
          allocatedSlots: slotCount,
          totalAllocated
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Allocate slots error:', error);
    res.status(500).json({
      success: false,
      error: '슬롯 할당 중 오류가 발생했습니다.'
    });
  }
}

// 사용자의 슬롯 할당 정보 조회
export async function getUserSlotAllocation(req: AuthRequest, res: Response) {
  try {
    const { userId } = req.params;
    const requestUserId = req.user?.id;
    const userRole = req.user?.role;

    // 권한 확인 (관리자 또는 본인만 가능)
    if (userRole !== 'operator' && userId !== requestUserId) {
      return res.status(403).json({
        success: false,
        error: '권한이 없습니다.'
      });
    }

    const result = await pool.query(
      'SELECT * FROM user_slot_allocations WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: null
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get user slot allocation error:', error);
    res.status(500).json({
      success: false,
      error: '할당 정보 조회 중 오류가 발생했습니다.'
    });
  }
}

// 슬롯 필드 업데이트 (수정용)
export async function updateSlotFields(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { customFields } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // 슬롯 조회
    const slotResult = await pool.query(
      'SELECT * FROM slots WHERE id = $1',
      [id]
    );

    if (slotResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '슬롯을 찾을 수 없습니다.'
      });
    }

    const slot = slotResult.rows[0];

    // 권한 확인 (관리자 또는 슬롯 소유자만 가능)
    if (userRole !== 'operator' && slot.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: '권한이 없습니다.'
      });
    }

    // field_configs에서 유효성 검사 규칙 가져오기
    const configResult = await pool.query(
      'SELECT * FROM field_configs WHERE is_enabled = true'
    );
    const fieldConfigs = configResult.rows;

    // 유효성 검사
    const errors: string[] = [];
    for (const config of fieldConfigs) {
      const value = customFields[config.field_key];
      
      // 필수 필드 검사
      if (config.is_required && (!value || value.trim() === '')) {
        errors.push(`${config.label}은(는) 필수 입력 항목입니다.`);
        continue;
      }

      // 값이 있을 때만 타입별 유효성 검사
      if (value && value.trim() !== '') {
        // URL 타입 검사
        if (config.field_type === 'url') {
          try {
            new URL(value);
          } catch {
            errors.push(`${config.label}은(는) 올바른 URL 형식이 아닙니다.`);
          }
        }
        
        // 이메일 타입 검사
        if (config.field_type === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            errors.push(`${config.label}은(는) 올바른 이메일 형식이 아닙니다.`);
          }
        }
        
        // 숫자 타입 검사
        if (config.field_type === 'number') {
          if (isNaN(Number(value))) {
            errors.push(`${config.label}은(는) 숫자여야 합니다.`);
          }
        }
        
        // 커스텀 validation_rule 검사
        if (config.validation_rule) {
          try {
            const regex = new RegExp(config.validation_rule);
            if (!regex.test(value)) {
              errors.push(`${config.label}의 형식이 올바르지 않습니다.`);
            }
          } catch (e) {
            // 잘못된 정규식은 무시
          }
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: errors.join(', ')
      });
    }

    // 트랜잭션 시작
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // URL 파싱하여 추가 필드 생성
      const finalFields = { ...customFields };
      if (customFields.url) {
        const parsedUrlFields = parseUrl(customFields.url);
        // 파싱된 필드를 customFields에 추가
        Object.assign(finalFields, parsedUrlFields);
      }
      
      // slot_field_values 업데이트
      let urlValue = '';
      let keywordValue = '';
      let midValue = '';
      
      for (const [fieldKey, value] of Object.entries(finalFields)) {
        if (value !== undefined && value !== null) {
          await client.query(
            `INSERT INTO slot_field_values (slot_id, field_key, value)
             VALUES ($1, $2, $3)
             ON CONFLICT (slot_id, field_key) 
             DO UPDATE SET value = $3, updated_at = CURRENT_TIMESTAMP`,
            [id, fieldKey, value]
          );
          
          // slots 테이블 업데이트를 위해 값 저장
          if (fieldKey === 'url') urlValue = String(value);
          if (fieldKey === 'keyword') keywordValue = String(value);
          if (fieldKey === 'mid') midValue = String(value);
        }
      }

      // slots 테이블의 기본 필드도 업데이트
      await client.query(
        `UPDATE slots 
         SET url = $2,
             keyword = $3,
             mid = $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id, urlValue, keywordValue, midValue]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: '슬롯이 성공적으로 수정되었습니다.'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update slot fields error:', error);
    res.status(500).json({
      success: false,
      error: '슬롯 수정 중 오류가 발생했습니다.'
    });
  }
}

// 슬롯의 필드 값 조회
export async function getSlotFieldValues(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // 슬롯 조회
    const slotResult = await pool.query(
      'SELECT * FROM slots WHERE id = $1',
      [id]
    );

    if (slotResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '슬롯을 찾을 수 없습니다.'
      });
    }

    const slot = slotResult.rows[0];

    // 권한 확인 (관리자 또는 슬롯 소유자만 가능)
    if (userRole !== 'operator' && slot.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: '권한이 없습니다.'
      });
    }

    // 필드 값들 조회
    const fieldValuesResult = await pool.query(
      'SELECT field_key, value FROM slot_field_values WHERE slot_id = $1',
      [id]
    );

    res.json({
      success: true,
      slot: slot,
      fieldValues: fieldValuesResult.rows
    });
  } catch (error) {
    console.error('Get slot field values error:', error);
    res.status(500).json({
      success: false,
      error: '필드 값 조회 중 오류가 발생했습니다.'
    });
  }
}

// 빈 슬롯 채우기 (사용자용)
export async function fillEmptySlot(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { customFields, keyword, url, mid } = req.body;
    const userId = req.user?.id;
    

    // 슬롯 조회
    const slotResult = await pool.query(
      'SELECT * FROM slots WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (slotResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '슬롯을 찾을 수 없습니다.'
      });
    }

    const slot = slotResult.rows[0];

    // 빈 슬롯인지 확인
    if (!slot.is_empty) {
      return res.status(400).json({
        success: false,
        error: '이미 사용 중인 슬롯입니다.'
      });
    }

    // 동적 필드 값들 저장
    let urlValue = url || '';
    let keywordValue = keyword || '';
    let midValue = mid || '';
    
    // 개별 필드와 customFields 병합
    const allFields = {
      ...(customFields || {}),
      ...(keyword && { keyword }),
      ...(url && { url }),
      ...(mid && { mid })
    };
    
    if (Object.keys(allFields).length > 0) {
      // URL 파싱하여 추가 필드 생성
      const finalFields = { ...allFields };
      const urlToUse = url || allFields.url;
      if (urlToUse) {
        const parsedUrlFields = parseUrl(urlToUse);
        // 파싱된 필드를 finalFields에 추가
        Object.assign(finalFields, parsedUrlFields);
        urlValue = urlToUse;
      }
      
      // 기존 값들 삭제
      await pool.query(
        'DELETE FROM slot_field_values WHERE slot_id = $1',
        [id]
      );
      
      // 새로운 값들 삽입 (파싱된 필드 포함)
      for (const [fieldKey, value] of Object.entries(finalFields)) {
        if (value) {
          // field_configs에 존재하는 필드만 저장
          const fieldExistsResult = await pool.query(
            'SELECT field_key FROM field_configs WHERE field_key = $1',
            [fieldKey]
          );
          
          if (fieldExistsResult.rows.length > 0) {
            await pool.query(
              `INSERT INTO slot_field_values (slot_id, field_key, value)
               VALUES ($1, $2, $3)
               ON CONFLICT (slot_id, field_key) 
               DO UPDATE SET value = $3, updated_at = CURRENT_TIMESTAMP`,
              [id, fieldKey, value]
            );
          }
          
          // slots 테이블 업데이트를 위해 기본 필드 값 저장
          if (fieldKey === 'keyword') keywordValue = value as string;
          if (fieldKey === 'mid') midValue = value as string;
        }
      }
    }
    
    // 시스템 설정에서 slotOperationMode 확인
    const settingsResult = await pool.query(
      "SELECT value FROM system_settings WHERE key = 'slotOperationMode' AND category = 'business'"
    );
    const slotOperationMode = settingsResult.rows.length > 0 ? settingsResult.rows[0].value : 'normal';
    
    // 선슬롯발행 모드에서는 자동 승인 (active), 일반 모드에서는 대기(pending)
    const newStatus = slotOperationMode === 'pre-allocation' ? 'active' : 'pending';
    
    
    // 슬롯 상태 및 기본 필드 업데이트
    const updateResult = await pool.query(
      `UPDATE slots 
       SET is_empty = false,
           status = $6::varchar,
           url = $3,
           keyword = $4,
           mid = $5,
           updated_at = CURRENT_TIMESTAMP,
           approved_at = CASE WHEN $7::varchar = 'active' THEN CURRENT_TIMESTAMP ELSE approved_at END
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, urlValue, keywordValue, midValue, newStatus, newStatus]
    );

    res.json({
      success: true,
      data: updateResult.rows[0]
    });
  } catch (error) {
    console.error('[ERROR] Fill empty slot error:', error);
    console.error('[ERROR] Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
      table: error.table,
      column: error.column
    });
    res.status(500).json({
      success: false,
      error: '슬롯 채우기 중 오류가 발생했습니다.'
    });
  }
}
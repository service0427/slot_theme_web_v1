import { Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest } from '../middleware/auth';

// 슬롯 변경 로그 기록 헬퍼 함수
async function logSlotChange(
  slotId: string,
  userId: string,
  changeType: 'field_update' | 'status_change' | 'fill_empty' | 'approve' | 'reject' | 'refund',
  fieldKey?: string,
  oldValue?: any,
  newValue?: any,
  description?: string,
  req?: AuthRequest
) {
  try {
    await pool.query(`
      INSERT INTO slot_change_logs (slot_id, user_id, change_type, field_key, old_value, new_value, description, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      slotId,
      userId,
      changeType,
      fieldKey || null,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null,
      description || null,
      req?.ip || null,
      req?.get('User-Agent') || null
    ]);
  } catch (error) {
    // 로그 기록 실패: error
    // 로그 기록 실패가 주요 기능을 방해하지 않도록 에러를 던지지 않음
  }
}

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
    const userRole = req.user?.role;
    // 쿼리 파라미터에서 userId가 있으면 사용, 없으면 현재 로그인한 사용자 ID 사용
    const { userId: queryUserId, page = 1, limit = 10, search = '', status = '' } = req.query;
    const userId = queryUserId || req.user?.id;

    const offset = (Number(page) - 1) * Number(limit);
    let query = '';
    let countQuery = '';
    const params: any[] = [];
    const countParams: any[] = [];

    // 관리자/개발자가 특정 사용자의 슬롯을 조회하는 경우
    if ((userRole === 'operator' || userRole === 'developer') && queryUserId) {
      params.push(queryUserId);
      countParams.push(queryUserId);
      
      // 개발자 권한일 때는 v2_rank_daily 사용
      if (userRole === 'developer') {
        query = `
          SELECT s.*, 
                 u.email as user_email, 
                 u.full_name as user_name, 
                 s.approved_price, 
                 s.product_name, 
                 COALESCE(v2_rd.thumbnail, s.thumbnail) as thumbnail,
                 COALESCE(v2_rd.rank, 0) as current_rank,
                 v2_rd.prev_rank as yesterday_rank,
                 v2_rd.rating,
                 v2_rd.review_count,
                 v2_rd.product_name as v2_product_name,
                 CASE 
                   WHEN s.created_at <= NOW() - INTERVAL '10 minutes' AND v2_rd.rank IS NULL THEN true
                   ELSE false
                 END as is_processing,
                 sah.payment as payment_completed,
                 s.parent_slot_id,
                 s.extension_days,
                 s.extended_at,
                 s.extended_by,
                 s.extension_type,
                 CASE WHEN s.parent_slot_id IS NOT NULL THEN true ELSE false END as is_extended,
                 EXISTS(SELECT 1 FROM slots child WHERE child.parent_slot_id = s.id) as has_extension,
                 'v2_rank_daily' as rank_source
          FROM slots s
          JOIN users u ON s.user_id = u.id
          LEFT JOIN v2_rank_daily v2_rd ON 
            v2_rd.keyword = COALESCE(s.trim_keyword, REPLACE(s.keyword, ' ', '')) 
            AND v2_rd.product_id = SUBSTRING(s.url FROM 'products/([0-9]+)')
            AND v2_rd.item_id = SUBSTRING(s.url FROM 'itemId=([0-9]+)')
            AND v2_rd.vendor_item_id = SUBSTRING(s.url FROM 'vendorItemId=([0-9]+)')
            AND v2_rd.date = CURRENT_DATE
          LEFT JOIN slot_allocation_history sah ON s.allocation_history_id = sah.id
          WHERE s.user_id = $1
        `;
      } else {
        // 운영자는 기존 rank_daily 사용
        query = `
          SELECT s.*, 
                 u.email as user_email, 
                 u.full_name as user_name, 
                 s.approved_price, 
                 s.product_name, 
                 COALESCE(rd_today.thumbnail, s.thumbnail) as thumbnail,
                 COALESCE(rd_today.rank, 0) as current_rank,
                 rd_yesterday.rank as yesterday_rank,
                 rd_today.fail_count as fail_count,
                 CASE 
                   WHEN s.created_at <= NOW() - INTERVAL '10 minutes' AND rd_today.rank IS NULL THEN true
                   ELSE false
                 END as is_processing,
                 sah.payment as payment_completed,
                 s.parent_slot_id,
                 s.extension_days,
                 s.extended_at,
                 s.extended_by,
                 s.extension_type,
                 CASE WHEN s.parent_slot_id IS NOT NULL THEN true ELSE false END as is_extended,
                 EXISTS(SELECT 1 FROM slots child WHERE child.parent_slot_id = s.id) as has_extension,
                 'rank_daily' as rank_source
          FROM slots s
          JOIN users u ON s.user_id = u.id
          LEFT JOIN rank_daily rd_today ON rd_today.slot_id = s.id AND rd_today.date = CURRENT_DATE
          LEFT JOIN rank_daily rd_yesterday ON rd_yesterday.slot_id = s.id AND rd_yesterday.date = CURRENT_DATE - INTERVAL '1 day'
          LEFT JOIN slot_allocation_history sah ON s.allocation_history_id = sah.id
          WHERE s.user_id = $1
        `;
      }
      countQuery = 'SELECT COUNT(*) FROM slots s WHERE s.user_id = $1';
    }
    // 관리자/개발자가 모든 슬롯 조회
    else if (userRole === 'operator' || userRole === 'developer') {
      // 개발자 권한일 때는 v2_rank_daily 사용
      if (userRole === 'developer') {
        query = `
          SELECT s.*, 
                 u.email as user_email, 
                 u.full_name as user_name,
                 u.is_active as user_is_active, 
                 s.approved_price, 
                 s.product_name, 
                 COALESCE(v2_rd.thumbnail, s.thumbnail) as thumbnail,
                 COALESCE(v2_rd.rank, 0) as current_rank,
                 v2_rd.prev_rank as yesterday_rank,
                 v2_rd.rating,
                 v2_rd.review_count,
                 v2_rd.product_name as v2_product_name,
                 CASE 
                   WHEN s.created_at <= NOW() - INTERVAL '10 minutes' AND v2_rd.rank IS NULL THEN true
                   ELSE false
                 END as is_processing,
                 sah.payment as payment_completed,
                 s.parent_slot_id,
                 s.extension_days,
                 s.extended_at,
                 s.extended_by,
                 s.extension_type,
                 CASE WHEN s.parent_slot_id IS NOT NULL THEN true ELSE false END as is_extended,
                 EXISTS(SELECT 1 FROM slots child WHERE child.parent_slot_id = s.id) as has_extension,
                 'v2_rank_daily' as rank_source
        FROM slots s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN v2_rank_daily v2_rd ON 
          v2_rd.keyword = COALESCE(s.trim_keyword, REPLACE(s.keyword, ' ', '')) 
          AND v2_rd.product_id = SUBSTRING(s.url FROM 'products/([0-9]+)')
          AND v2_rd.item_id = SUBSTRING(s.url FROM 'itemId=([0-9]+)')
          AND v2_rd.vendor_item_id = SUBSTRING(s.url FROM 'vendorItemId=([0-9]+)')
          AND v2_rd.date = CURRENT_DATE
        LEFT JOIN slot_allocation_history sah ON s.allocation_history_id = sah.id
        WHERE 1=1
      `;
      } else {
        // 운영자는 기존 rank_daily 사용
        query = `
          SELECT s.*, 
                 u.email as user_email, 
                 u.full_name as user_name,
                 u.is_active as user_is_active, 
                 s.approved_price, 
                 s.product_name, 
                 COALESCE(rd_today.thumbnail, s.thumbnail) as thumbnail,
                 COALESCE(rd_today.rank, 0) as current_rank,
                 rd_yesterday.rank as yesterday_rank,
                 rd_today.fail_count as fail_count,
                 CASE 
                   WHEN s.created_at <= NOW() - INTERVAL '10 minutes' AND rd_today.rank IS NULL THEN true
                   ELSE false
                 END as is_processing,
                 sah.payment as payment_completed,
                 s.parent_slot_id,
                 s.extension_days,
                 s.extended_at,
                 s.extended_by,
                 s.extension_type,
                 CASE WHEN s.parent_slot_id IS NOT NULL THEN true ELSE false END as is_extended,
                 EXISTS(SELECT 1 FROM slots child WHERE child.parent_slot_id = s.id) as has_extension,
                 'rank_daily' as rank_source
        FROM slots s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN rank_daily rd_today ON rd_today.slot_id = s.id AND rd_today.date = CURRENT_DATE
        LEFT JOIN rank_daily rd_yesterday ON rd_yesterday.slot_id = s.id AND rd_yesterday.date = CURRENT_DATE - INTERVAL '1 day'
        LEFT JOIN slot_allocation_history sah ON s.allocation_history_id = sah.id
        WHERE 1=1
      `;
      }
      countQuery = 'SELECT COUNT(*) FROM slots s WHERE 1=1';
    } 
    // 일반 사용자는 자신의 슬롯만 조회
    else {
      params.push(userId);
      countParams.push(userId);
      query = `
        SELECT s.*, 
               u.email as user_email, 
               u.full_name as user_name, 
               s.approved_price, 
               s.product_name, 
               COALESCE(rd_today.thumbnail, s.thumbnail) as thumbnail,
               COALESCE(rd_today.rank, 0) as current_rank,
               rd_yesterday.rank as yesterday_rank,
               rd_today.fail_count as fail_count,
               CASE 
                 WHEN s.created_at <= NOW() - INTERVAL '10 minutes' AND rd_today.rank IS NULL THEN true
                 ELSE false
               END as is_processing,
               sah.payment as payment_completed,
               s.parent_slot_id,
               s.extension_days,
               s.extended_at,
               s.extended_by,
               s.extension_type,
               CASE WHEN s.parent_slot_id IS NOT NULL THEN true ELSE false END as is_extended,
               EXISTS(SELECT 1 FROM slots child WHERE child.parent_slot_id = s.id) as has_extension
        FROM slots s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN rank_daily rd_today ON rd_today.slot_id = s.id AND rd_today.date = CURRENT_DATE
        LEFT JOIN rank_daily rd_yesterday ON rd_yesterday.slot_id = s.id AND rd_yesterday.date = CURRENT_DATE - INTERVAL '1 day'
        LEFT JOIN slot_allocation_history sah ON s.allocation_history_id = sah.id
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
      // 'inactive'는 비활성화된 사용자의 슬롯을 조회
      if (status === 'inactive') {
        query += ` AND u.is_active = false`;
        countQuery += ` AND EXISTS (SELECT 1 FROM users u WHERE u.id = s.user_id AND u.is_active = false)`;
      } else {
        params.push(status);
        countParams.push(status);
        query += ` AND s.status = $${params.length}`;
        countQuery += ` AND s.status = $${countParams.length}`;
        // 기본적으로 활성화된 사용자의 슬롯만 조회 (inactive가 아닌 경우)
        query += ` AND u.is_active = true`;
        countQuery += ` AND EXISTS (SELECT 1 FROM users u WHERE u.id = s.user_id AND u.is_active = true)`;
      }
    } else {
      // 상태 필터가 없을 때도 기본적으로 활성화된 사용자의 슬롯만 조회
      query += ` AND u.is_active = true`;
      countQuery += ` AND EXISTS (SELECT 1 FROM users u WHERE u.id = s.user_id AND u.is_active = true)`;
    }

    // 정렬 및 페이징
    query += ' ORDER BY s.created_at DESC';
    params.push(limit, offset);
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    // 디버그: 실행할 쿼리 출력
    // [DEBUG] Query: query
    // [DEBUG] Params: params
    
    // 데이터 조회
    const [dataResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);

    const slots = dataResult.rows;
    
    // 디버그: 모든 슬롯 데이터 확인
    // [DEBUG] Total slots found: slots.length
    // if (slots.length > 0) {
    //   [DEBUG] First 3 slots: slots.slice(0, 3).map(...)
    //   
    //   fc5726f1로 시작하는 슬롯 찾기
    //   const targetSlot = slots.find(s => s.id.startsWith('fc5726f1'));
    //   if (targetSlot) {
    //     [DEBUG] Found target slot fc5726f1: {...}
    //   } else {
    //     [DEBUG] Target slot fc5726f1 NOT FOUND in results
    //   }
    // }
    
    // 슬롯 ID 목록 추출
    const slotIds = slots.map(slot => slot.id);
    
    if (slotIds.length > 0) {
      // 모든 field_values를 한 번에 조회
      const fieldValuesResult = await pool.query(
        'SELECT slot_id, field_key, value FROM slot_field_values WHERE slot_id = ANY($1)',
        [slotIds]
      );
      
      // 슬롯별로 field_values 그룹화
      const fieldValuesBySlot: Record<string, any[]> = {};
      fieldValuesResult.rows.forEach(fv => {
        if (!fieldValuesBySlot[fv.slot_id]) {
          fieldValuesBySlot[fv.slot_id] = [];
        }
        fieldValuesBySlot[fv.slot_id].push({
          field_key: fv.field_key,
          value: fv.value
        });
      });
      
      // 각 슬롯에 field_values 할당
      slots.forEach(slot => {
        slot.fieldValues = fieldValuesBySlot[slot.id] || [];
      });
    }
    
    // 디버그: rank 데이터 확인
    if (slots.length > 0) {
      // 특정 슬롯 찾기
      const targetSlot = slots.find(s => s.id === '68d62365-d548-452c-aecf-ccc7af611ad7');
      if (targetSlot) {
        console.log('[DEBUG] Target slot (68d62365) rank data:', {
          id: targetSlot.id,
          current_rank: targetSlot.current_rank,
          yesterday_rank: targetSlot.yesterday_rank,
          is_processing: targetSlot.is_processing,
          fail_count: targetSlot.fail_count
        });
      }
    }
    
    // current_rank를 rank로 맵핑 (프론트엔드 호환성)
    // 개발자는 current_rank를 유지, 다른 권한은 rank로 맵핑
    if (userRole !== 'developer') {
      slots.forEach(slot => {
        slot.rank = slot.current_rank;
        delete slot.current_rank;
      });
    }
    
    // 맵핑 후 데이터 확인
    const targetSlotAfter = slots.find(s => s.id === '68d62365-d548-452c-aecf-ccc7af611ad7');
    if (targetSlotAfter) {
      console.log('[DEBUG] After mapping - Target slot:', {
        id: targetSlotAfter.id,
        rank: targetSlotAfter.rank,
        yesterday_rank: targetSlotAfter.yesterday_rank,
        is_processing: targetSlotAfter.is_processing
      });
    }

    // 일반 사용자인 경우 파싱 데이터 제거
    if (userRole !== 'operator' && userRole !== 'developer') {
      slots.forEach(slot => {
        // 파싱된 URL 관련 필드 제거
        delete slot.url_product_id;
        delete slot.url_item_id;
        delete slot.url_vendor_item_id;
      });
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
    // Get slots error: error
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

    // keyword에서 모든 공백 제거 (앞, 중간, 뒤)
    const trimKeyword = keyword.replace(/\s+/g, '');

    const result = await pool.query(
      `INSERT INTO slots (user_id, seq, keyword, trim_keyword, url, mid, daily_budget)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, nextSeq, keyword, trimKeyword, url, mid, dailyBudget || 0]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    // Create slot error: error
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
    const { status, refundReason } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // 유효한 상태값 체크
    const validStatuses = ['active', 'paused', 'deleted', 'refunded'];
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

    // 환불은 관리자/개발자만 처리 가능
    if (status === 'refunded' && userRole !== 'operator' && userRole !== 'developer') {
      return res.status(403).json({
        success: false,
        error: '환불 처리는 관리자만 가능합니다.'
      });
    }

    // 권한 확인 (관리자/개발자 또는 슬롯 소유자만 가능)
    if (userRole !== 'operator' && userRole !== 'developer' && slot.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: '권한이 없습니다.'
      });
    }

    // 상태 업데이트 (환불일 경우 환불 사유와 처리자도 함께 저장)
    let updateResult;
    if (status === 'refunded') {
      updateResult = await pool.query(
        'UPDATE slots SET status = $1, refund_reason = $2, refunded_by = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
        [status, refundReason, userId, id]
      );
    } else {
      updateResult = await pool.query(
        'UPDATE slots SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [status, id]
      );
    }

    // 상태 변경 로그 기록
    await logSlotChange(
      id,
      userId!,
      'status_change',
      'status',
      slot.status, // 이전 상태
      status, // 새로운 상태
      status === 'refunded' ? `환불 처리: ${refundReason}` : `상태 변경: ${slot.status} → ${status}`,
      req
    );

    res.json({
      success: true,
      data: updateResult.rows[0]
    });
  } catch (error) {
    // Update slot status error: error
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

    // 관리자/개발자 권한 확인
    if (userRole !== 'operator' && userRole !== 'developer') {
      return res.status(403).json({
        success: false,
        error: '관리자/개발자 권한이 필요합니다.'
      });
    }

    // 변경 전 슬롯 정보 조회
    const slotResult = await pool.query('SELECT * FROM slots WHERE id = $1', [id]);
    if (slotResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '슬롯을 찾을 수 없습니다.'
      });
    }
    const oldSlot = slotResult.rows[0];

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

    // 승인/거절 로그 기록
    await logSlotChange(
      id,
      userId!,
      approved ? 'approve' : 'reject',
      'status',
      oldSlot.status, // 이전 상태
      status, // 새로운 상태
      approved 
        ? `슬롯 승인${approvedPrice ? ` (가격: ${approvedPrice}원)` : ''}` 
        : `슬롯 거절: ${rejectionReason}`,
      req
    );

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    // Approve slot error: error
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

    // 권한 확인 (관리자/개발자 또는 슬롯 소유자만 가능)
    if (userRole !== 'operator' && userRole !== 'developer' && slot.user_id !== userId) {
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
    // Get slot by id error: error
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

    // 권한 확인 (관리자/개발자 또는 슬롯 소유자만 가능)
    if (userRole !== 'operator' && userRole !== 'developer' && slot.user_id !== userId) {
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
      // keyword가 변경되면 trim_keyword도 함께 업데이트
      const trimKeyword = keyword.replace(/\s+/g, '');
      updates.push(`trim_keyword = $${paramIndex++}`);
      values.push(trimKeyword);
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
    // Update slot error: error
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
    const adminId = req.user?.id;

    // 관리자/개발자 권한 확인
    if (adminRole !== 'operator' && adminRole !== 'developer') {
      return res.status(403).json({
        success: false,
        error: '관리자/개발자 권한이 필요합니다.'
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

      // 먼저 slot_allocation_history 생성 (ID를 받기 위해)
      const userResult = await client.query(
        'SELECT full_name, email FROM users WHERE id = $1',
        [userId]
      );
      const adminResult = await client.query(
        'SELECT full_name FROM users WHERE id = $1',
        [adminId]
      );
      
      const historyResult = await client.query(
        `INSERT INTO slot_allocation_history (
          operator_id,
          operator_name,
          user_id,
          user_name,
          user_email,
          slot_count,
          price_per_slot,
          reason,
          memo
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [
          adminId,
          adminResult.rows[0]?.full_name || 'Admin',
          userId,
          userResult.rows[0]?.full_name || '',
          userResult.rows[0]?.email || '',
          slotCount,
          amount || 0,
          `선슬롯 ${slotCount}개 발행`,
          description || null
        ]
      );
      const allocationHistoryId = historyResult.rows[0].id;

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
            allocation_history_id, 
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
          ) VALUES ($1, $2, $3, $4, $5, true, $6, NULL, NULL, NULL, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)`,
          [
            userId, 
            nextSeq, 
            allocationId,
            allocationHistoryId,  // 새로 추가
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

      // slot_allocation_history는 이미 위에서 생성했으므로 제거

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
    // Allocate slots error: error
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

    // 권한 확인 (관리자/개발자 또는 본인만 가능)
    if (userRole !== 'operator' && userRole !== 'developer' && userId !== requestUserId) {
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
    // Get user slot allocation error: error
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

    // 권한 확인 (관리자/개발자 또는 슬롯 소유자만 가능)
    if (userRole !== 'operator' && userRole !== 'developer' && slot.user_id !== userId) {
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

    // customFields 정리 (쿠팡 URL의 경우 필요한 파라미터만 남김)
    const cleanedFields: Record<string, any> = {};
    for (const [key, value] of Object.entries(customFields)) {
      if (key === 'url' && value && typeof value === 'string') {
        // URL 공백 제거
        let cleanUrl = value.trim().replace(/\s+/g, '');
        
        if (cleanUrl.includes('coupang.com')) {
          // 쿠팡 URL 검증
          const productMatch = cleanUrl.match(/\/products\/(\d+)/);
          const hasItemId = cleanUrl.includes('itemId=');
          const hasVendorItemId = cleanUrl.includes('vendorItemId=');
          
          if (!productMatch || !hasItemId || !hasVendorItemId) {
            return res.status(400).json({
              success: false,
              error: '쿠팡 URL 형식이 올바르지 않습니다. 필수 요소: /products/{상품ID}?itemId={아이템ID}&vendorItemId={판매자ID}'
            });
          }
          
          // URL 파싱하여 필요한 파라미터만 추출
          try {
            const urlObj = new URL(cleanUrl);
            const itemId = urlObj.searchParams.get('itemId');
            const vendorItemId = urlObj.searchParams.get('vendorItemId');
            const productId = productMatch[1];
            
            // 새로운 URL 생성 (필요한 파라미터만 포함)
            const finalUrl = new URL(`https://www.coupang.com/vp/products/${productId}`);
            if (itemId) finalUrl.searchParams.set('itemId', itemId);
            if (vendorItemId) finalUrl.searchParams.set('vendorItemId', vendorItemId);
            
            cleanedFields[key] = finalUrl.toString();
          } catch (e) {
            return res.status(400).json({
              success: false,
              error: 'URL 형식이 올바르지 않습니다.'
            });
          }
        } else {
          cleanedFields[key] = cleanUrl;
        }
      } else {
        cleanedFields[key] = value;
      }
    }

    // 유효성 검사
    const errors: string[] = [];
    for (const config of fieldConfigs) {
      const value = cleanedFields[config.field_key];
      
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
            
            // 쿠팡 URL 검증 - itemId가 필수 (이미 위에서 처리했지만 안전을 위해)
            if (value.includes('coupang.com') && !value.includes('itemId=')) {
              errors.push('쿠팡 URL은 itemId 파라미터가 필수입니다. (예: itemId=25423383153&vendorItemId=92416542502)');
            }
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

    // 기존 슬롯 정보 조회
    const existingSlotResult = await pool.query(
      'SELECT * FROM slots WHERE id = $1',
      [id]
    );
    
    if (existingSlotResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '슬롯을 찾을 수 없습니다.'
      });
    }
    
    const existingSlot = existingSlotResult.rows[0];

    // 변경 전 필드 값들을 조회하여 로그 기록 준비
    const existingFieldsResult = await pool.query(
      'SELECT field_key, value FROM slot_field_values WHERE slot_id = $1',
      [id]
    );
    const existingFields: Record<string, any> = {};
    existingFieldsResult.rows.forEach(row => {
      existingFields[row.field_key] = row.value;
    });

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

      // 실제로 변경된 필드들을 추적
      const changes: Array<{field: string, oldValue: any, newValue: any}> = [];
      
      // slot_field_values 업데이트
      let urlValue = '';
      let keywordValue = '';
      let midValue = '';
      
      for (const [fieldKey, value] of Object.entries(finalFields)) {
        if (value !== undefined && value !== null) {
          const oldValue = existingFields[fieldKey];
          const newValue = String(value);
          
          // 값이 실제로 변경된 경우에만 변경 로그에 추가
          if (oldValue !== newValue) {
            changes.push({
              field: fieldKey,
              oldValue: oldValue,
              newValue: newValue
            });
          }

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

      // keyword가 있으면 trim_keyword도 계산
      const trimKeywordValue = keywordValue ? keywordValue.replace(/\s+/g, '') : '';

      // URL이 변경되었으면 파싱하여 관련 필드 업데이트
      if (urlValue && urlValue !== existingSlot.url) {
        const parsedUrlFields = parseUrl(urlValue);
        
        for (const [parsedKey, parsedValue] of Object.entries(parsedUrlFields)) {
          await client.query(
            `INSERT INTO slot_field_values (slot_id, field_key, value)
             VALUES ($1, $2, $3)
             ON CONFLICT (slot_id, field_key) 
             DO UPDATE SET value = $3, updated_at = CURRENT_TIMESTAMP`,
            [id, parsedKey, parsedValue]
          );
        }
      }

      // slots 테이블의 기본 필드도 업데이트
      await client.query(
        `UPDATE slots 
         SET url = $2,
             keyword = $3,
             trim_keyword = $4,
             mid = $5,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id, urlValue, keywordValue, trimKeywordValue, midValue]
      );

      await client.query('COMMIT');

      // 변경 사항이 있을 경우에만 로그 기록
      if (changes.length > 0) {
        const fieldKeys = changes.map(c => c.field);
        const oldValues = changes.reduce((acc, c) => ({ ...acc, [c.field]: c.oldValue }), {});
        const newValues = changes.reduce((acc, c) => ({ ...acc, [c.field]: c.newValue }), {});
        
        await logSlotChange(
          id,
          userId!,
          'field_update',
          JSON.stringify(fieldKeys), // 여러 필드 변경시 JSON 배열로 저장
          oldValues,
          newValues,
          `${changes.length}개 필드 수정: ${fieldKeys.join(', ')}`,
          req
        );
      }

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
    // Update slot fields error: error
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

    // 권한 확인 (관리자/개발자 또는 슬롯 소유자만 가능)
    if (userRole !== 'operator' && userRole !== 'developer' && slot.user_id !== userId) {
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
    // Get slot field values error: error
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
    
    // URL 공백 제거 및 정리
    if (url) {
      urlValue = url.trim().replace(/\s+/g, '');
      
      // 쿠팡 URL 검증 및 정리
      if (urlValue.includes('coupang.com')) {
        // products, itemId, vendorItemId 모두 필수
        const productMatch = urlValue.match(/\/products\/(\d+)/);
        const hasItemId = urlValue.includes('itemId=');
        const hasVendorItemId = urlValue.includes('vendorItemId=');
        
        if (!productMatch || !hasItemId || !hasVendorItemId) {
          return res.status(400).json({
            success: false,
            error: '쿠팡 URL 형식이 올바르지 않습니다. 필수 요소: /products/{상품ID}?itemId={아이템ID}&vendorItemId={판매자ID}'
          });
        }
        
        // URL 파싱하여 필요한 파라미터만 추출
        try {
          const urlObj = new URL(urlValue);
          const itemId = urlObj.searchParams.get('itemId');
          const vendorItemId = urlObj.searchParams.get('vendorItemId');
          const productId = productMatch[1];
          
          // 새로운 URL 생성 (필요한 파라미터만 포함)
          const cleanUrl = new URL(`https://www.coupang.com/vp/products/${productId}`);
          if (itemId) cleanUrl.searchParams.set('itemId', itemId);
          if (vendorItemId) cleanUrl.searchParams.set('vendorItemId', vendorItemId);
          
          urlValue = cleanUrl.toString();
        } catch (e) {
          return res.status(400).json({
            success: false,
            error: 'URL 형식이 올바르지 않습니다.'
          });
        }
      }
    }
    
    // 개별 필드와 customFields 병합
    const allFields = {
      ...(customFields || {}),
      ...(keyword && { keyword }),
      ...(url && { url }),
      ...(mid && { mid })
    };
    
    // 기존 값들 삭제 (항상 실행 - 빈 슬롯도 처리)
    await pool.query(
      'DELETE FROM slot_field_values WHERE slot_id = $1',
      [id]
    );
    
    // 필드가 있을 경우에만 저장
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
    
    // keyword에서 모든 공백 제거
    const trimKeywordValue = keywordValue ? keywordValue.replace(/\s+/g, '') : '';
    
    // 슬롯 상태 및 기본 필드 업데이트
    const updateResult = await pool.query(
      `UPDATE slots 
       SET is_empty = false,
           status = $6::varchar,
           url = $3,
           keyword = $4,
           trim_keyword = $7,
           mid = $5,
           updated_at = CURRENT_TIMESTAMP,
           approved_at = CASE WHEN $8::varchar = 'active' THEN CURRENT_TIMESTAMP ELSE approved_at END
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, urlValue, keywordValue, midValue, newStatus, trimKeywordValue, newStatus]
    );

    // 빈 슬롯 채우기 로그 기록
    await logSlotChange(
      id,
      userId!,
      'fill_empty',
      'slot_filled', // 빈 슬롯 채우기는 특별한 액션이므로 별도 field_key
      { is_empty: true, status: 'empty' }, // 이전 상태
      { is_empty: false, status: newStatus, ...allFields }, // 새로운 상태
      `빈 슬롯 채우기: ${Object.keys(allFields).length}개 필드 추가`,
      req
    );

    res.json({
      success: true,
      data: updateResult.rows[0]
    });
  } catch (error) {
    // [ERROR] Fill empty slot error: error
    // [ERROR] Error details: {
    //   message: error.message,
    //   code: error.code,
    //   detail: error.detail,
    //   constraint: error.constraint,
    //   table: error.table,
    //   column: error.column
    // }
    res.status(500).json({
      success: false,
      error: '슬롯 채우기 중 오류가 발생했습니다.'
    });
  }
}

// 슬롯 개수만 조회 (관리자 대시보드용)
export async function getSlotCount(req: AuthRequest, res: Response) {
  try {
    const userRole = req.user?.role;
    const { status = '', userId: queryUserId } = req.query;

    let countQuery = '';
    const countParams: any[] = [];
    
    // 관리자/개발자가 특정 사용자의 슬롯 개수를 조회하는 경우
    if ((userRole === 'operator' || userRole === 'developer') && queryUserId) {
      // 전체 슬롯 개수와 사용중인 슬롯 개수를 한 번에 조회
      const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status != 'empty' THEN 1 END) as used
        FROM slots 
        WHERE user_id = $1
      `;
      const result = await pool.query(query, [queryUserId]);
      
      return res.json({
        success: true,
        data: { 
          allocated: parseInt(result.rows[0].total),
          used: parseInt(result.rows[0].used)
        }
      });
    }
    // 관리자/개발자는 모든 슬롯 개수, 일반 사용자는 자신의 슬롯 개수만
    else if (userRole === 'operator' || userRole === 'developer') {
      countQuery = 'SELECT COUNT(*) FROM slots s WHERE 1=1';
    } else {
      countParams.push(req.user?.id);
      countQuery = 'SELECT COUNT(*) FROM slots s WHERE s.user_id = $1';
    }

    // 상태 필터
    if (status) {
      countParams.push(status);
      countQuery += ` AND s.status = $${countParams.length}`;
    }

    const countResult = await pool.query(countQuery, countParams);
    const count = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '슬롯 개수 조회 중 오류가 발생했습니다.'
    });
  }
}

// 슬롯 변경 로그 조회 API
export async function getSlotChangeLogs(req: AuthRequest, res: Response) {
  try {
    const { id: slotId } = req.params;  // 라우트에서 :id로 받음
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // 슬롯 존재 여부 및 권한 확인
    const slotResult = await pool.query(
      'SELECT user_id FROM slots WHERE id = $1',
      [slotId]
    );

    if (slotResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '슬롯을 찾을 수 없습니다.'
      });
    }

    const slotOwner = slotResult.rows[0].user_id;
    
    // 권한 확인 (관리자/개발자 또는 슬롯 소유자만 가능)
    if (userRole !== 'operator' && userRole !== 'developer' && slotOwner !== userId) {
      return res.status(403).json({
        success: false,
        error: '권한이 없습니다.'
      });
    }

    const offset = (Number(page) - 1) * Number(limit);

    // 변경 로그 조회 (사용자 정보 포함)
    const logsResult = await pool.query(`
      SELECT 
        scl.*,
        u.full_name,
        u.email
      FROM slot_change_logs scl
      LEFT JOIN users u ON scl.user_id = u.id
      WHERE scl.slot_id = $1
      ORDER BY scl.created_at DESC
      LIMIT $2 OFFSET $3
    `, [slotId, Number(limit), offset]);

    // 총 개수 조회
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM slot_change_logs WHERE slot_id = $1',
      [slotId]
    );

    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / Number(limit));

    // JSON 파싱 처리
    const logs = logsResult.rows.map(log => ({
      ...log,
      field_key: log.field_key ? (log.field_key.startsWith('[') ? JSON.parse(log.field_key) : log.field_key) : null,
      old_value: log.old_value ? JSON.parse(log.old_value) : null,
      new_value: log.new_value ? JSON.parse(log.new_value) : null
    }));

    res.json({
      success: true,
      data: logs  // 배열을 직접 반환
    });
  } catch (error) {
    // Get slot change logs error: error
    res.status(500).json({
      success: false,
      error: '변경 로그 조회 중 오류가 발생했습니다.'
    });
  }
}

// 사용자별 슬롯 변경 로그 조회 API (관리자 전용)
export async function getUserSlotChangeLogs(req: AuthRequest, res: Response) {
  try {
    const { userId: targetUserId } = req.params;
    const { page = 1, limit = 20, changeType } = req.query;
    const userRole = req.user?.role;

    // 관리자/개발자 권한 확인
    if (userRole !== 'operator' && userRole !== 'developer') {
      return res.status(403).json({
        success: false,
        error: '관리자/개발자 권한이 필요합니다.'
      });
    }

    const offset = (Number(page) - 1) * Number(limit);
    let whereClause = 'WHERE scl.user_id = $1';
    const queryParams: any[] = [targetUserId, Number(limit), offset];

    // 변경 타입 필터 추가
    if (changeType) {
      whereClause += ' AND scl.change_type = $4';
      queryParams.push(changeType);
    }

    // 변경 로그 조회 (슬롯 정보 포함)
    const logsResult = await pool.query(`
      SELECT 
        scl.*,
        u.full_name,
        u.email,
        s.seq as slot_seq,
        s.keyword as slot_keyword
      FROM slot_change_logs scl
      LEFT JOIN users u ON scl.user_id = u.id
      LEFT JOIN slots s ON scl.slot_id = s.id
      ${whereClause}
      ORDER BY scl.created_at DESC
      LIMIT $2 OFFSET $3
    `, queryParams);

    // 총 개수 조회
    const countParams = changeType ? [targetUserId, changeType] : [targetUserId];
    const countQuery = changeType 
      ? 'SELECT COUNT(*) FROM slot_change_logs WHERE user_id = $1 AND change_type = $2'
      : 'SELECT COUNT(*) FROM slot_change_logs WHERE user_id = $1';
    
    const countResult = await pool.query(countQuery, countParams);

    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / Number(limit));

    // JSON 파싱 처리
    const logs = logsResult.rows.map(log => ({
      ...log,
      field_key: log.field_key ? (log.field_key.startsWith('[') ? JSON.parse(log.field_key) : log.field_key) : null,
      old_value: log.old_value ? JSON.parse(log.old_value) : null,
      new_value: log.new_value ? JSON.parse(log.new_value) : null
    }));

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalCount,
          totalPages
        }
      }
    });
  } catch (error) {
    // Get user slot change logs error: error
    res.status(500).json({
      success: false,
      error: '사용자 변경 로그 조회 중 오류가 발생했습니다.'
    });
  }
}

// 슬롯 발급 내역 조회
export async function getSlotAllocationHistory(req: AuthRequest, res: Response) {
  try {
    const { 
      page = 1, 
      limit = 20,
      operatorId,
      userId,
      dateFrom,
      dateTo,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    // 관리자 권한 체크
    if (req.user?.role !== 'operator' && req.user?.role !== 'developer') {
      return res.status(403).json({
        success: false,
        error: '권한이 없습니다.'
      });
    }

    const client = await pool.connect();
    
    try {
      // WHERE 조건 구성
      const whereConditions = [];
      const values = [];
      let valueIndex = 1;

      if (operatorId) {
        whereConditions.push(`sah.operator_id = $${valueIndex++}`);
        values.push(operatorId);
      }

      if (userId) {
        whereConditions.push(`sah.user_id = $${valueIndex++}`);
        values.push(userId);
      }

      if (dateFrom) {
        whereConditions.push(`sah.created_at >= $${valueIndex++}`);
        values.push(dateFrom);
      }

      if (dateTo) {
        whereConditions.push(`sah.created_at <= $${valueIndex++}`);
        values.push(dateTo);
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';

      // 전체 개수 조회
      const countQuery = `
        SELECT COUNT(*) as total
        FROM slot_allocation_history sah
        ${whereClause}
      `;
      
      const countResult = await client.query(countQuery, values);
      const totalCount = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalCount / Number(limit));

      // 정렬 검증
      const allowedSortFields = ['created_at', 'operator_name', 'user_name', 'slot_count', 'price_per_slot'];
      const sortField = allowedSortFields.includes(String(sortBy)) ? sortBy : 'created_at';
      const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

      // 데이터 조회
      const offset = (Number(page) - 1) * Number(limit);
      const dataQuery = `
        SELECT 
          sah.*,
          op.full_name as current_operator_name,
          op.email as operator_email,
          u.full_name as current_user_name,
          u.email as current_user_email
        FROM slot_allocation_history sah
        LEFT JOIN users op ON sah.operator_id = op.id
        LEFT JOIN users u ON sah.user_id = u.id
        ${whereClause}
        ORDER BY sah.${sortField} ${order}
        LIMIT $${valueIndex} OFFSET $${valueIndex + 1}
      `;
      
      values.push(limit, offset);
      const result = await client.query(dataQuery, values);

      res.json({
        success: true,
        data: {
          allocations: result.rows,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: totalCount,
            totalPages
          }
        }
      });

    } finally {
      client.release();
    }
  } catch (error) {
    // Get slot allocation history error: error
    res.status(500).json({
      success: false,
      error: '슬롯 발급 내역 조회 중 오류가 발생했습니다.'
    });
  }
}

// 결제 상태 업데이트
export async function updatePaymentStatus(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { payment } = req.body;

  if (!req.user || req.user.role !== 'operator') {
    return res.status(403).json({
      success: false,
      error: 'Only operators can update payment status'
    });
  }

  const client = await pool.connect();
  try {
    // 발급 내역 존재 확인
    const checkResult = await client.query(
      'SELECT * FROM slot_allocation_history WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Allocation history not found'
      });
    }

    // 결제 상태 업데이트
    await client.query(
      'UPDATE slot_allocation_history SET payment = $1 WHERE id = $2',
      [payment, id]
    );

    res.json({
      success: true,
      message: 'Payment status updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update payment status'
    });
  } finally {
    client.release();
  }
}

// 개별 슬롯 연장
export async function extendSlot(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { extensionDays } = req.body;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  // 권한 체크 (operator 또는 developer만 가능)
  if (userRole !== 'operator' && userRole !== 'developer') {
    return res.status(403).json({
      success: false,
      error: '슬롯 연장은 관리자만 가능합니다.'
    });
  }

  // 연장 기간 검증
  const validExtensionDays = [1, 7, 10, 30];
  if (!validExtensionDays.includes(extensionDays)) {
    return res.status(400).json({
      success: false,
      error: '유효하지 않은 연장 기간입니다.'
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 원본 슬롯 조회
    const slotResult = await client.query(
      `SELECT s.*, u.email as user_email, u.full_name as user_name
       FROM slots s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = $1`,
      [id]
    );

    if (slotResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: '슬롯을 찾을 수 없습니다.'
      });
    }

    const originalSlot = slotResult.rows[0];

    // 연장 시작일 계산 (스마트 연장)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const originalEndDate = new Date(originalSlot.pre_allocation_end_date || originalSlot.end_date);
    originalEndDate.setHours(0, 0, 0, 0);

    let startDate;
    if (originalEndDate >= today) {
      // 아직 활성 - 원본 종료일 다음날부터
      startDate = new Date(originalEndDate);
      startDate.setDate(startDate.getDate() + 1);
    } else {
      // 이미 만료 - 오늘부터
      startDate = today;
    }

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + extensionDays - 1);

    // 해당 사용자의 다음 seq 번호 찾기
    const maxSeqResult = await client.query(
      `SELECT COALESCE(MAX(seq), 0) + 1 as next_seq 
       FROM slots 
       WHERE user_id = $1`,
      [originalSlot.user_id]
    );
    const nextSeq = maxSeqResult.rows[0].next_seq;

    // 해당 사용자의 다음 slot_number 찾기
    const maxSlotNumberResult = await client.query(
      `SELECT COALESCE(MAX(slot_number), 0) + 1 as next_slot_number 
       FROM slots 
       WHERE user_id = $1`,
      [originalSlot.user_id]
    );
    const nextSlotNumber = maxSlotNumberResult.rows[0].next_slot_number;

    // 새 슬롯 생성 (연장 슬롯)
    const insertResult = await client.query(
      `INSERT INTO slots (
        user_id, seq, keyword, trim_keyword, url, mid, 
        daily_budget, status, approved_price,
        approved_at, approved_by,
        issue_type, is_empty, allocation_id, slot_number,
        pre_allocation_start_date, pre_allocation_end_date,
        pre_allocation_work_count, pre_allocation_amount,
        allocation_history_id,
        parent_slot_id, extension_days, extended_at, extended_by, extension_type
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9,
        $10, $11,
        $12, $13, $14, $15,
        $16, $17,
        $18, $19,
        $20,
        $21, $22, $23, $24, $25
      ) RETURNING *`,
      [
        originalSlot.user_id,
        nextSeq, // 새로운 seq 번호 사용
        originalSlot.keyword,
        originalSlot.trim_keyword,
        originalSlot.url,
        originalSlot.mid,
        originalSlot.daily_budget,
        'active', // 연장 슬롯은 자동으로 active 상태
        originalSlot.approved_price,
        new Date(), // 승인 시간
        userId, // 승인자
        originalSlot.issue_type,
        false, // 빈 슬롯 아님
        originalSlot.allocation_id,
        nextSlotNumber, // 새로운 slot_number 사용
        startDate,
        endDate,
        extensionDays,
        originalSlot.pre_allocation_amount,
        originalSlot.allocation_history_id,
        id, // parent_slot_id
        extensionDays,
        new Date(), // extended_at
        userId, // extended_by
        'individual' // 개별 연장
      ]
    );

    const newSlot = insertResult.rows[0];

    // 원본 슬롯의 field values 복사
    const fieldValuesResult = await client.query(
      `SELECT field_key, value FROM slot_field_values WHERE slot_id = $1`,
      [id]
    );

    if (fieldValuesResult.rows.length > 0) {
      for (const fieldValue of fieldValuesResult.rows) {
        await client.query(
          `INSERT INTO slot_field_values (slot_id, field_key, value)
           VALUES ($1, $2, $3)`,
          [newSlot.id, fieldValue.field_key, fieldValue.value]
        );
      }
    }

    // allocation_history의 payment를 true로 설정 (연장은 결제완료 상태)
    if (originalSlot.allocation_history_id) {
      await client.query(
        `UPDATE slot_allocation_history 
         SET payment = true 
         WHERE id = $1`,
        [originalSlot.allocation_history_id]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      data: newSlot,
      message: `슬롯이 ${extensionDays}일 연장되었습니다.`
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Extend slot error:', error);
    res.status(500).json({
      success: false,
      error: '슬롯 연장 중 오류가 발생했습니다.'
    });
  } finally {
    client.release();
  }
}

// 대량 슬롯 연장 (발급 건별)
export async function extendBulkSlots(req: AuthRequest, res: Response) {
  const { allocationHistoryId, extensionDays } = req.body;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  // 권한 체크
  if (userRole !== 'operator' && userRole !== 'developer') {
    return res.status(403).json({
      success: false,
      error: '대량 슬롯 연장은 관리자만 가능합니다.'
    });
  }

  // 연장 기간 검증
  const validExtensionDays = [1, 7, 10, 30];
  if (!validExtensionDays.includes(extensionDays)) {
    return res.status(400).json({
      success: false,
      error: '유효하지 않은 연장 기간입니다.'
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 해당 발급 건의 모든 슬롯 조회 (개별 연장된 슬롯 제외)
    const slotsResult = await client.query(
      `SELECT s.*
       FROM slots s
       WHERE s.allocation_history_id = $1
       AND s.parent_slot_id IS NULL  -- 원본 슬롯만 (이미 연장된 것 제외)
       AND NOT EXISTS (
         SELECT 1 FROM slots child 
         WHERE child.parent_slot_id = s.id
       )`, // 개별 연장으로 자식 슬롯이 있는 경우 제외
      [allocationHistoryId]
    );

    if (slotsResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: '해당 발급 건의 슬롯을 찾을 수 없습니다.'
      });
    }

    const slots = slotsResult.rows;
    const extendedSlots = [];
    const failedSlots = [];

    // 각 슬롯 연장 처리
    for (const originalSlot of slots) {
      try {
        // 연장 시작일 계산
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const originalEndDate = new Date(originalSlot.pre_allocation_end_date || originalSlot.end_date);
        originalEndDate.setHours(0, 0, 0, 0);

        let startDate;
        if (originalEndDate >= today) {
          startDate = new Date(originalEndDate);
          startDate.setDate(startDate.getDate() + 1);
        } else {
          startDate = today;
        }

        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + extensionDays - 1);

        // 해당 사용자의 다음 seq 번호 찾기
        const maxSeqResult = await client.query(
          `SELECT COALESCE(MAX(seq), 0) + 1 as next_seq 
           FROM slots 
           WHERE user_id = $1`,
          [originalSlot.user_id]
        );
        const nextSeq = maxSeqResult.rows[0].next_seq;

        // 해당 사용자의 다음 slot_number 찾기
        const maxSlotNumberResult = await client.query(
          `SELECT COALESCE(MAX(slot_number), 0) + 1 as next_slot_number 
           FROM slots 
           WHERE user_id = $1`,
          [originalSlot.user_id]
        );
        const nextSlotNumber = maxSlotNumberResult.rows[0].next_slot_number;

        // 새 슬롯 생성
        const insertResult = await client.query(
          `INSERT INTO slots (
            user_id, seq, keyword, trim_keyword, url, mid,
            daily_budget, status, approved_price,
            approved_at, approved_by,
            issue_type, is_empty, allocation_id, slot_number,
            pre_allocation_start_date, pre_allocation_end_date,
            pre_allocation_work_count, pre_allocation_amount,
            allocation_history_id,
            parent_slot_id, extension_days, extended_at, extended_by, extension_type
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9,
            $10, $11,
            $12, $13, $14, $15,
            $16, $17,
            $18, $19,
            $20,
            $21, $22, $23, $24, $25
          ) RETURNING *`,
          [
            originalSlot.user_id,
            nextSeq, // 새로운 seq 번호 사용
            originalSlot.keyword,
            originalSlot.trim_keyword,
            originalSlot.url,
            originalSlot.mid,
            originalSlot.daily_budget,
            'active', // 연장 슬롯은 자동으로 active 상태
            originalSlot.approved_price,
            new Date(),
            userId,
            originalSlot.issue_type,
            false,
            originalSlot.allocation_id,
            nextSlotNumber, // 새로운 slot_number 사용
            startDate,
            endDate,
            extensionDays,
            originalSlot.pre_allocation_amount,
            originalSlot.allocation_history_id,
            originalSlot.id, // parent_slot_id
            extensionDays,
            new Date(),
            userId,
            'bulk' // 단체 연장
          ]
        );

        const newSlot = insertResult.rows[0];

        // 원본 슬롯의 field values 복사
        const fieldValuesResult = await client.query(
          `SELECT field_key, value FROM slot_field_values WHERE slot_id = $1`,
          [originalSlot.id]
        );

        if (fieldValuesResult.rows.length > 0) {
          for (const fieldValue of fieldValuesResult.rows) {
            await client.query(
              `INSERT INTO slot_field_values (slot_id, field_key, value)
               VALUES ($1, $2, $3)`,
              [newSlot.id, fieldValue.field_key, fieldValue.value]
            );
          }
        }

        extendedSlots.push(newSlot);
      } catch (err) {
        failedSlots.push({
          slotId: originalSlot.id,
          error: err instanceof Error ? err.message : '알 수 없는 오류'
        });
      }
    }

    // allocation_history의 payment를 true로 설정
    await client.query(
      `UPDATE slot_allocation_history 
       SET payment = true 
       WHERE id = $1`,
      [allocationHistoryId]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      data: {
        extended: extendedSlots.length,
        failed: failedSlots.length,
        total: slots.length,
        failedSlots
      },
      message: `${extendedSlots.length}개 슬롯이 ${extensionDays}일 연장되었습니다.`
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Extend bulk slots error:', error);
    res.status(500).json({
      success: false,
      error: '대량 슬롯 연장 중 오류가 발생했습니다.'
    });
  } finally {
    client.release();
  }
}

// 슬롯 체인의 rank_daily 조회 (원본 + 연장 슬롯들의 순위 데이터)
export async function getSlotRankChain(req: AuthRequest, res: Response) {
  const { id } = req.params;
  
  const client = await pool.connect();
  try {
    // WITH RECURSIVE를 사용하여 슬롯 체인 조회
    const query = `
      WITH RECURSIVE slot_chain AS (
        -- 현재 슬롯부터 시작 (아래에서 위로)
        SELECT id, parent_slot_id, 0 as chain_level
        FROM slots 
        WHERE id = $1
        
        UNION ALL
        
        -- 부모 슬롯들을 재귀적으로 조회
        SELECT s.id, s.parent_slot_id, sc.chain_level + 1
        FROM slots s
        JOIN slot_chain sc ON s.id = sc.parent_slot_id
        
        UNION ALL
        
        -- 자식 슬롯들을 재귀적으로 조회
        SELECT s.id, s.parent_slot_id, sc.chain_level - 1
        FROM slots s
        JOIN slot_chain sc ON s.parent_slot_id = sc.id
      )
      SELECT DISTINCT
        rd.*,
        sc.chain_level,
        s.pre_allocation_start_date as slot_start,
        s.pre_allocation_end_date as slot_end,
        s.parent_slot_id,
        CASE WHEN s.parent_slot_id IS NOT NULL THEN true ELSE false END as is_extended
      FROM slot_chain sc
      JOIN slots s ON s.id = sc.id
      LEFT JOIN rank_daily rd ON rd.slot_id = sc.id
      ORDER BY rd.date DESC NULLS LAST
    `;
    
    const result = await client.query(query, [id]);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Get slot rank chain error:', error);
    res.status(500).json({
      success: false,
      error: '슬롯 순위 체인 조회 중 오류가 발생했습니다.'
    });
  } finally {
    client.release();
  }
}

// 슬롯 결제 취소
export async function cancelSlotPayment(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const userRole = req.user?.role;

  // 권한 체크
  if (userRole !== 'operator' && userRole !== 'developer') {
    return res.status(403).json({
      success: false,
      error: '결제 취소는 관리자만 가능합니다.'
    });
  }

  const client = await pool.connect();
  try {
    // 슬롯의 allocation_history_id 조회
    const slotResult = await client.query(
      'SELECT allocation_history_id FROM slots WHERE id = $1',
      [id]
    );

    if (slotResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '슬롯을 찾을 수 없습니다.'
      });
    }

    const allocationHistoryId = slotResult.rows[0].allocation_history_id;

    if (!allocationHistoryId) {
      return res.status(400).json({
        success: false,
        error: '발급 내역이 없는 슬롯입니다.'
      });
    }

    // payment를 false로 업데이트
    await client.query(
      'UPDATE slot_allocation_history SET payment = false WHERE id = $1',
      [allocationHistoryId]
    );

    res.json({
      success: true,
      message: '결제가 취소되었습니다.'
    });

  } catch (error) {
    console.error('Cancel payment error:', error);
    res.status(500).json({
      success: false,
      error: '결제 취소 중 오류가 발생했습니다.'
    });
  } finally {
    client.release();
  }
}

// 사용자 슬롯 일괄 수정
export async function bulkUpdateSlots(req: AuthRequest, res: Response) {
  const { slotIds, updates } = req.body;
  const userId = req.user?.id;
  
  if (!slotIds || !Array.isArray(slotIds) || slotIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: '수정할 슬롯을 선택해주세요.'
    });
  }
  
  if (!updates || Object.keys(updates).length === 0) {
    return res.status(400).json({
      success: false,
      error: '수정할 내용을 입력해주세요.'
    });
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. 수정 가능한 슬롯 검증 및 현재 값 조회
    const validSlots = await client.query(`
      SELECT id, keyword, url, mid, trim_keyword, status, pre_allocation_end_date
      FROM slots 
      WHERE id = ANY($1) 
        AND user_id = $2
        AND status IN ('empty', 'active')
        AND status != 'refunded'
        AND (pre_allocation_end_date IS NULL OR pre_allocation_end_date > NOW())
    `, [slotIds, userId]);
    
    if (validSlots.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        error: '수정 가능한 슬롯이 없습니다.' 
      });
    }
    
    let totalUpdated = 0;
    
    // 2. 각 슬롯 업데이트
    for (const slot of validSlots.rows) {
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;
      let hasChanges = false;
      
      // keyword 업데이트
      if (updates.keyword?.trim() && updates.keyword.trim() !== slot.keyword) {
        updateFields.push(`keyword = $${paramCount++}`);
        updateValues.push(updates.keyword.trim());
        
        // trim_keyword 자동 계산
        const trimKeywordValue = updates.keyword.trim().replace(/\s+/g, '');
        updateFields.push(`trim_keyword = $${paramCount++}`);
        updateValues.push(trimKeywordValue);
        
        // slot_field_values 업데이트
        await client.query(`
          INSERT INTO slot_field_values (slot_id, field_key, value)
          VALUES ($1, 'keyword', $2)
          ON CONFLICT (slot_id, field_key) 
          DO UPDATE SET value = $2, updated_at = NOW()
        `, [slot.id, updates.keyword.trim()]);
        
        // 변경 로그
        await client.query(`
          INSERT INTO slot_change_logs 
          (slot_id, user_id, change_type, field_key, old_value, new_value, created_at)
          VALUES ($1, $2, 'field_update', 'keyword', $3, $4, NOW())
        `, [slot.id, userId, JSON.stringify(slot.keyword || ''), JSON.stringify(updates.keyword.trim())]);
        
        hasChanges = true;
      }
      
      // URL 업데이트 (파싱 포함)
      if (updates.url?.trim() && updates.url.trim() !== slot.url) {
        updateFields.push(`url = $${paramCount++}`);
        updateValues.push(updates.url.trim());
        
        // URL 파싱하여 추가 필드 생성
        const parsedUrlFields = parseUrl(updates.url.trim());
        
        // slot_field_values에 URL 저장
        await client.query(`
          INSERT INTO slot_field_values (slot_id, field_key, value)
          VALUES ($1, 'url', $2)
          ON CONFLICT (slot_id, field_key) 
          DO UPDATE SET value = $2, updated_at = NOW()
        `, [slot.id, updates.url.trim()]);
        
        // 파싱된 필드들도 저장
        for (const [key, value] of Object.entries(parsedUrlFields)) {
          await client.query(`
            INSERT INTO slot_field_values (slot_id, field_key, value)
            VALUES ($1, $2, $3)
            ON CONFLICT (slot_id, field_key) 
            DO UPDATE SET value = $3, updated_at = NOW()
          `, [slot.id, key, value]);
        }
        
        // 변경 로그
        await client.query(`
          INSERT INTO slot_change_logs 
          (slot_id, user_id, change_type, field_key, old_value, new_value, created_at)
          VALUES ($1, $2, 'field_update', 'url', $3, $4, NOW())
        `, [slot.id, userId, JSON.stringify(slot.url || ''), JSON.stringify(updates.url.trim())]);
        
        hasChanges = true;
      }
      
      // MID 업데이트
      if (updates.mid?.trim() && updates.mid.trim() !== slot.mid) {
        updateFields.push(`mid = $${paramCount++}`);
        updateValues.push(updates.mid.trim());
        
        // slot_field_values 업데이트
        await client.query(`
          INSERT INTO slot_field_values (slot_id, field_key, value)
          VALUES ($1, 'mid', $2)
          ON CONFLICT (slot_id, field_key) 
          DO UPDATE SET value = $2, updated_at = NOW()
        `, [slot.id, updates.mid.trim()]);
        
        // 변경 로그
        await client.query(`
          INSERT INTO slot_change_logs 
          (slot_id, user_id, change_type, field_key, old_value, new_value, created_at)
          VALUES ($1, $2, 'field_update', 'mid', $3, $4, NOW())
        `, [slot.id, userId, JSON.stringify(slot.mid || ''), JSON.stringify(updates.mid.trim())]);
        
        hasChanges = true;
      }
      
      // slots 테이블 업데이트
      if (updateFields.length > 0) {
        updateFields.push(`updated_at = NOW()`);
        updateValues.push(slot.id);
        
        await client.query(`
          UPDATE slots 
          SET ${updateFields.join(', ')}
          WHERE id = $${paramCount}
        `, updateValues);
        
        totalUpdated++;
      }
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      data: {
        updatedCount: totalUpdated,
        message: `${totalUpdated}개의 슬롯이 수정되었습니다.`
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Bulk update error:', error);
    res.status(500).json({
      success: false,
      error: '일괄 수정 중 오류가 발생했습니다.'
    });
  } finally {
    client.release();
  }
}
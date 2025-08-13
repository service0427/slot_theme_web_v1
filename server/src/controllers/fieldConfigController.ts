import { Request, Response } from 'express';
import { pool } from '../config/database';

// 필드 설정 조회
export const getFieldConfigs = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM field_configs ORDER BY display_order ASC'
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('필드 설정 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '필드 설정 조회 중 오류가 발생했습니다.' 
    });
  }
};

// 필드 설정 업데이트
export const updateFieldConfigs = async (req: Request, res: Response) => {
  const { fields } = req.body;
  
  if (!Array.isArray(fields)) {
    return res.status(400).json({ 
      success: false, 
      message: '유효하지 않은 요청 데이터입니다.' 
    });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 각 필드 업데이트
    for (const field of fields) {
      await client.query(
        `UPDATE field_configs 
         SET label = $1, 
             field_type = $2, 
             is_required = $3, 
             is_enabled = $4,
             show_in_list = $5,
             is_searchable = $6,
             placeholder = $7,
             validation_rule = $8,
             options = $9,
             default_value = $10,
             display_order = $11,
             updated_at = CURRENT_TIMESTAMP
         WHERE field_key = $12`,
        [
          field.label,
          field.field_type,
          field.is_required,
          field.is_enabled,
          field.show_in_list,
          field.is_searchable,
          field.placeholder,
          field.validation_rule,
          field.options ? JSON.stringify(field.options) : null,
          field.default_value,
          field.display_order,
          field.field_key
        ]
      );
    }
    
    await client.query('COMMIT');
    
    // 업데이트된 설정 반환
    const result = await client.query(
      'SELECT * FROM field_configs ORDER BY display_order ASC'
    );
    
    res.json({
      success: true,
      message: '필드 설정이 업데이트되었습니다.',
      data: result.rows
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('필드 설정 업데이트 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '필드 설정 업데이트 중 오류가 발생했습니다.' 
    });
  } finally {
    client.release();
  }
};

// 새 필드 추가
export const addFieldConfig = async (req: Request, res: Response) => {
  const { 
    field_key, 
    label, 
    field_type, 
    is_required, 
    placeholder,
    validation_rule,
    options,
    default_value
  } = req.body;
  
  if (!field_key || !label || !field_type) {
    return res.status(400).json({ 
      success: false, 
      message: '필수 정보가 누락되었습니다.' 
    });
  }

  try {
    // 현재 최대 display_order 가져오기
    const maxOrderResult = await pool.query(
      'SELECT MAX(display_order) as max_order FROM field_configs'
    );
    const nextOrder = (maxOrderResult.rows[0].max_order || 0) + 1;
    
    const result = await pool.query(
      `INSERT INTO field_configs 
       (field_key, label, field_type, is_required, is_enabled, show_in_list, 
        is_searchable, placeholder, validation_rule, options, default_value, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        field_key,
        label,
        field_type,
        is_required || false,
        true, // 기본적으로 활성화
        true, // 기본적으로 리스트에 표시
        true, // 기본적으로 검색 가능
        placeholder,
        validation_rule,
        options ? JSON.stringify(options) : null,
        default_value,
        nextOrder
      ]
    );
    
    res.json({
      success: true,
      message: '새 필드가 추가되었습니다.',
      data: result.rows[0]
    });
  } catch (error: any) {
    if (error.code === '23505') { // unique violation
      return res.status(400).json({ 
        success: false, 
        message: '이미 존재하는 필드 키입니다.' 
      });
    }
    console.error('필드 추가 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '필드 추가 중 오류가 발생했습니다.' 
    });
  }
};

// 필드 삭제
export const deleteFieldConfig = async (req: Request, res: Response) => {
  const { field_key } = req.params;
  
  // 기본 필드는 삭제 불가
  if (['keyword', 'url', 'url_product_id', 'url_item_id', 'url_vendor_item_id'].includes(field_key)) {
    return res.status(400).json({ 
      success: false, 
      message: '기본 필드는 삭제할 수 없습니다.' 
    });
  }

  try {
    const result = await pool.query(
      'DELETE FROM field_configs WHERE field_key = $1 RETURNING *',
      [field_key]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '필드를 찾을 수 없습니다.' 
      });
    }
    
    res.json({
      success: true,
      message: '필드가 삭제되었습니다.',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('필드 삭제 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '필드 삭제 중 오류가 발생했습니다.' 
    });
  }
};

// 필드 설정 초기화
export const resetFieldConfigs = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 모든 필드 삭제
    await client.query('DELETE FROM field_configs');
    
    // 기본 필드 재생성
    await client.query(`
      INSERT INTO field_configs (field_key, label, field_type, is_required, is_enabled, display_order) VALUES
      ('keyword', '키워드', 'text', true, true, 1),
      ('url', 'URL', 'url', false, true, 2),
      ('url_product_id', '상품ID', 'text', false, false, 3),
      ('url_item_id', '아이템ID', 'text', false, false, 4),
      ('url_vendor_item_id', '판매자아이템ID', 'text', false, false, 5)
    `);
    
    await client.query('COMMIT');
    
    const result = await client.query(
      'SELECT * FROM field_configs ORDER BY display_order ASC'
    );
    
    res.json({
      success: true,
      message: '필드 설정이 초기화되었습니다.',
      data: result.rows
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('필드 설정 초기화 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '필드 설정 초기화 중 오류가 발생했습니다.' 
    });
  } finally {
    client.release();
  }
};
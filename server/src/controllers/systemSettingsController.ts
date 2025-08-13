import { Request, Response } from 'express';
import { pool } from '../config/database';

export const systemSettingsController = {
  // 모든 설정 조회
  async getAllSettings(req: Request, res: Response) {
    try {
      const result = await pool.query(
        'SELECT key, value, category, description FROM system_settings ORDER BY category, key'
      );
      
      // 카테고리별로 그룹화
      const settings = result.rows.reduce((acc: any, row) => {
        if (!acc[row.category]) {
          acc[row.category] = {};
        }
        // JSONB 값을 파싱
        try {
          acc[row.category][row.key] = typeof row.value === 'string' 
            ? JSON.parse(row.value) 
            : row.value;
        } catch {
          acc[row.category][row.key] = row.value;
        }
        return acc;
      }, {});
      
      res.json({ success: true, settings });
    } catch (error) {
      console.error('Error fetching system settings:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch system settings' 
      });
    }
  },

  // 카테고리별 설정 조회
  async getSettingsByCategory(req: Request, res: Response) {
    try {
      const { category } = req.params;
      
      const result = await pool.query(
        'SELECT key, value, description FROM system_settings WHERE category = $1',
        [category]
      );
      
      const settings = result.rows.reduce((acc: any, row) => {
        try {
          acc[row.key] = typeof row.value === 'string' 
            ? JSON.parse(row.value) 
            : row.value;
        } catch {
          acc[row.key] = row.value;
        }
        return acc;
      }, {});
      
      res.json({ success: true, settings });
    } catch (error) {
      console.error('Error fetching settings by category:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch settings' 
      });
    }
  },

  // 특정 설정 조회
  async getSetting(req: Request, res: Response) {
    try {
      const { key } = req.params;
      
      const result = await pool.query(
        'SELECT value FROM system_settings WHERE key = $1',
        [key]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'Setting not found' 
        });
      }
      
      let value = result.rows[0].value;
      try {
        value = typeof value === 'string' ? JSON.parse(value) : value;
      } catch {
        // Keep original value if parse fails
      }
      
      res.json({ success: true, value });
    } catch (error) {
      console.error('Error fetching setting:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch setting' 
      });
    }
  },

  // 설정 업데이트 (관리자만)
  async updateSettings(req: Request, res: Response) {
    try {
      const { settings } = req.body;
      const userId = (req as any).user?.id;
      
      if (!settings || !Array.isArray(settings)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid settings format' 
        });
      }
      
      // 트랜잭션 시작
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        for (const setting of settings) {
          const { key, value, category } = setting;
          
          // JSONB 형식으로 저장 - 모든 값을 JSON.stringify로 처리
          const jsonValue = JSON.stringify(value);
          
          console.log(`Updating setting: ${key} = ${jsonValue} (${category})`);
          
          await client.query(
            `INSERT INTO system_settings (key, value, category, updated_by) 
             VALUES ($1, $2::jsonb, $3, $4)
             ON CONFLICT (key) 
             DO UPDATE SET 
               value = $2::jsonb,
               updated_at = CURRENT_TIMESTAMP,
               updated_by = $4`,
            [key, jsonValue, category, userId]
          );
        }
        
        await client.query('COMMIT');
        
        res.json({ 
          success: true, 
          message: 'Settings updated successfully' 
        });
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Transaction error:', error);
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      
      // 더 자세한 에러 메시지 반환
      const errorMessage = error instanceof Error ? error.message : 'Failed to update settings';
      
      res.status(500).json({ 
        success: false, 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  },

  // 단일 설정 업데이트 (관리자만)
  async updateSetting(req: Request, res: Response) {
    try {
      const { key } = req.params;
      const { value } = req.body;
      const userId = (req as any).user?.id;
      
      // JSONB 형식으로 저장 - 모든 값을 JSON.stringify로 처리
      const jsonValue = JSON.stringify(value);
      
      const result = await pool.query(
        `UPDATE system_settings 
         SET value = $1::jsonb, 
             updated_at = CURRENT_TIMESTAMP,
             updated_by = $2
         WHERE key = $3
         RETURNING key`,
        [jsonValue, userId, key]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'Setting not found' 
        });
      }
      
      res.json({ 
        success: true, 
        message: 'Setting updated successfully' 
      });
    } catch (error) {
      console.error('Error updating setting:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to update setting' 
      });
    }
  }
};
import { Router } from 'express';
import { authenticateToken, isOperator } from '../middleware/auth';
import {
  getFieldConfigs,
  updateFieldConfigs,
  addFieldConfig,
  deleteFieldConfig,
  resetFieldConfigs
} from '../controllers/fieldConfigController';

const router = Router();

// 모든 사용자가 필드 설정 조회 가능 (폼 렌더링용)
router.get('/field-configs', authenticateToken, getFieldConfigs);

// 운영자만 필드 설정 관리 가능
router.put('/admin/field-configs', authenticateToken, isOperator, updateFieldConfigs);
router.post('/admin/field-configs', authenticateToken, isOperator, addFieldConfig);
router.delete('/admin/field-configs/:field_key', authenticateToken, isOperator, deleteFieldConfig);
router.post('/admin/field-configs/reset', authenticateToken, isOperator, resetFieldConfigs);

export default router;
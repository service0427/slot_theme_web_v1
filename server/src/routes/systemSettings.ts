import { Router } from 'express';
import { systemSettingsController } from '../controllers/systemSettingsController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// 모든 사용자가 설정을 읽을 수 있음 (테마 적용을 위해)
router.get('/', systemSettingsController.getAllSettings);
router.get('/category/:category', systemSettingsController.getSettingsByCategory);
router.get('/key/:key', systemSettingsController.getSetting);

// 개발자만 설정을 변경할 수 있음 (operator는 시스템 설정 접근 불가)
router.put('/', authenticateJWT, (req, res, next) => {
  console.log('PUT /system-settings - User:', (req as any).user);
  console.log('User role:', (req as any).user?.role);
  
  if ((req as any).user?.role !== 'developer') {
    console.log('Access denied - not a developer');
    return res.status(403).json({ 
      success: false, 
      error: 'Only developers can update settings' 
    });
  }
  console.log('Access granted - proceeding to update settings');
  next();
}, systemSettingsController.updateSettings);

router.put('/key/:key', authenticateJWT, (req, res, next) => {
  if ((req as any).user?.role !== 'developer') {
    return res.status(403).json({ 
      success: false, 
      error: 'Only developers can update settings' 
    });
  }
  next();
}, systemSettingsController.updateSetting);

export default router;
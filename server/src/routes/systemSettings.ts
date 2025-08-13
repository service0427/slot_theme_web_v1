import { Router } from 'express';
import { systemSettingsController } from '../controllers/systemSettingsController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// 모든 사용자가 설정을 읽을 수 있음 (테마 적용을 위해)
router.get('/', systemSettingsController.getAllSettings);
router.get('/category/:category', systemSettingsController.getSettingsByCategory);
router.get('/key/:key', systemSettingsController.getSetting);

// 관리자만 설정을 변경할 수 있음
router.put('/', authenticateJWT, (req, res, next) => {
  console.log('PUT /system-settings - User:', (req as any).user);
  console.log('User role:', (req as any).user?.role);
  
  if ((req as any).user?.role !== 'operator') {
    console.log('Access denied - not an operator');
    return res.status(403).json({ 
      success: false, 
      error: 'Only operators can update settings' 
    });
  }
  console.log('Access granted - proceeding to update settings');
  next();
}, systemSettingsController.updateSettings);

router.put('/key/:key', authenticateJWT, (req, res, next) => {
  if ((req as any).user?.role !== 'operator') {
    return res.status(403).json({ 
      success: false, 
      error: 'Only operators can update settings' 
    });
  }
  next();
}, systemSettingsController.updateSetting);

export default router;
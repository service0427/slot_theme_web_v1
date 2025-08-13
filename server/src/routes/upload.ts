import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { uploadImage, handleImageUpload } from '../controllers/uploadController';

const router = Router();

// 이미지 업로드 (관리자만)
router.post('/image', authenticateToken, uploadImage, handleImageUpload);

export default router;
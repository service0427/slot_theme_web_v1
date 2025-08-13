import { Router } from 'express';
import { login, refreshToken, updateProfile, getCurrentUser } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// 공개 라우트
router.post('/login', login);
router.post('/refresh', refreshToken);

// 인증 필요 라우트
router.get('/me', authenticateToken, getCurrentUser);
router.put('/profile', authenticateToken, updateProfile);

export default router;
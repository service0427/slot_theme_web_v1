import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getAnnouncements,
  getAnnouncement,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getPinnedAnnouncements
} from '../controllers/announcementController';

const router = Router();

// 선택적 인증 미들웨어
const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    // 토큰이 없어도 진행
    return next();
  }
  
  // 토큰이 있으면 인증 시도
  authenticateToken(req as any, res, next);
};

// 공지사항 목록 조회 (인증 선택적)
router.get('/', optionalAuth, getAnnouncements);

// 고정 공지사항 조회 (인증 불필요)
router.get('/pinned', getPinnedAnnouncements);

// 공지사항 상세 조회 (인증 선택적)
router.get('/:id', optionalAuth, getAnnouncement);

// 공지사항 생성 (관리자만)
router.post('/', authenticateToken, createAnnouncement);

// 공지사항 수정 (관리자만)
router.put('/:id', authenticateToken, updateAnnouncement);

// 공지사항 삭제 (관리자만)
router.delete('/:id', authenticateToken, deleteAnnouncement);

export default router;
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
  getAllNotifications
} from '../controllers/notificationController';

const router = Router();

// 모든 라우트는 인증 필요
router.use(authenticateToken);

// 알림 생성 (관리자만)
router.post('/', createNotification);

// 사용자의 알림 목록 조회
router.get('/', getNotifications);

// 읽지 않은 알림 개수 조회
router.get('/unread-count', getUnreadCount);

// 관리자용: 모든 알림 내역 조회
router.get('/all', getAllNotifications);

// 알림 읽음 처리
router.put('/:id/read', markAsRead);

// 모든 알림 읽음 처리
router.put('/mark-all-read', markAllAsRead);

// 알림 삭제
router.delete('/:id', deleteNotification);

export default router;
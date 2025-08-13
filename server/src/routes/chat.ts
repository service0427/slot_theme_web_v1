import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getOrCreateChatRoom,
  getChatRooms,
  getChatMessages,
  sendMessage,
  markMessagesAsRead,
  closeChatRoom,
  getUnreadCount
} from '../controllers/chatController';

const router = express.Router();

// 모든 채팅 API는 인증 필요
router.use(authenticateToken);

// 채팅방 생성 또는 가져오기
router.post('/rooms', getOrCreateChatRoom);

// 채팅방 목록 조회
router.get('/rooms', getChatRooms);

// 읽지 않은 메시지 수 조회
router.get('/unread-count', getUnreadCount);

// 채팅 메시지 조회
router.get('/rooms/:roomId/messages', getChatMessages);

// 메시지 전송
router.post('/rooms/:roomId/messages', sendMessage);

// 메시지 읽음 처리
router.put('/rooms/:roomId/read', markMessagesAsRead);

// 채팅방 종료
router.put('/rooms/:roomId/close', closeChatRoom);

export default router;
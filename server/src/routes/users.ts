import { Router } from 'express';
import { 
  getUsers, 
  getUser, 
  createUser, 
  updateUser, 
  deleteUser 
} from '../controllers/userController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// 모든 사용자 관리 라우트는 인증 필요 + operator 권한 필요
router.use(authenticateToken);
router.use(requireRole(['operator']));

// 사용자 목록 조회 (검색, 필터, 페이지네이션)
router.get('/', getUsers);

// 특정 사용자 조회
router.get('/:id', getUser);

// 사용자 생성
router.post('/', createUser);

// 사용자 정보 수정
router.put('/:id', updateUser);

// 사용자 삭제
router.delete('/:id', deleteUser);

export default router;
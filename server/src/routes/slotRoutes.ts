import { Router } from 'express';
import { 
  getSlots, 
  getSlotCount,
  createSlot, 
  updateSlotStatus, 
  approveSlot, 
  getSlotById,
  updateSlot,
  allocateSlots,
  getUserSlotAllocation,
  fillEmptySlot,
  getSlotFieldValues,
  updateSlotFields,
  getSlotChangeLogs,
  getUserSlotChangeLogs,
  getSlotAllocationHistory,
  updatePaymentStatus
} from '../controllers/slotController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// 모든 라우트에 인증 필요
router.use(authenticateToken);

// 슬롯 목록 조회
router.get('/', getSlots);

// 슬롯 개수 조회 (관리자 대시보드용)
router.get('/count', getSlotCount);

// 슬롯 발급 내역 조회 (관리자 전용) - 특정 ID 라우트보다 먼저 와야 함
router.get('/allocation-history', getSlotAllocationHistory);

// 결제 상태 업데이트 (관리자 전용)
router.patch('/allocation-history/:id/payment', updatePaymentStatus);

// 슬롯 생성
router.post('/', createSlot);

// 슬롯 상세 조회
router.get('/:id', getSlotById);

// 슬롯 수정
router.put('/:id', updateSlot);

// 슬롯 상태 변경 (일시정지/재개/삭제)
router.patch('/:id/status', updateSlotStatus);

// 슬롯 승인/거절 (관리자 전용)
router.post('/:id/approve', approveSlot);

// 사용자에게 슬롯 할당 (관리자 전용)
router.post('/allocate/:userId', allocateSlots);

// 사용자의 슬롯 할당 정보 조회
router.get('/allocation/:userId', getUserSlotAllocation);

// 빈 슬롯 채우기 (사용자용)
router.put('/:id/fill', fillEmptySlot);

// 슬롯의 필드 값 조회
router.get('/:id/field-values', getSlotFieldValues);

// 슬롯 필드 업데이트 (수정용)
router.put('/:id/update-fields', updateSlotFields);

// 특정 슬롯의 변경 로그 조회
router.get('/:id/logs', getSlotChangeLogs);

// 사용자의 모든 슬롯 변경 로그 조회
router.get('/user/:userId/logs', getUserSlotChangeLogs);

// rank_daily 삭제 쿼리 반환 (실제 삭제하지 않음)
router.get('/:id/rank-delete-query', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 쿼리만 반환, 실행하지 않음
    const deleteQuery = `DELETE FROM rank_daily WHERE slot_id = '${id}'`;
    
    res.status(200).send(deleteQuery);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate delete query'
    });
  }
});

export { router as slotRoutes };
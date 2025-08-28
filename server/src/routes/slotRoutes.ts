import { Router, Response } from 'express';
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
  updatePaymentStatus,
  extendSlot,
  extendBulkSlots,
  cancelSlotPayment,
  getSlotRankChain,
  bulkUpdateSlots,
  getSlotRankHistory,
  getSlotsByAllocation,
  getSystemStats
} from '../controllers/slotController';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// 모든 라우트에 인증 필요
router.use(authenticateToken);

// 슬롯 목록 조회
router.get('/', getSlots);

// 슬롯 개수 조회 (관리자 대시보드용)
router.get('/count', getSlotCount);

// 시스템 전체 통계 조회 (관리자 전용)
router.get('/system-stats', getSystemStats);

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

// 슬롯 체인의 rank_daily 조회 (연장 슬롯 포함)
router.get('/:id/rank-chain', getSlotRankChain);

// 슬롯 순위 히스토리 조회 (개발자 전용)
router.get('/:id/rank-history', getSlotRankHistory);

// 특정 슬롯의 변경 로그 조회
router.get('/:id/logs', getSlotChangeLogs);

// 사용자의 모든 슬롯 변경 로그 조회
router.get('/user/:userId/logs', getUserSlotChangeLogs);

// 슬롯 연장 (관리자 전용)
router.post('/:id/extend', extendSlot);

// 대량 슬롯 연장 (관리자 전용)
router.post('/extend-bulk', extendBulkSlots);

// 사용자 슬롯 일괄 수정
router.put('/user/bulk-update', bulkUpdateSlots);

// 슬롯 결제 취소 (관리자 전용)
router.patch('/:id/cancel-payment', cancelSlotPayment);

// rank_daily 삭제 쿼리 반환 (실제 삭제하지 않음)
router.get('/:id/rank-delete-query', authenticateToken, async (req: AuthRequest, res: Response) => {
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

// rank_daily 데이터 실제 삭제
router.delete('/:id/rank-data', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { pool } = require('../config/database');
  
  try {
    const { id } = req.params;
    
    // 권한 확인 (관리자나 슬롯 소유자만 가능)
    const userRole = req.user?.role;
    const userId = req.user?.id;
    
    // 슬롯 소유자 확인
    const slotResult = await pool.query(
      'SELECT user_id FROM slots WHERE id = $1',
      [id]
    );
    
    if (slotResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Slot not found'
      });
    }
    
    const slotOwnerId = slotResult.rows[0].user_id;
    
    // 권한 체크: 관리자이거나 슬롯 소유자여야 함
    if (userRole !== 'operator' && userRole !== 'developer' && userId !== slotOwnerId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    // rank_daily 데이터 삭제
    const deleteResult = await pool.query(
      'DELETE FROM rank_daily WHERE slot_id = $1',
      [id]
    );
    
    res.json({
      success: true,
      message: `Deleted ${deleteResult.rowCount} rank records`,
      deletedCount: deleteResult.rowCount
    });
  } catch (error) {
    console.error('Error deleting rank data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete rank data'
    });
  }
});

// allocation_history_id로 슬롯 조회 (관리자 전용)
router.get('/by-allocation/:allocationHistoryId', getSlotsByAllocation);

export { router as slotRoutes };
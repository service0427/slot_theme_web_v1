import { Request, Response } from 'express';
import { pool } from '../config/database';

// Socket.IO 인스턴스를 나중에 가져옴 (순환 참조 방지)
let io: any;
setTimeout(() => {
  io = require('../app').io;
}, 0);

// 알림 생성
export const createNotification = async (req: Request, res: Response) => {
  try {
    // [createNotification] Request body: req.body
    // [createNotification] User: (req as any).user
    
    // 관리자/개발자 권한 체크
    const userRole = (req as any).user?.role;
    if (userRole !== 'operator' && userRole !== 'developer') {
      return res.status(403).json({
        success: false,
        error: '관리자 또는 개발자만 알림을 발송할 수 있습니다.'
      });
    }
    
    const {
      type,
      title,
      message,
      sender,
      recipientId,
      auto_close = true,
      duration = 5000,
      priority = 'normal',
      icon,
      metadata
    } = req.body;
    
    // [createNotification] auto_close 값: auto_close, typeof auto_close
    // [createNotification] 전체 body: JSON.stringify(req.body)

    // recipientId가 배열인 경우 (여러 명에게 발송 - 하나의 레코드로 저장)
    if (Array.isArray(recipientId)) {
      // [createNotification] Creating group notification for multiple users: recipientId
      
      try {
        // 그룹 알림을 하나의 레코드로 저장 (metadata에 실제 수신자 목록 저장)
        const groupMetadata = {
          ...metadata,
          recipientType: 'group',
          recipientIds: recipientId,
          recipientCount: recipientId.length
        };
        
        const result = await pool.query(
          `INSERT INTO notifications 
           (type, title, message, sender, recipient_id, auto_close, duration, priority, icon, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING *`,
          [type, title, message, sender || 'operator', 'group', auto_close, duration, priority, icon, JSON.stringify(groupMetadata)]
        );
        
        const notification = result.rows[0];
        // [createNotification] Group notification created: notification
        
        // 각 사용자에게 실시간 알림 전송
        if (io) {
          for (const userId of recipientId) {
            io.to(`user_${userId}`).emit('new_notification', {
              ...notification,
              recipient_id: userId // 실시간 알림에는 개별 사용자 ID 포함
            });
            // 알림이 사용자 userId에게 실시간 전송됨
          }
        }
        
        res.json({
          success: true,
          notification: notification,
          message: `${recipientId.length}명의 사용자에게 알림이 발송되었습니다.`
        });
      } catch (queryError) {
        // [createNotification] Query error: queryError
        throw queryError;
      }
    }
    // recipientId가 'all'인 경우 하나의 알림으로 저장
    else if (recipientId === 'all') {
      // [createNotification] Creating notification for all users
      
      try {
        // 전체 사용자용 알림을 하나의 레코드로 저장
        const result = await pool.query(
          `INSERT INTO notifications 
           (type, title, message, sender, recipient_id, auto_close, duration, priority, icon, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING *`,
          [type, title, message, sender || 'operator', 'all', auto_close, duration, priority, icon, metadata || null]
        );
        
        const notification = result.rows[0];
        // [createNotification] Broadcast notification created: notification

        // 모든 활성 사용자에게 실시간 알림 전송
        if (io) {
          // 모든 사용자 조회하여 실시간 알림 전송 (운영자와 개발자 제외)
          const usersResult = await pool.query(
            "SELECT id FROM users WHERE role NOT IN ('operator', 'developer')",
            []
          );
          
          for (const user of usersResult.rows) {
            io.to(`user_${user.id}`).emit('new_notification', {
              ...notification,
              recipient_id: user.id // 실시간 알림에는 사용자 ID 포함
            });
            // 알림이 사용자 user.id에게 실시간 전송됨
          }
        } else {
          // Socket.IO가 아직 초기화되지 않음
        }

        res.json({
          success: true,
          notification: notification,
          message: `전체 사용자에게 알림이 발송되었습니다.`
        });
      } catch (queryError) {
        // [createNotification] Query error: queryError
        throw queryError;
      }
    } else {
      // 특정 사용자에게만 알림 생성
      // [createNotification] Creating notification for user: recipientId
      
      try {
        const result = await pool.query(
          `INSERT INTO notifications 
           (type, title, message, sender, recipient_id, auto_close, duration, priority, icon, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING *`,
          [type, title, message, sender || 'operator', recipientId, auto_close, duration, priority, icon, metadata || null]
        );

        const notification = result.rows[0];
        // [createNotification] Notification created: notification

        // 실시간으로 해당 사용자에게 알림 전송
        if (io) {
          io.to(`user_${recipientId}`).emit('new_notification', notification);
          // 알림이 사용자 recipientId에게 실시간 전송됨
        } else {
          // Socket.IO가 아직 초기화되지 않음
        }

        res.json({
          success: true,
          notification: notification
        });
      } catch (queryError) {
        // [createNotification] Query error: queryError
        throw queryError;
      }
    }
  } catch (error) {
    // Create notification error: error
    res.status(500).json({
      success: false,
      error: '알림 생성 중 오류가 발생했습니다.'
    });
  }
};

// 사용자의 알림 목록 조회
export const getNotifications = async (req: Request, res: Response) => {
  try {
    // [getNotifications] req.user: (req as any).user
    const userId = (req as any).user?.id;
    
    if (!userId) {
      // [getNotifications] No user ID found
      return res.status(401).json({
        success: false,
        error: '인증 정보가 없습니다.'
      });
    }
    
    // [getNotifications] userId: userId
    const { type, isRead, limit = 50, offset = 0 } = req.query;

    // 운영자와 개발자는 알림을 받지 않음
    const userRole = (req as any).user?.role;
    if (userRole === 'operator' || userRole === 'developer') {
      return res.json({
        success: true,
        notifications: []
      });
    }
    
    // 개인 알림과 전체 알림을 별도로 조회해서 합치기
    // userId를 문자열로 변환
    const userIdStr = String(userId);
    
    let query = `
      SELECT n.*, 
             CASE 
               WHEN n.recipient_id IN ('all', 'group') THEN nr.read_at
               ELSE n.read_at 
             END as read_at
      FROM notifications n
      LEFT JOIN notification_reads nr ON (n.id = nr.notification_id AND nr.user_id = $1::uuid)
      WHERE (
        n.recipient_id = $2 
        OR n.recipient_id = 'all'
        OR (n.recipient_id = 'group' AND n.metadata::jsonb @> $3::jsonb)
      )
    `;
    const params: any[] = [userId, userIdStr, JSON.stringify({recipientIds: [userIdStr]})];

    if (type) {
      params.push(type);
      query += ` AND n.type = $${params.length}`;
    }

    if (isRead === 'true') {
      query += ` AND (
        (n.recipient_id NOT IN ('all', 'group') AND n.read_at IS NOT NULL) OR
        (n.recipient_id IN ('all', 'group') AND nr.read_at IS NOT NULL)
      )`;
    } else if (isRead === 'false') {
      query += ` AND (
        (n.recipient_id NOT IN ('all', 'group') AND n.read_at IS NULL) OR
        (n.recipient_id IN ('all', 'group') AND nr.read_at IS NULL)
      )`;
    }

    query += ` ORDER BY n.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      notifications: result.rows
    });
  } catch (error) {
    // Get notifications error: error
    res.status(500).json({
      success: false,
      error: '알림 조회 중 오류가 발생했습니다.'
    });
  }
};

// 알림 읽음 처리
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    
    // [markAsRead] START - ID: id, User: userId
    // [markAsRead] User info: (req as any).user

    // 먼저 알림이 존재하는지 확인 (자신의 알림, 전체 알림, 그룹 알림)
    const userIdStr = String(userId);
    
    // 먼저 알림을 가져와서 타입 확인
    // [markAsRead] Fetching notification with ID: id
    const notifResult = await pool.query(
      'SELECT * FROM notifications WHERE id = $1',
      [id]
    );
    
    // [markAsRead] Query result: notifResult.rows.length rows
    
    if (notifResult.rows.length === 0) {
      // [markAsRead] ERROR - 알림이 존재하지 않음 - ID: id
      return res.status(404).json({
        success: false,
        error: '알림을 찾을 수 없습니다.'
      });
    }
    
    const notification = notifResult.rows[0];
    // [markAsRead] Notification found: {
    //   id: notification.id,
    //   recipient_id: notification.recipient_id,
    //   metadata: notification.metadata
    // }
    
    // 사용자가 이 알림을 볼 권한이 있는지 확인
    let hasAccess = false;
    // [markAsRead] Checking access for userIdStr: userIdStr
    
    if (notification.recipient_id === userIdStr) {
      // 개인 알림
      hasAccess = true;
    } else if (notification.recipient_id === 'all') {
      // 전체 알림
      hasAccess = true;
    } else if (notification.recipient_id === 'group') {
      // 그룹 알림 - metadata에서 수신자 확인
      if (notification.metadata && notification.metadata.recipientIds) {
        hasAccess = notification.metadata.recipientIds.includes(userIdStr);
      }
    }
    
    if (!hasAccess) {
      // [markAsRead] ERROR - NO ACCESS - ID: id, User: userId
      // [markAsRead] Access check details: {
      //   recipient_id: notification.recipient_id,
      //   userIdStr: userIdStr,
      //   metadata: notification.metadata
      // }
      return res.status(404).json({
        success: false,
        error: '알림을 찾을 수 없습니다.'
      });
    }
    
    // [markAsRead] Access granted, proceeding with mark as read...
    
    // 이미 읽은 알림이면 그대로 반환 (개인 알림의 경우)
    if (notification.recipient_id === userIdStr && notification.read_at) {
      // [markAsRead] 이미 읽은 개인 알림 - ID: id
      return res.json({
        success: true,
        notification: notification,
        message: '이미 읽은 알림입니다.'
      });
    }
    
    // 알림 타입에 따른 처리
    let result;
    
    if (notification.recipient_id === 'all' || notification.recipient_id === 'group') {
      // 전체 알림 또는 그룹 알림의 경우: notification_reads 테이블에 읽음 기록 추가
      // 먼저 이미 읽음 기록이 있는지 확인
      const readCheckResult = await pool.query(
        'SELECT * FROM notification_reads WHERE notification_id = $1 AND user_id = $2',
        [id, userId]
      );
      
      if (readCheckResult.rows.length === 0) {
        // 읽음 기록이 없으면 새로 추가
        await pool.query(
          'INSERT INTO notification_reads (notification_id, user_id, read_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
          [id, userId]
        );
        // [markAsRead] notification.recipient_id 알림 읽음 처리 완료 - ID: id, User: userId
      } else {
        // [markAsRead] 이미 읽은 notification.recipient_id 알림 - ID: id, User: userId
      }
      
      // 원본 알림 데이터를 반환하되 read_at을 현재 시간으로 설정
      result = {
        rows: [{
          ...notification,
          read_at: new Date()
        }]
      };
    } else {
      // 개인 알림의 경우: 기존 방식대로 notifications 테이블 직접 업데이트
      result = await pool.query(
        `UPDATE notifications 
         SET read_at = CURRENT_TIMESTAMP 
         WHERE id = $1 AND recipient_id = $2
         RETURNING *`,
        [id, userIdStr]
      );
      // [markAsRead] 개인 알림 읽음 처리 완료 - ID: id
    }
    
    // [markAsRead] 읽음 처리 완료: result.rows?.[0] || '전체 알림 읽음 처리'

    res.json({
      success: true,
      notification: result.rows[0]
    });
  } catch (error) {
    // Mark as read error: error
    res.status(500).json({
      success: false,
      error: '읽음 처리 중 오류가 발생했습니다.'
    });
  }
};

// 모든 알림 읽음 처리
export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userIdStr = String(userId);
    
    // [markAllAsRead] START - User: userId

    // 트랜잭션 시작
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // 1. 개인 알림 읽음 처리
      // [markAllAsRead] Processing personal notifications for user: userIdStr
      const personalResult = await client.query(
        `UPDATE notifications 
         SET read_at = CURRENT_TIMESTAMP 
         WHERE recipient_id = $1 AND read_at IS NULL`,
        [userIdStr]
      );
      // [markAllAsRead] Personal notifications updated: personalResult.rowCount
      
      // 2. 전체 알림과 그룹 알림에 대한 읽음 기록 추가
      // [markAllAsRead] Processing all/group notifications
      const groupResult = await client.query(
        `INSERT INTO notification_reads (notification_id, user_id, read_at)
         SELECT n.id, $1::uuid, CURRENT_TIMESTAMP
         FROM notifications n
         LEFT JOIN notification_reads nr ON (n.id = nr.notification_id AND nr.user_id = $1::uuid)
         WHERE (
           (n.recipient_id = 'all' AND nr.id IS NULL)
           OR (n.recipient_id = 'group' AND 
               n.metadata IS NOT NULL AND 
               n.metadata::jsonb->'recipientIds' ? $2 AND 
               nr.id IS NULL)
         )
         ON CONFLICT (notification_id, user_id) DO NOTHING`,
        [userId, userIdStr]
      );
      // [markAllAsRead] All/Group notifications updated: groupResult.rowCount
      
      await client.query('COMMIT');
      
      const totalUpdated = personalResult.rowCount + (groupResult.rowCount || 0);
      // [markAllAsRead] COMPLETE - Total updated: totalUpdated
      
      res.json({
        success: true,
        updated: totalUpdated
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    // Mark all as read error: error
    res.status(500).json({
      success: false,
      error: '모든 알림 읽음 처리 중 오류가 발생했습니다.'
    });
  }
};

// 알림 삭제
export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const userIdStr = String(userId);

    const result = await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND recipient_id = $2',
      [id, userIdStr]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: '알림을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      message: '알림이 삭제되었습니다.'
    });
  } catch (error) {
    // Delete notification error: error
    res.status(500).json({
      success: false,
      error: '알림 삭제 중 오류가 발생했습니다.'
    });
  }
};

// 읽지 않은 알림 개수 조회
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userIdStr = String(userId);

    // 개인 알림, 전체 알림, 그룹 알림을 모두 고려
    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM (
         SELECT n.id 
         FROM notifications n
         LEFT JOIN notification_reads nr ON (n.id = nr.notification_id AND nr.user_id = $1::uuid)
         WHERE (
           (n.recipient_id = $2 AND n.read_at IS NULL)
           OR (n.recipient_id = 'all' AND nr.read_at IS NULL)
           OR (n.recipient_id = 'group' AND n.metadata::jsonb @> $3::jsonb AND nr.read_at IS NULL)
         )
       ) AS unread_notifications`,
      [userId, userIdStr, JSON.stringify({recipientIds: [userIdStr]})]
    );

    res.json({
      success: true,
      count: parseInt(result.rows[0].count)
    });
  } catch (error) {
    // Get unread count error: error
    res.status(500).json({
      success: false,
      error: '읽지 않은 알림 개수 조회 중 오류가 발생했습니다.'
    });
  }
};

// 관리자용: 모든 알림 내역 조회
export const getAllNotifications = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user.role;
    
    // 관리자/개발자만 접근 가능
    if (userRole !== 'operator' && userRole !== 'developer') {
      return res.status(403).json({
        success: false,
        error: '권한이 없습니다.'
      });
    }

    const { sender, type, fromDate, toDate, limit = 100, offset = 0 } = req.query;

    let query = `SELECT * FROM notifications WHERE 1=1`;
    const params: any[] = [];

    if (sender) {
      params.push(sender);
      query += ` AND sender = $${params.length}`;
    }

    if (type) {
      params.push(type);
      query += ` AND type = $${params.length}`;
    }

    if (fromDate) {
      params.push(fromDate);
      query += ` AND created_at >= $${params.length}`;
    }

    if (toDate) {
      params.push(toDate);
      query += ` AND created_at <= $${params.length}`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      notifications: result.rows
    });
  } catch (error) {
    // Get all notifications error: error
    res.status(500).json({
      success: false,
      error: '알림 내역 조회 중 오류가 발생했습니다.'
    });
  }
};
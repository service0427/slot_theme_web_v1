import { Request, Response } from 'express';
import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

// 채팅방 생성 또는 기존 채팅방 가져오기
export const getOrCreateChatRoom = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 사용자의 활성 채팅방 확인
    const existingRoomQuery = `
      SELECT cr.* 
      FROM chat_rooms cr
      JOIN chat_participants cp ON cr.id = cp.room_id
      WHERE cp.user_id = $1::uuid 
      AND cr.type = 'support' 
      AND cr.status = 'active'
      ORDER BY cr.created_at DESC
      LIMIT 1
    `;
    
    const existingRoom = await client.query(existingRoomQuery, [userId]);

    if (existingRoom.rows.length > 0) {
      await client.query('COMMIT');
      return res.json({ room: existingRoom.rows[0] });
    }

    // 새 채팅방 생성
    const roomId = uuidv4();
    const createRoomQuery = `
      INSERT INTO chat_rooms (id, name, type, status, created_by)
      VALUES ($1, $2, 'support', 'active', $3)
      RETURNING *
    `;
    
    const roomResult = await client.query(createRoomQuery, [
      roomId,
      '고객 지원',
      userId
    ]);

    // 사용자를 참가자로 추가
    const addParticipantQuery = `
      INSERT INTO chat_participants (room_id, user_id, role)
      VALUES ($1, $2, $3)
    `;
    
    await client.query(addParticipantQuery, [roomId, userId, 'user']);

    // 운영자들을 참가자로 추가 (운영자가 있는 경우만)
    const operatorsQuery = `
      SELECT id FROM users WHERE role = 'operator' LIMIT 1
    `;
    const operators = await client.query(operatorsQuery);
    
    if (operators.rows.length > 0) {
      for (const operator of operators.rows) {
        await client.query(addParticipantQuery, [roomId, operator.id, 'operator']);
      }
    }

    // 시스템 메시지 추가 (sender_id를 NULL로 설정)
    const systemMessageQuery = `
      INSERT INTO chat_messages (room_id, sender_id, content, type)
      VALUES ($1::uuid, NULL, $2, 'system')
    `;
    
    await client.query(systemMessageQuery, [
      roomId,
      '새로운 채팅방이 생성되었습니다. 문의사항을 남겨주시면 빠르게 답변드리겠습니다.'
    ]);

    await client.query('COMMIT');
    res.json({ room: roomResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating chat room:', error);
    res.status(500).json({ error: 'Failed to create chat room' });
  } finally {
    client.release();
  }
};

// 채팅방 목록 조회
export const getChatRooms = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;
  
  console.log('getChatRooms - userId:', userId, 'userRole:', userRole);
  
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }
  
  try {
    let query: string;
    let params: string[];

    if (userRole === 'operator') {
      // 운영자는 모든 support 채팅방 조회
      query = `
        SELECT 
          cr.*,
          (
            SELECT json_build_object(
              'id', u.id,
              'email', u.email,
              'name', u.full_name
            )
            FROM users u
            WHERE u.id = cr.created_by
          ) as creator,
          (
            SELECT COUNT(*)::int
            FROM chat_messages cm
            WHERE cm.room_id = cr.id
            AND cm.is_read = false
            AND cm.sender_id != $1::uuid
          ) as unread_count,
          (
            SELECT cm.content
            FROM chat_messages cm
            WHERE cm.room_id = cr.id
            ORDER BY cm.created_at DESC
            LIMIT 1
          ) as last_message,
          (
            SELECT cm.created_at
            FROM chat_messages cm
            WHERE cm.room_id = cr.id
            ORDER BY cm.created_at DESC
            LIMIT 1
          ) as last_message_at
        FROM chat_rooms cr
        WHERE cr.type = 'support'
        ORDER BY last_message_at DESC NULLS LAST
      `;
      params = [userId];
    } else {
      // 일반 사용자는 자신이 참여한 채팅방만 조회 (단순 버전)
      query = `
        SELECT 
          cr.*,
          0 as unread_count,
          NULL as last_message,
          NULL as last_message_at
        FROM chat_rooms cr
        JOIN chat_participants cp ON cr.id = cp.room_id
        WHERE cp.user_id = $1::uuid
        ORDER BY cr.created_at DESC
      `;
      params = [userId];
    }

    console.log('Executing query:', query);
    console.log('With params:', params);
    const result = await pool.query(query, params);
    res.json({ rooms: result.rows });
  } catch (error) {
    console.error('Error fetching chat rooms:', error);
    res.status(500).json({ error: 'Failed to fetch chat rooms' });
  }
};

// 채팅 메시지 조회
export const getChatMessages = async (req: AuthRequest, res: Response) => {
  const { roomId } = req.params;
  const userId = req.user?.id;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  try {
    // 참가자 확인
    const participantCheck = await pool.query(
      'SELECT 1 FROM chat_participants WHERE room_id = $1::uuid AND user_id = $2::uuid',
      [roomId, userId]
    );

    if (participantCheck.rows.length === 0 && req.user?.role !== 'operator' && req.user?.role !== 'developer') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 메시지 조회 (LEFT JOIN으로 변경하여 시스템 메시지 포함)
    const messagesQuery = `
      SELECT 
        cm.*,
        CASE 
          WHEN cm.sender_id IS NULL THEN
            json_build_object(
              'id', NULL,
              'email', 'system',
              'name', CASE 
                WHEN cm.type = 'auto_reply' THEN '자동 응답'
                ELSE '시스템'
              END,
              'role', 'system'
            )
          ELSE
            json_build_object(
              'id', u.id,
              'email', u.email,
              'name', u.full_name,
              'role', u.role
            )
        END as sender
      FROM chat_messages cm
      LEFT JOIN users u ON cm.sender_id::text = u.id::text
      WHERE cm.room_id = $1::uuid
      ORDER BY cm.created_at ASC
      LIMIT $2 OFFSET $3
    `;

    const messages = await pool.query(messagesQuery, [roomId, limit, offset]);

    // 읽음 처리
    await pool.query(
      `UPDATE chat_messages 
       SET is_read = true 
       WHERE room_id = $1::uuid 
       AND sender_id != $2::uuid 
       AND is_read = false`,
      [roomId, userId]
    );

    // 마지막 읽은 시간 업데이트
    await pool.query(
      `UPDATE chat_participants 
       SET last_read_at = CURRENT_TIMESTAMP 
       WHERE room_id = $1::uuid AND user_id = $2::uuid`,
      [roomId, userId]
    );

    res.json({ messages: messages.rows });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

// 메시지 전송
export const sendMessage = async (req: AuthRequest, res: Response) => {
  const { roomId } = req.params;
  const { content } = req.body;
  const userId = req.user?.id;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Content is required' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 참가자 확인
    const participantCheck = await client.query(
      'SELECT role FROM chat_participants WHERE room_id = $1::uuid AND user_id = $2::uuid',
      [roomId, userId]
    );

    if (participantCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Access denied' });
    }

    const userRole = participantCheck.rows[0].role;

    // 메시지 저장
    const messageQuery = `
      INSERT INTO chat_messages (room_id, sender_id, content, type)
      VALUES ($1::uuid, $2::uuid, $3, 'text')
      RETURNING *
    `;

    const messageResult = await client.query(messageQuery, [roomId, userId, content.trim()]);
    const newMessage = messageResult.rows[0];

    // 발신자 정보 추가
    const senderQuery = await client.query(
      'SELECT id, email, full_name, role FROM users WHERE id = $1::uuid',
      [userId]
    );
    newMessage.sender = {
      id: senderQuery.rows[0].id,
      email: senderQuery.rows[0].email,
      name: senderQuery.rows[0].full_name,
      role: senderQuery.rows[0].role
    };

    // 자동 응답 체크 (사용자가 보낸 메시지일 경우)
    if (userRole === 'user') {
      const autoReplyQuery = `
        SELECT * FROM chat_auto_replies 
        WHERE is_active = true 
        AND $1 ILIKE '%' || keyword || '%'
        LIMIT 1
      `;
      
      const autoReply = await client.query(autoReplyQuery, [content]);
      
      if (autoReply.rows.length > 0) {
        // 자동 응답 전송 (sender_id를 NULL로 설정)
        const autoReplyMessage = await client.query(
          `INSERT INTO chat_messages (room_id, sender_id, content, type)
           VALUES ($1::uuid, NULL, $2, 'auto_reply')
           RETURNING *`,
          [roomId, autoReply.rows[0].reply]
        );
        
        // 시스템 사용자 정보로 설정
        autoReplyMessage.rows[0].sender = {
          id: null,
          email: 'system',
          name: '자동 응답',
          role: 'system'
        };
      }
    }

    await client.query('COMMIT');
    res.json({ message: newMessage });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  } finally {
    client.release();
  }
};

// 읽음 처리
export const markMessagesAsRead = async (req: AuthRequest, res: Response) => {
  const { roomId } = req.params;
  const userId = req.user?.id;

  try {
    await pool.query(
      `UPDATE chat_messages 
       SET is_read = true 
       WHERE room_id = $1::uuid 
       AND sender_id != $2::uuid 
       AND is_read = false`,
      [roomId, userId]
    );

    await pool.query(
      `UPDATE chat_participants 
       SET last_read_at = CURRENT_TIMESTAMP 
       WHERE room_id = $1::uuid AND user_id = $2::uuid`,
      [roomId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
};

// 채팅방 종료
export const closeChatRoom = async (req: AuthRequest, res: Response) => {
  const { roomId } = req.params;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  try {
    // 권한 확인 (운영자/개발자만 가능)
    if (userRole !== 'operator' && userRole !== 'developer') {
      return res.status(403).json({ error: 'Only operators or developers can close chat rooms' });
    }

    await pool.query(
      `UPDATE chat_rooms 
       SET status = 'closed', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1::uuid`,
      [roomId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error closing chat room:', error);
    res.status(500).json({ error: 'Failed to close chat room' });
  }
};

// 읽지 않은 메시지 수 조회
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 사용자가 참여한 채팅방에서 읽지 않은 메시지 수 조회
    const query = `
      SELECT COUNT(*) as unread_count
      FROM chat_messages cm
      JOIN chat_rooms cr ON cm.room_id = cr.id
      JOIN chat_participants cp ON cr.id = cp.room_id
      WHERE cp.user_id = $1::uuid
      AND cm.sender_id != $1::uuid
      AND cm.sender_id IS NOT NULL  -- 시스템 메시지 제외
      AND cm.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamp)
      AND cr.status = 'active'
    `;

    const result = await pool.query(query, [userId]);
    const count = parseInt(result.rows[0].unread_count) || 0;

    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
};
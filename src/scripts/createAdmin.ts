import bcrypt from 'bcryptjs';
import { db } from '../core/database/pool';

async function createAdminUser() {
  try {
    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash('1324', 10);
    
    // 관리자 계정 생성
    const query = `
      INSERT INTO users (email, password, full_name, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) 
      DO UPDATE SET 
        password = $2,
        full_name = $3,
        role = $4,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, email, full_name, role;
    `;
    
    const values = ['admin@admin.com', hashedPassword, '시스템 관리자', 'operator'];
    
    const result = await db.query(query, values);
    
    if (result.rows.length > 0) {
      console.log('✅ 관리자 계정이 생성되었습니다:');
      console.log('이메일:', result.rows[0].email);
      console.log('이름:', result.rows[0].full_name);
      console.log('역할:', result.rows[0].role);
      console.log('비밀번호: 1324');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 관리자 계정 생성 실패:', error);
    process.exit(1);
  }
}

createAdminUser();
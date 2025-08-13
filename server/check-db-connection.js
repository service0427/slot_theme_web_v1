// DB 연결 테스트 스크립트
const { Pool } = require('pg');
require('dotenv').config();

console.log('=== DB 연결 정보 확인 ===');
console.log('DB_HOST:', process.env.DB_HOST || 'localhost');
console.log('DB_PORT:', process.env.DB_PORT || '5432');
console.log('DB_NAME:', process.env.DB_NAME || 'simple');
console.log('DB_USER:', process.env.DB_USER || 'simple');
console.log('=========================\n');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'simple',
  user: process.env.DB_USER || 'simple',
  password: process.env.DB_PASSWORD || 'Tech1324!',
  connectionTimeoutMillis: 5000,
});

async function testConnection() {
  try {
    console.log('DB 연결 테스트 시작...');
    const startTime = Date.now();
    
    // 연결 테스트
    const client = await pool.connect();
    const connectTime = Date.now() - startTime;
    console.log(`✅ DB 연결 성공! (${connectTime}ms)`);
    
    // 간단한 쿼리 테스트
    const queryStart = Date.now();
    const result = await client.query('SELECT NOW()');
    const queryTime = Date.now() - queryStart;
    console.log(`✅ 쿼리 실행 성공! (${queryTime}ms)`);
    console.log('서버 시간:', result.rows[0].now);
    
    // users 테이블 조회 테스트
    const userQueryStart = Date.now();
    const userResult = await client.query('SELECT COUNT(*) FROM users');
    const userQueryTime = Date.now() - userQueryStart;
    console.log(`✅ users 테이블 조회 성공! (${userQueryTime}ms)`);
    console.log('총 사용자 수:', userResult.rows[0].count);
    
    // email 인덱스 성능 테스트
    const indexQueryStart = Date.now();
    const indexResult = await client.query(
      "SELECT * FROM users WHERE email = 'admin@admin.com'"
    );
    const indexQueryTime = Date.now() - indexQueryStart;
    console.log(`✅ email 인덱스 조회 성공! (${indexQueryTime}ms)`);
    
    client.release();
    
    console.log('\n=== 성능 요약 ===');
    console.log(`DB 연결: ${connectTime}ms`);
    console.log(`기본 쿼리: ${queryTime}ms`);
    console.log(`users 테이블 COUNT: ${userQueryTime}ms`);
    console.log(`email 인덱스 조회: ${indexQueryTime}ms`);
    console.log(`총 소요 시간: ${Date.now() - startTime}ms`);
    
  } catch (error) {
    console.error('❌ DB 연결 실패:', error.message);
    console.error('상세 오류:', error);
  } finally {
    await pool.end();
  }
}

testConnection();
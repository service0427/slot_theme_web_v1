import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'simple',
  user: process.env.DB_USER || 'simple',
  password: process.env.DB_PASSWORD || 'Tech1324!',
  // Cloudflare 환경 최적화
  max: 20, // 연결 풀 크기 증가
  idleTimeoutMillis: 10000, // 유휴 연결 빠르게 정리
  connectionTimeoutMillis: 10000, // 연결 타임아웃 증가
  statement_timeout: 30000, // 쿼리 타임아웃 30초
  query_timeout: 30000,
  // 연결 유지 설정
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

export const pool = new Pool(dbConfig);

// 연결 풀 워밍업
pool.on('connect', (client) => {
  console.log('New client connected to database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    
    // 연결 풀 워밍업 - 미리 여러 연결 생성
    const warmupPromises = [];
    for (let i = 0; i < 5; i++) {
      warmupPromises.push(
        pool.query('SELECT 1').catch(err => 
          console.log(`Warmup connection ${i} failed:`, err.message)
        )
      );
    }
    await Promise.all(warmupPromises);
    console.log('✅ Connection pool warmed up');
    
    client.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}
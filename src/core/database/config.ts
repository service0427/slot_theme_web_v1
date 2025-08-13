export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'simple',
  user: process.env.DB_USER || 'simple',
  password: process.env.DB_PASSWORD || 'Tech1324!',
  max: 20, // 최대 연결 수
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

export type DbConfig = typeof dbConfig;
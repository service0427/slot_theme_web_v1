import { Pool } from 'pg';
import { dbConfig } from './config';

// 싱글톤 패턴으로 연결 풀 관리
class Database {
  private static instance: Database;
  private pool: Pool;

  private constructor() {
    this.pool = new Pool(dbConfig);
    
    // 연결 에러 핸들링
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public getPool(): Pool {
    return this.pool;
  }

  public async query(text: string, params?: any[]) {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  public async getClient() {
    return await this.pool.connect();
  }

  public async end() {
    await this.pool.end();
  }
}

export const db = Database.getInstance();
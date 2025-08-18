import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { testConnection } from './config/database';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import { slotRoutes } from './routes/slotRoutes';
import chatRoutes from './routes/chat';
import notificationRoutes from './routes/notifications';
import announcementRoutes from './routes/announcements';
import uploadRoutes from './routes/upload';
import fieldConfigRoutes from './routes/fieldConfig';
import systemSettingsRoutes from './routes/systemSettings';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: [
      'http://localhost:5173', 
      'http://localhost:5174', 
      'http://localhost:5175', 
      'http://211.37.173.150',
      'http://cpc-korea.com',
      'http://www.cpc-korea.com',
      'https://cpc-korea.com',
      'https://www.cpc-korea.com',
      'https://api.cpc-korea.com'
    ],
    credentials: true
  }
});

const PORT = process.env.PORT || 8001;

// Socket.IO 글로벌 인스턴스 export
export { io };

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'http://localhost:5174', 
    'http://localhost:5175', 
    'http://211.37.173.150',
    'http://cpc-korea.com',
    'http://www.cpc-korea.com',
    'https://cpc-korea.com',
    'https://www.cpc-korea.com',
    'https://api.cpc-korea.com'
  ],
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api', fieldConfigRoutes);
app.use('/api/system-settings', systemSettingsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Error stack trace
  res.status(500).json({ error: '서버 오류가 발생했습니다.' });
});

// Socket.IO 연결 처리
io.on('connection', (socket) => {
  // 클라이언트 연결됨

  // 사용자 인증 후 룸 참여
  socket.on('join_user_room', (userId) => {
    socket.join(`user_${userId}`);
    // 사용자가 룸에 참여함
  });

  socket.on('disconnect', () => {
    // 클라이언트 연결 해제
  });
});

// Start server
async function startServer() {
  try {
    // 데이터베이스 연결 테스트
    await testConnection();

    httpServer.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
      console.log(`📝 API Documentation: http://localhost:${PORT}/api/health`);
      console.log(`🔌 Socket.IO is ready for connections`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
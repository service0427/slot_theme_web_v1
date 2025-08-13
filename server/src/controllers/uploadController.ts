import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// 업로드 디렉토리 생성
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `announcement-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'));
    }
  }
});

// 이미지 업로드 핸들러
export const uploadImage = upload.single('image');

export const handleImageUpload = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    // 관리자 권한 체크
    if (user?.role !== 'operator') {
      return res.status(403).json({
        success: false,
        error: '관리자만 이미지를 업로드할 수 있습니다.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '이미지가 업로드되지 않았습니다.'
      });
    }

    // 업로드된 이미지 URL 반환
    const imageUrl = `/uploads/${req.file.filename}`;
    
    res.json({
      success: true,
      data: {
        url: imageUrl,
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size
      }
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({
      success: false,
      error: '이미지 업로드에 실패했습니다.'
    });
  }
};
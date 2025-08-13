# 🚀 Quick Start Guide

## 1. 의존성 설치

```bash
npm install
```

## 2. 개발 서버 실행

```bash
npm run dev
```

## 3. 브라우저에서 확인

http://localhost:5173 으로 접속

## 📱 주요 페이지

### 로그인 페이지 (`/login`)
- 아무 이메일/비밀번호로 로그인 가능
- 예: test@example.com / 1234

### 캐시충전 페이지 (`/cash`)
- 로그인 후 자동 이동
- 우측 상단에서 디자인 전환 가능 (Simple ↔ Luxury)

### 데모 페이지 (`/demo`)
- 모든 컴포넌트 미리보기
- 사용 코드 예시 제공

## 🧪 Mock 데이터 특징

1. **자동 승인**: 충전 요청은 3초 후 자동 승인
2. **초기 잔액**: 유료 50,000원 / 무료 5,000원
3. **보너스**: 기본 10%
4. **데이터 저장**: 브라우저 LocalStorage에 저장

## 🎨 디자인 전환

캐시충전 페이지에서 우측 상단 버튼으로 디자인 전환:
- **Simple**: 깔끔하고 단순한 디자인
- **Luxury**: 고급스럽고 화려한 디자인

## 🔧 개발 팁

### 새로운 디자인 추가하기

1. 디자인 폴더 생성:
```bash
mkdir src/components/mynewdesign
```

2. 컴포넌트 생성:
```tsx
// src/components/mynewdesign/CashCharge.tsx
import { useCashCharge } from '@/hooks/useCashCharge';

export function MyNewCashCharge() {
  const { /* 필요한 것들 */ } = useCashCharge();
  // 커스텀 UI 구현
}
```

3. 사용:
```tsx
<MyNewCashCharge />
```

## 📂 프로젝트 구조

```
src/
├── components/        # UI 컴포넌트 (디자인별)
│   ├── simple/       # 심플 디자인
│   └── luxury/       # 럭셔리 디자인
├── hooks/            # 비즈니스 로직 (Headless)
├── services/         # API 서비스
│   ├── MockAuthService.ts    # Mock 인증
│   └── MockCashService.ts    # Mock 캐시
├── pages/            # 페이지 컴포넌트
└── types/            # TypeScript 타입
```

## 🛠️ 빌드

```bash
npm run build
```

## 🐛 문제 해결

### 포트 충돌
기본 포트(5173)가 사용 중이면 자동으로 다른 포트 할당

### 타입 에러
```bash
npm run build
```
로 타입 체크

### 린트 에러
```bash
npm run lint
```
로 코드 스타일 체크
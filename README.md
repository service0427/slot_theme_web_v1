# Simple Slot - 유연한 디자인 시스템

group-mk 프로젝트에서 핵심 기능을 분리하여 디자인을 자유롭게 변경할 수 있는 구조로 만든 프로젝트입니다.

## 🎯 프로젝트 목표

- **기능과 디자인의 완전한 분리**: Headless 컴포넌트 패턴 적용
- **다양한 디자인 템플릿 지원**: 같은 기능, 다른 디자인
- **PostgreSQL 기반**: Supabase 의존성 제거
- **쉬운 확장성**: 새로운 디자인 추가가 간단함

## 📁 프로젝트 구조

```
src/
├── database/         # PostgreSQL 스키마
│   └── schema.sql   # 테이블 정의
├── types/           # TypeScript 타입 정의
│   └── index.ts
├── services/        # API 통신 레이어
│   ├── AuthService.ts      # 인증 서비스
│   └── CashService.ts      # 캐시 서비스
├── hooks/           # 비즈니스 로직 (Headless)
│   ├── useAuth.ts          # 인증 훅
│   └── useCashCharge.ts    # 캐시충전 훅
└── components/      # UI 컴포넌트 (디자인별 분리)
    ├── simple/      # 심플한 디자인
    │   ├── Login.tsx
    │   └── CashCharge.tsx
    ├── luxury/      # 럭셔리 디자인 (추후 구현)
    └── gaming/      # 게이밍 디자인 (추후 구현)
```

## 🔧 주요 기능

### 1. 캐시충전 기능
- 충전 금액 입력
- 보너스 자동 계산
- 입금자명 관리
- 최근 충전 내역
- 충전 요청 취소

### 2. 로그인/세션 관리
- JWT 기반 인증
- 자동 토큰 갱신
- 세션 만료 처리
- 안전한 비밀번호 관리

## 💾 데이터베이스 설정

### PostgreSQL 테이블
```sql
-- 주요 테이블
- users              # 사용자 정보
- user_sessions      # 세션 관리
- refresh_tokens     # 토큰 갱신
- user_balances      # 사용자 잔액
- cash_charge_requests # 충전 요청
- user_cash_history  # 거래 내역
```

### 설치 방법
```bash
# PostgreSQL에 스키마 적용
psql -U your_username -d your_database < src/database/schema.sql
```

## 🚀 사용 방법

### 1. 캐시충전 컴포넌트 사용

```tsx
// 심플한 디자인
import { SimpleCashCharge } from '@/components/simple/CashCharge';

function App() {
  return <SimpleCashCharge />;
}

// 럭셔리 디자인 (예시)
import { LuxuryCashCharge } from '@/components/luxury/CashCharge';

function App() {
  return <LuxuryCashCharge />;
}
```

### 2. 커스텀 훅 직접 사용

```tsx
import { useCashCharge } from '@/hooks/useCashCharge';

function CustomCashCharge() {
  const {
    amount,
    setAmount,
    createChargeRequest,
    // ... 필요한 것들만 사용
  } = useCashCharge();

  // 완전히 커스텀한 UI 구현
  return (
    <div className="my-custom-design">
      {/* 원하는 디자인으로 구현 */}
    </div>
  );
}
```

### 3. 로그인 컴포넌트 사용

```tsx
import { SimpleLogin } from '@/components/simple/Login';

function LoginPage() {
  return (
    <SimpleLogin 
      onSuccess={() => {
        // 로그인 성공 후 처리
        window.location.href = '/dashboard';
      }}
    />
  );
}
```

## 🎨 새로운 디자인 추가하기

### 1. 디자인 폴더 생성
```bash
mkdir src/components/mynewdesign
```

### 2. 컴포넌트 구현
```tsx
// src/components/mynewdesign/CashCharge.tsx
import { useCashCharge } from '@/hooks/useCashCharge';

export function MyNewCashCharge() {
  const cashCharge = useCashCharge();
  
  // 훅에서 제공하는 기능을 사용해서
  // 원하는 디자인으로 구현
}
```

### 3. 사용
```tsx
import { MyNewCashCharge } from '@/components/mynewdesign/CashCharge';
```

## 🔐 API 엔드포인트

### 인증 관련
- `POST /api/auth/login` - 로그인
- `POST /api/auth/logout` - 로그아웃
- `POST /api/auth/refresh` - 토큰 갱신
- `GET /api/auth/me` - 현재 사용자 정보

### 캐시 관련
- `GET /api/cash/balance` - 잔액 조회
- `POST /api/cash/charge` - 충전 요청
- `GET /api/cash/charge/history` - 충전 내역
- `POST /api/cash/charge/:id/cancel` - 충전 취소
- `GET /api/cash/history` - 거래 내역

## 🔄 마이그레이션 가이드

### Supabase에서 PostgreSQL로
1. `auth.users` 참조 제거
2. RLS 정책 제거
3. Supabase 전용 함수를 PostgreSQL 표준으로 변경
4. 세션 관리를 자체 구현으로 전환

## 📝 주의사항

1. **환경 변수 설정 필요**
   - `DATABASE_URL` - PostgreSQL 연결 문자열
   - `JWT_SECRET` - JWT 토큰 시크릿
   - `API_BASE_URL` - API 서버 주소

2. **보안 고려사항**
   - 모든 API 요청은 인증 필요
   - 토큰은 안전하게 저장
   - HTTPS 사용 권장

3. **성능 최적화**
   - 토큰 갱신은 만료 5분 전 자동 실행
   - 불필요한 API 호출 최소화
   - 캐싱 전략 적용

## 🤝 기여 방법

1. 새로운 디자인 템플릿 추가
2. 기능 개선 제안
3. 버그 리포트
4. 문서 개선
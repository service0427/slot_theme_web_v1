#!/bin/bash

# 백업 스크립트 - simple_slot 프로젝트 백업 자동화
# 사용법: ./scripts/backup.sh "백업 사유" "사용자 요청 내용" "계획된 작업"

set -e  # 에러 발생시 스크립트 중단

# 컬러 출력을 위한 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 함수: 로그 출력
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# 기본값 설정
BACKUP_REASON="${1:-백업 사유 없음}"
USER_REQUEST="${2:-사용자 요청 내용 없음}"
PLANNED_WORK="${3:-계획된 작업 내용 없음}"

# 경로 설정
SOURCE_DIR="/Users/choijinho/app/study3/metronic/simple_slot"
BACKUP_BASE_DIR="/Users/choijinho/app/study3/metronic/simple_slot_backup"

# 백업 폴더명 생성 (YYYYMMDD_NNN)
BACKUP_DATE=$(date +%Y%m%d)
BACKUP_COUNT=$(ls -1 "$BACKUP_BASE_DIR" 2>/dev/null | grep "^${BACKUP_DATE}_" | wc -l)
BACKUP_COUNT=$((BACKUP_COUNT + 1))
BACKUP_FOLDER_NAME="${BACKUP_DATE}_$(printf "%03d" $BACKUP_COUNT)"
BACKUP_DIR="${BACKUP_BASE_DIR}/${BACKUP_FOLDER_NAME}"

log "백업 시스템 시작..."
log "백업 폴더: ${BACKUP_FOLDER_NAME}"

# 백업 디렉토리 생성
mkdir -p "$BACKUP_DIR"
success "백업 디렉토리 생성 완료: $BACKUP_DIR"

# 소스 백업 (제외 항목 필터링)
log "소스 코드 백업 중..."
rsync -av \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='build' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='*.tmp' \
    --exclude='.DS_Store' \
    --exclude='coverage' \
    --exclude='.nyc_output' \
    "$SOURCE_DIR/" "$BACKUP_DIR/"

success "소스 코드 백업 완료"

# 백업 로그 생성
log "백업 로그 작성 중..."
cat > "$BACKUP_DIR/backup_log.txt" << EOF
================================================================
                        백업 로그 파일                        
================================================================

백업 일시: $(date '+%Y-%m-%d %H:%M:%S')
백업 폴더: ${BACKUP_FOLDER_NAME}
백업 사유: ${BACKUP_REASON}

=== 사용자 요청 ===
${USER_REQUEST}

=== 계획된 작업 ===
${PLANNED_WORK}

=== 백업된 내용 ===
- 전체 소스 코드 (src/, server/src/)
- 설정 파일들 (package.json, tsconfig.json, tailwind.config.js 등)
- 문서 파일들 (README.md, QUICKSTART.md 등)
- 데이터베이스 스키마 (setup_database.sql 등)

=== 백업 제외 항목 ===
- node_modules/ (package.json으로 복구 가능)
- dist/, build/ (빌드 결과물)
- .git/ (Git으로 별도 관리)
- *.log, *.tmp (임시/로그 파일)
- .DS_Store (시스템 파일)
- coverage/, .nyc_output/ (테스트 결과)

=== 🔄 복구 방법 (복사해서 사용하세요) ===

🚨 문제 발생시 아래 명령어들을 순서대로 실행:

# 1️⃣ 백업에서 소스 복구
rsync -av "${BACKUP_DIR}/" "${SOURCE_DIR}/"

# 2️⃣ 프론트엔드 의존성 재설치  
cd "${SOURCE_DIR}" && npm install

# 3️⃣ 서버 의존성 재설치
cd "${SOURCE_DIR}/server" && npm install

# 4️⃣ 개발 서버 실행 테스트
cd "${SOURCE_DIR}" && npm run dev

# 5️⃣ 서버 실행 테스트 (별도 터미널)
cd "${SOURCE_DIR}/server" && npm run dev

═════════════════════════════════════════════════════════════
⚠️  복구 전 주의사항:
- 현재 작업 중인 내용이 있다면 별도 백업 필요
- .env 파일은 수동으로 확인/복구 필요할 수 있음
- 데이터베이스 상태도 함께 확인 권장
═════════════════════════════════════════════════════════════

================================================================
                    백업 완료 - 안전 보장됨                     
================================================================
EOF

success "백업 로그 생성 완료"

# 백업 크기 확인
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
FILE_COUNT=$(find "$BACKUP_DIR" -type f | wc -l)

# 완료 메시지
log "=================================="
success "백업 완료!"
log "백업 폴더: ${BACKUP_FOLDER_NAME}"
log "백업 크기: ${BACKUP_SIZE}"
log "파일 개수: ${FILE_COUNT}개"
log "백업 경로: ${BACKUP_DIR}"
log "=================================="

# 백업 목록 표시 (최근 5개)
log "최근 백업 목록:"
ls -1t "$BACKUP_BASE_DIR" | head -5 | while read folder; do
    folder_size=$(du -sh "$BACKUP_BASE_DIR/$folder" 2>/dev/null | cut -f1 || echo "unknown")
    echo "  - $folder ($folder_size)"
done
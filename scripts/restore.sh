#!/bin/bash

# 복구 스크립트 - 백업에서 복원
# 사용법: ./scripts/restore.sh [백업폴더명]
# 예시: ./scripts/restore.sh 20250806_001

set -e  # 에러 발생시 스크립트 중단

# 컬러 출력을 위한 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
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

info() {
    echo -e "${PURPLE}[INFO] $1${NC}"
}

# 경로 설정
SOURCE_DIR="/Users/choijinho/app/study3/metronic/simple_slot"
BACKUP_BASE_DIR="/Users/choijinho/app/study3/metronic/simple_slot_backup"

# 백업 폴더 선택
if [ -z "$1" ]; then
    log "사용 가능한 백업 목록:"
    echo "=================================="
    ls -1t "$BACKUP_BASE_DIR" 2>/dev/null | head -10 | while read folder; do
        if [ -f "$BACKUP_BASE_DIR/$folder/backup_log.txt" ]; then
            backup_date=$(grep "백업 일시:" "$BACKUP_BASE_DIR/$folder/backup_log.txt" 2>/dev/null | cut -d: -f2- | xargs || echo "정보 없음")
            backup_reason=$(grep "백업 사유:" "$BACKUP_BASE_DIR/$folder/backup_log.txt" 2>/dev/null | cut -d: -f2- | xargs || echo "정보 없음")
            folder_size=$(du -sh "$BACKUP_BASE_DIR/$folder" 2>/dev/null | cut -f1 || echo "unknown")
            echo -e "  📁 ${GREEN}$folder${NC} ($folder_size)"
            echo -e "     ⏰ $backup_date"
            echo -e "     📝 $backup_reason"
            echo "  ──────────────────────────────────"
        fi
    done
    echo ""
    error "백업 폴더명을 지정해주세요."
    echo "사용법: ./scripts/restore.sh [백업폴더명]"
    echo "예시: ./scripts/restore.sh 20250806_001"
    exit 1
fi

BACKUP_FOLDER="$1"
BACKUP_DIR="${BACKUP_BASE_DIR}/${BACKUP_FOLDER}"

# 백업 폴더 존재 확인
if [ ! -d "$BACKUP_DIR" ]; then
    error "백업 폴더가 존재하지 않습니다: $BACKUP_DIR"
    exit 1
fi

# 백업 로그 정보 표시
if [ -f "$BACKUP_DIR/backup_log.txt" ]; then
    log "백업 정보:"
    echo "=================================="
    grep -E "(백업 일시|백업 사유|사용자 요청)" "$BACKUP_DIR/backup_log.txt" | head -5
    echo "=================================="
fi

# 확인 요청
warning "⚠️  현재 프로젝트를 ${BACKUP_FOLDER} 백업으로 복구합니다."
warning "⚠️  현재 작업 중인 내용은 모두 덮어씌워집니다!"
echo ""
read -p "정말로 복구하시겠습니까? (y/N): " confirm

if [[ $confirm != [yY] ]]; then
    info "복구가 취소되었습니다."
    exit 0
fi

log "복구 프로세스 시작..."

# 1. 현재 상태 임시 백업 (안전장치)
TEMP_BACKUP_DIR="${BACKUP_BASE_DIR}/temp_before_restore_$(date +%Y%m%d_%H%M%S)"
log "안전장치: 현재 상태 임시 백업 중... ($TEMP_BACKUP_DIR)"
mkdir -p "$TEMP_BACKUP_DIR"
rsync -av --exclude='node_modules' --exclude='dist' --exclude='.git' "$SOURCE_DIR/" "$TEMP_BACKUP_DIR/"
success "현재 상태 임시 백업 완료"

# 2. 백업에서 복구
log "백업에서 소스 복구 중..."
rsync -av "$BACKUP_DIR/" "$SOURCE_DIR/"
success "소스 복구 완료"

# 3. 의존성 재설치
log "프론트엔드 의존성 재설치 중..."
cd "$SOURCE_DIR" && npm install > /dev/null 2>&1
success "프론트엔드 의존성 설치 완료"

if [ -d "$SOURCE_DIR/server" ]; then
    log "서버 의존성 재설치 중..."
    cd "$SOURCE_DIR/server" && npm install > /dev/null 2>&1
    success "서버 의존성 설치 완료"
fi

# 4. 환경 파일 확인
if [ ! -f "$SOURCE_DIR/.env" ] && [ -f "$SOURCE_DIR/.env.example" ]; then
    warning ".env 파일이 없습니다. .env.example을 복사하시겠습니까? (y/N): "
    read -p "" copy_env
    if [[ $copy_env == [yY] ]]; then
        cp "$SOURCE_DIR/.env.example" "$SOURCE_DIR/.env"
        success ".env 파일 생성 완료"
        warning "⚠️  .env 파일의 설정값들을 확인해주세요!"
    fi
fi

# 완료 메시지
log "=================================="
success "복구 완료!"
log "복구된 백업: ${BACKUP_FOLDER}"
log "임시 백업 위치: $TEMP_BACKUP_DIR"
log "=================================="

info "다음 단계:"
echo "1. 개발 서버 실행: cd $SOURCE_DIR && npm run dev"
if [ -d "$SOURCE_DIR/server" ]; then
    echo "2. 서버 실행: cd $SOURCE_DIR/server && npm run dev"
fi
echo "3. .env 파일 설정 확인"
echo "4. 정상 작동 확인 후 임시 백업 삭제 (수동)"

warning "⚠️  문제가 있다면 임시 백업에서 다시 복구할 수 있습니다:"
echo "   rsync -av $TEMP_BACKUP_DIR/ $SOURCE_DIR/"
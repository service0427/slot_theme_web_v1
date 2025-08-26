#!/bin/bash

# ========================================
# v2_rank_daily 데이터 동기화 스크립트 (개선된 버전)
# 외부 DB에서 상품정보와 순위정보를 가져와 v2_rank_daily에 저장
# 중복 방지 로직 적용 - 오늘 이미 동기화된 데이터는 제외
# ========================================

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_debug() {
    if [ "$DEBUG" = "true" ]; then
        echo -e "${BLUE}[DEBUG]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
    fi
}

# ========================================
# DB 연결 정보
# ========================================

# 외부 DB (순위 및 상품정보가 있는 DB)
EXTERNAL_HOST="외부서버IP"
EXTERNAL_PORT="5432"
EXTERNAL_DB="외부DB명"
EXTERNAL_USER="외부사용자"
EXTERNAL_PASS="외부비밀번호"

# 로컬 DB (v2_rank_daily가 있는 DB)
LOCAL_HOST="localhost"
LOCAL_PORT="5432"
LOCAL_DB="simple"
LOCAL_USER="simple"
LOCAL_PASS="Tech1324!"

# ========================================
# 설정값
# ========================================
BATCH_SIZE=1000  # 배치 크기 증가 (테스트: 100 → 운영: 1000)
CHECK_DATE=${1:-$(date +%Y-%m-%d)}  # 날짜를 인자로 받을 수 있음 (기본: 오늘)
TEMP_DIR="/tmp/v2_rank_sync"

# 로그 디렉토리 자동 감지
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"  # scripts의 부모 디렉토리
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/sync_$(date +%Y%m%d_%H%M%S).log"
DEBUG=${DEBUG:-false}  # 디버그 모드 (환경변수로 설정 가능)

# 통계 변수
TOTAL_PROCESSED=0
TOTAL_INSERTED=0
TOTAL_SKIPPED=0
START_TIME=$(date +%s)

# 임시 디렉토리 생성
mkdir -p $TEMP_DIR

# ========================================
# 0. 기존 데이터 확인
# ========================================
check_existing_data() {
    log_info "기존 동기화 데이터 확인 중..."
    
    # 오늘 이미 동기화된 데이터 수 확인
    EXISTING_COUNT=$(PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A -c "
        SELECT COUNT(*) FROM v2_rank_daily WHERE date = '$CHECK_DATE';
    ")
    
    if [ "$EXISTING_COUNT" -gt 0 ]; then
        log_warn "이미 동기화된 데이터: ${EXISTING_COUNT}건"
        
        # 기존 데이터 키 목록을 파일로 저장 (대량 처리를 위해)
        log_info "기존 데이터 키 목록 생성 중..."
        PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A -c "
            SELECT keyword || '|' || product_id || '|' || item_id || '|' || vendor_item_id
            FROM v2_rank_daily 
            WHERE date = '$CHECK_DATE';
        " > $TEMP_DIR/existing_keys.txt
        
        log_info "중복 제외 모드로 실행합니다."
    else
        log_info "기존 데이터 없음 - 전체 동기화 모드"
        touch $TEMP_DIR/existing_keys.txt  # 빈 파일 생성
    fi
    
    return $EXISTING_COUNT
}

# ========================================
# 1. 상품 기본정보 동기화 (개선된 버전)
# ========================================
sync_product_info() {
    log_info "상품 기본정보 동기화 시작..."
    
    local OFFSET=0
    local CONTINUE=1
    local BATCH_COUNT=0
    local SUCCESS_COUNT=0
    local SKIP_COUNT=0
    
    while [ $CONTINUE -eq 1 ]; do
        log_debug "Batch ${BATCH_COUNT}: OFFSET=$OFFSET, LIMIT=$BATCH_SIZE"
        
        # 외부 DB에서 배치 단위로 데이터 가져오기
        RESULT=$(PGPASSWORD=$EXTERNAL_PASS psql -h $EXTERNAL_HOST -p $EXTERNAL_PORT -U $EXTERNAL_USER -d $EXTERNAL_DB -t -A -F'|' <<EOF
        SELECT 
            p.product_id::text,
            p.item_id::text,
            p.vendor_item_id::text,
            REPLACE(COALESCE(p.product_data->>'title', ''), '|', ' ') as product_name,
            COALESCE(p.product_data->'thumbnailImages'->0->>'url', '') as thumbnail,
            r.keyword
        FROM v2_products p
        JOIN v2_rank_history r ON 
            p.product_id = r.product_id AND
            p.item_id = r.item_id AND
            p.vendor_item_id = r.vendor_item_id
        WHERE r.check_date = '$CHECK_DATE'
          AND r.check_count > 9
        GROUP BY p.product_id, p.item_id, p.vendor_item_id, p.product_data, r.keyword
        ORDER BY r.keyword, p.product_id
        LIMIT $BATCH_SIZE OFFSET $OFFSET;
EOF
        )
        
        if [ -z "$RESULT" ]; then
            CONTINUE=0
            log_info "상품정보 동기화 완료: 총 ${SUCCESS_COUNT}건 저장, ${SKIP_COUNT}건 건너뜀"
        else
            # 각 레코드 처리 (파일을 통해 변수 공유)
            echo "$RESULT" > $TEMP_DIR/batch_data.txt
            
            while IFS='|' read -r product_id item_id vendor_item_id product_name thumbnail keyword; do
                # 중복 체크
                CHECK_KEY="${keyword}|${product_id}|${item_id}|${vendor_item_id}"
                
                if grep -q "^${CHECK_KEY}$" $TEMP_DIR/existing_keys.txt 2>/dev/null; then
                    SKIP_COUNT=$((SKIP_COUNT + 1))
                    log_debug "건너뜀: $keyword - $product_name"
                    continue
                fi
                
                # v2_upsert_product_info 함수 호출
                PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -c "
                    SELECT v2_upsert_product_info(
                        '$CHECK_DATE'::date,
                        '$keyword',
                        '$product_id',
                        '$item_id',
                        '$vendor_item_id',
                        '$product_name',
                        '$thumbnail'
                    );
                " > /dev/null 2>&1
                
                if [ $? -eq 0 ]; then
                    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
                    # 성공한 키를 existing_keys에 추가 (다음 배치에서 중복 방지)
                    echo "$CHECK_KEY" >> $TEMP_DIR/existing_keys.txt
                    
                    if [ $((SUCCESS_COUNT % 100)) -eq 0 ]; then
                        log_info "진행: ${SUCCESS_COUNT}건 저장"
                    fi
                else
                    log_error "저장 실패: $keyword - $product_id"
                fi
            done < $TEMP_DIR/batch_data.txt
            
            OFFSET=$((OFFSET + BATCH_SIZE))
            BATCH_COUNT=$((BATCH_COUNT + 1))
        fi
    done
    
    TOTAL_PROCESSED=$((TOTAL_PROCESSED + SUCCESS_COUNT + SKIP_COUNT))
    TOTAL_INSERTED=$((TOTAL_INSERTED + SUCCESS_COUNT))
    TOTAL_SKIPPED=$((TOTAL_SKIPPED + SKIP_COUNT))
}

# ========================================
# 2. 순위 정보 동기화 (개선된 버전)
# ========================================
sync_rank_info() {
    log_info "순위 정보 동기화 시작..."
    
    local OFFSET=0
    local CONTINUE=1
    local BATCH_COUNT=0
    local SUCCESS_COUNT=0
    local SKIP_COUNT=0
    
    while [ $CONTINUE -eq 1 ]; do
        log_debug "Batch ${BATCH_COUNT}: OFFSET=$OFFSET, LIMIT=$BATCH_SIZE"
        
        RESULT=$(PGPASSWORD=$EXTERNAL_PASS psql -h $EXTERNAL_HOST -p $EXTERNAL_PORT -U $EXTERNAL_USER -d $EXTERNAL_DB -t -A -F'|' <<EOF
        SELECT 
            keyword,
            product_id::text,
            item_id::text,
            vendor_item_id::text,
            COALESCE(
                CASE 
                    WHEN jsonb_array_length(rank_data) > 0 THEN 
                        (rank_data->-1->>'rank')::integer
                    ELSE latest_rank
                END, 0
            ) as rank,
            COALESCE(rating, 0) as rating,
            COALESCE(review_count, 0) as review_count
        FROM v2_rank_history
        WHERE check_date = '$CHECK_DATE'
          AND keyword IS NOT NULL
          AND check_count > 9
        ORDER BY keyword, latest_rank NULLS LAST
        LIMIT $BATCH_SIZE OFFSET $OFFSET;
EOF
        )
        
        if [ -z "$RESULT" ]; then
            CONTINUE=0
            log_info "순위정보 동기화 완료: 총 ${SUCCESS_COUNT}건 저장, ${SKIP_COUNT}건 건너뜀"
        else
            # 각 레코드 처리 (파일을 통해 변수 공유)
            echo "$RESULT" > $TEMP_DIR/rank_batch_data.txt
            
            while IFS='|' read -r keyword product_id item_id vendor_item_id rank rating review_count; do
                # 중복 체크
                CHECK_KEY="${keyword}|${product_id}|${item_id}|${vendor_item_id}"
                
                if grep -q "^${CHECK_KEY}$" $TEMP_DIR/existing_keys.txt 2>/dev/null; then
                    SKIP_COUNT=$((SKIP_COUNT + 1))
                    log_debug "건너뜀: $keyword - Rank: $rank"
                    continue
                fi
                
                # v2_upsert_rank_info 함수 호출
                PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -c "
                    SELECT v2_upsert_rank_info(
                        '$CHECK_DATE'::date,
                        '$keyword',
                        '$product_id',
                        '$item_id',
                        '$vendor_item_id',
                        $rank,
                        $rating,
                        $review_count
                    );
                " > /dev/null 2>&1
                
                if [ $? -eq 0 ]; then
                    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
                    echo "$CHECK_KEY" >> $TEMP_DIR/existing_keys.txt
                    
                    if [ $((SUCCESS_COUNT % 100)) -eq 0 ]; then
                        log_info "진행: ${SUCCESS_COUNT}건 저장"
                    fi
                else
                    log_error "저장 실패: $keyword - $product_id"
                fi
            done < $TEMP_DIR/rank_batch_data.txt
            
            OFFSET=$((OFFSET + BATCH_SIZE))
            BATCH_COUNT=$((BATCH_COUNT + 1))
        fi
    done
    
    TOTAL_PROCESSED=$((TOTAL_PROCESSED + SUCCESS_COUNT + SKIP_COUNT))
    TOTAL_INSERTED=$((TOTAL_INSERTED + SUCCESS_COUNT))
    TOTAL_SKIPPED=$((TOTAL_SKIPPED + SKIP_COUNT))
}

# ========================================
# 3. 동기화 결과 확인 (개선된 버전)
# ========================================
verify_sync() {
    log_info "동기화 결과 확인 중..."
    
    # 최종 통계
    END_TIME=$(date +%s)
    ELAPSED=$((END_TIME - START_TIME))
    
    RESULT=$(PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A <<EOF
    SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT keyword) as unique_keywords,
        COUNT(CASE WHEN rank IS NOT NULL THEN 1 END) as with_rank,
        COUNT(CASE WHEN product_name IS NOT NULL THEN 1 END) as with_product_name
    FROM v2_rank_daily
    WHERE date = '$CHECK_DATE';
EOF
    )
    
    IFS='|' read -r total keywords with_rank with_name <<< "$RESULT"
    
    log_info "========================================="
    log_info "동기화 완료 - $CHECK_DATE"
    log_info "========================================="
    log_info "처리 시간: ${ELAPSED}초"
    log_info "처리된 레코드: ${TOTAL_PROCESSED}건"
    log_info "  - 신규 저장: ${TOTAL_INSERTED}건"
    log_info "  - 중복 건너뜀: ${TOTAL_SKIPPED}건"
    log_info "-----------------------------------------"
    log_info "최종 DB 상태:"
    log_info "  - 총 레코드: $total"
    log_info "  - 고유 키워드: $keywords"
    log_info "  - 순위 정보: $with_rank"
    log_info "  - 상품명: $with_name"
    log_info "========================================="
}

# ========================================
# 4. 에러 핸들링
# ========================================
cleanup_on_error() {
    log_error "스크립트 중단됨. 정리 작업 수행 중..."
    rm -rf $TEMP_DIR
    exit 1
}

# 시그널 트랩 설정
trap cleanup_on_error INT TERM

# ========================================
# 메인 실행
# ========================================
main() {
    log_info "========================================="
    log_info "v2_rank_daily 동기화 시작"
    log_info "대상 날짜: $CHECK_DATE"
    log_info "배치 크기: $BATCH_SIZE"
    log_info "========================================="
    
    # 0. 기존 데이터 확인
    check_existing_data
    EXISTING_COUNT=$?
    
    # 1. 상품정보 동기화
    sync_product_info
    
    # 2. 순위정보 동기화
    sync_rank_info
    
    # 3. 결과 확인
    verify_sync
    
    # 4. 임시 파일 정리
    rm -rf $TEMP_DIR
    
    log_info "동기화 프로세스 완료"
}

# 로그 디렉토리 생성 및 파일로 출력 리디렉션
mkdir -p "$LOG_DIR"
exec 1> >(tee -a "$LOG_FILE")
exec 2>&1

# 스크립트 실행
main
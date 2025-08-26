#!/bin/bash

# ========================================
# v2_rank_daily 동기화 스크립트
# 우리 slots 테이블 기준으로 외부 DB에서 정보 가져오기
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
# 설정 파일 로드
# ========================================

# 스크립트 디렉토리 확인
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/sync.config"

# 설정 파일 존재 확인
if [ ! -f "$CONFIG_FILE" ]; then
    log_error "설정 파일이 없습니다: $CONFIG_FILE"
    log_error "sync.config.example을 복사해서 sync.config로 만들고 실제 값을 입력하세요"
    exit 1
fi

# 설정 파일 로드
source "$CONFIG_FILE"

# 필수 설정값 확인
if [ -z "$EXTERNAL_HOST" ] || [ "$EXTERNAL_HOST" = "외부서버IP" ]; then
    log_error "EXTERNAL_HOST가 설정되지 않았습니다. sync.config 파일을 확인하세요"
    exit 1
fi

log_info "설정 파일 로드 완료: $CONFIG_FILE"

# ========================================
# 추가 설정값
# ========================================
CHECK_DATE=${1:-$(date +%Y-%m-%d)}  # 날짜를 인자로 받을 수 있음 (기본: 오늘)
TEMP_DIR="/tmp/v2_rank_sync_$$"

# 로그 디렉토리 설정
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/sync_v2_$(date +%Y%m%d_%H%M%S).log"

# 통계 변수
TOTAL_SLOTS=0
TOTAL_PROCESSED=0
TOTAL_SUCCESS=0
TOTAL_FAILED=0
START_TIME=$(date +%s)

# 임시 디렉토리 생성
mkdir -p $TEMP_DIR

# ========================================
# 0. 우리 slots 데이터 추출
# ========================================
extract_our_slots() {
    log_info "우리 slots 데이터 추출 중..."
    
    # URL에서 product_id, item_id, vendor_item_id 추출
    # trim_keyword 사용 (공백 제거된 버전)
    PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A -F'|' -c "
        SELECT DISTINCT 
            COALESCE(trim_keyword, REPLACE(keyword, ' ', '')) as keyword,
            SUBSTRING(url FROM 'products/([0-9]+)') as product_id,
            SUBSTRING(url FROM 'itemId=([0-9]+)') as item_id,
            SUBSTRING(url FROM 'vendorItemId=([0-9]+)') as vendor_item_id
        FROM slots
        WHERE url IS NOT NULL
          AND url LIKE '%coupang.com%'
          AND url LIKE '%products/%'
          AND url LIKE '%itemId=%'
          AND url LIKE '%vendorItemId=%'
          AND keyword IS NOT NULL
          AND keyword != '';
    " > $TEMP_DIR/our_slots.txt
    
    TOTAL_SLOTS=$(wc -l < $TEMP_DIR/our_slots.txt)
    log_info "추출 완료: ${TOTAL_SLOTS}개 slot 발견"
    
    if [ "$TOTAL_SLOTS" -eq 0 ]; then
        log_error "slots 테이블에 유효한 데이터가 없습니다"
        exit 1
    fi
}

# ========================================
# 1. 기존 데이터 확인
# ========================================
check_existing_data() {
    log_info "기존 v2_rank_daily 데이터 확인 중..."
    
    EXISTING_COUNT=$(PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A -c "
        SELECT COUNT(*) FROM v2_rank_daily WHERE date = '$CHECK_DATE';
    ")
    
    log_info "날짜 $CHECK_DATE의 기존 데이터: ${EXISTING_COUNT}건"
    
    # 이미 완전한 데이터가 있는 키 목록 생성
    PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A -c "
        SELECT keyword || '|' || product_id || '|' || item_id || '|' || vendor_item_id
        FROM v2_rank_daily 
        WHERE date = '$CHECK_DATE'
          AND product_name IS NOT NULL AND product_name != ''
          AND thumbnail IS NOT NULL AND thumbnail != ''
          AND rank IS NOT NULL AND rank > 0;
    " > $TEMP_DIR/complete_keys.txt
    
    local COMPLETE_COUNT=$(wc -l < $TEMP_DIR/complete_keys.txt)
    log_info "완전한 데이터: ${COMPLETE_COUNT}건 (이미 동기화 완료)"
}

# ========================================
# 2. 외부 DB에서 정보 동기화
# ========================================
sync_from_external() {
    log_info "외부 DB에서 정보 동기화 시작..."
    
    local PROCESSED=0
    local SUCCESS=0
    local FAILED=0
    local SKIPPED=0
    
    while IFS='|' read -r keyword product_id item_id vendor_item_id; do
        PROCESSED=$((PROCESSED + 1))
        
        # 진행상황 표시
        if [ $((PROCESSED % 50)) -eq 0 ]; then
            log_info "진행중: ${PROCESSED}/${TOTAL_SLOTS} (성공: $SUCCESS, 실패: $FAILED, 스킵: $SKIPPED)"
        fi
        
        # 이미 완전한 데이터가 있는지 확인
        CHECK_KEY="${keyword}|${product_id}|${item_id}|${vendor_item_id}"
        if grep -q "^${CHECK_KEY}$" $TEMP_DIR/complete_keys.txt 2>/dev/null; then
            SKIPPED=$((SKIPPED + 1))
            log_debug "완전한 데이터 존재, 스킵: $CHECK_KEY"
            continue
        fi
        
        # 외부 DB에서 상품 정보 가져오기
        PRODUCT_INFO=$(PGPASSWORD=$EXTERNAL_PASS psql -h $EXTERNAL_HOST -p $EXTERNAL_PORT -U $EXTERNAL_USER -d $EXTERNAL_DB -t -A -F'|' <<EOF 2>/dev/null
        SELECT 
            REPLACE(COALESCE(product_data->>'title', ''), '|', ' ') as product_name,
            COALESCE(product_data->'thumbnailImages'->0->>'url', '') as thumbnail
        FROM v2_products
        WHERE product_id = '$product_id'
          AND item_id = '$item_id'
          AND vendor_item_id = '$vendor_item_id'
        LIMIT 1;
EOF
        )
        
        if [ ! -z "$PRODUCT_INFO" ]; then
            IFS='|' read -r product_name thumbnail <<< "$PRODUCT_INFO"
            
            # 상품 정보 저장
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
        fi
        
        # 외부 DB에서 순위 정보 가져오기 (rank_data JSON 처리 포함)
        RANK_INFO=$(PGPASSWORD=$EXTERNAL_PASS psql -h $EXTERNAL_HOST -p $EXTERNAL_PORT -U $EXTERNAL_USER -d $EXTERNAL_DB -t -A -F'|' <<EOF 2>/dev/null
        WITH rank_history AS (
            SELECT 
                *,
                -- 어제 순위 가져오기
                LAG(latest_rank) OVER (ORDER BY check_date) as yesterday_rank
            FROM v2_rank_history
            WHERE keyword = '$keyword'
              AND product_id = '$product_id'
              AND item_id = '$item_id'
              AND vendor_item_id = '$vendor_item_id'
              AND check_date >= '$CHECK_DATE'::date - interval '1 day'
              AND check_date <= '$CHECK_DATE'::date
        ),
        today_data AS (
            SELECT 
                -- rank_data JSON에서 순위 배열 추출
                ARRAY(
                    SELECT DISTINCT (elem->>'rank')::integer 
                    FROM jsonb_array_elements(rank_data) elem 
                    WHERE elem->>'rank' IS NOT NULL
                    ORDER BY (elem->>'rank')::integer
                ) as ranks_array,
                yesterday_rank,
                latest_rank,
                rating,
                review_count
            FROM rank_history
            WHERE check_date = '$CHECK_DATE'
              AND check_count > 9
            ORDER BY check_count DESC
            LIMIT 1
        )
        SELECT 
            COALESCE(
                CASE 
                    -- rank_data 배열이 있을 때
                    WHEN array_length(ranks_array, 1) > 0 THEN
                        CASE
                            -- 어제 순위가 있으면: 어제보다 바로 높은 순위 선택
                            WHEN yesterday_rank IS NOT NULL THEN
                                (SELECT MIN(r) FROM unnest(ranks_array) r WHERE r > yesterday_rank)
                            -- 어제 순위가 없으면: 최대값 (가장 낮은 순위)
                            ELSE
                                (SELECT MAX(r) FROM unnest(ranks_array) r)
                        END
                    -- rank_data가 없으면 latest_rank 사용
                    ELSE latest_rank
                END, 0
            ) as calculated_rank,
            COALESCE(rating, 0) as rating,
            COALESCE(review_count, 0) as review_count
        FROM today_data;
EOF
        )
        
        if [ ! -z "$RANK_INFO" ]; then
            IFS='|' read -r rank rating review_count <<< "$RANK_INFO"
            
            # 순위 정보 저장
            PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -c "
                SELECT v2_upsert_rank_info(
                    '$CHECK_DATE'::date,
                    '$keyword',
                    '$product_id',
                    '$item_id',
                    '$vendor_item_id',
                    ${rank:-0},
                    ${rating:-0},
                    ${review_count:-0}
                );
            " > /dev/null 2>&1
            
            if [ $? -eq 0 ]; then
                SUCCESS=$((SUCCESS + 1))
                log_debug "저장 성공: $keyword - 순위: $rank"
            else
                FAILED=$((FAILED + 1))
                log_error "저장 실패: $keyword - $product_id"
            fi
        else
            log_debug "외부 DB에 순위 정보 없음: $keyword - $product_id"
            FAILED=$((FAILED + 1))
        fi
        
    done < $TEMP_DIR/our_slots.txt
    
    TOTAL_PROCESSED=$PROCESSED
    TOTAL_SUCCESS=$SUCCESS
    TOTAL_FAILED=$FAILED
    
    log_info "동기화 완료 - 처리: $PROCESSED, 성공: $SUCCESS, 실패: $FAILED, 스킵: $SKIPPED"
}

# ========================================
# 3. 동기화 결과 확인
# ========================================
verify_sync() {
    log_info "동기화 결과 확인 중..."
    
    END_TIME=$(date +%s)
    ELAPSED=$((END_TIME - START_TIME))
    
    RESULT=$(PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A <<EOF
    SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT keyword) as unique_keywords,
        COUNT(CASE WHEN rank IS NOT NULL AND rank > 0 THEN 1 END) as with_rank,
        COUNT(CASE WHEN product_name IS NOT NULL THEN 1 END) as with_product_name
    FROM v2_rank_daily
    WHERE date = '$CHECK_DATE';
EOF
    )
    
    IFS='|' read -r total keywords with_rank with_name <<< "$RESULT"
    
    log_info "========================================="
    log_info "동기화 완료 - $CHECK_DATE"
    log_info "========================================="
    log_info "소요 시간: ${ELAPSED}초"
    log_info "우리 slots: ${TOTAL_SLOTS}개"
    log_info "처리 결과: 성공 ${TOTAL_SUCCESS}개, 실패 ${TOTAL_FAILED}개"
    log_info "-----------------------------------------"
    log_info "DB 최종 상태:"
    log_info "  - 총 레코드: $total"
    log_info "  - 고유 키워드: $keywords"
    log_info "  - 순위 정보: $with_rank"
    log_info "  - 상품명: $with_name"
    log_info "========================================="
}

# ========================================
# 4. 정리 작업
# ========================================
cleanup() {
    log_debug "임시 파일 정리 중..."
    rm -rf $TEMP_DIR
}

# 에러 핸들링
cleanup_on_error() {
    log_error "스크립트 중단됨. 정리 작업 수행 중..."
    cleanup
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
    log_info "========================================="
    
    # 0. 우리 slots 데이터 추출
    extract_our_slots
    
    # 1. 기존 데이터 확인
    check_existing_data
    
    # 2. 외부 DB에서 정보 동기화
    sync_from_external
    
    # 3. 결과 확인
    verify_sync
    
    # 4. 정리
    cleanup
    
    log_info "동기화 프로세스 완료"
}

# 로그 디렉토리 생성 및 파일로 출력
mkdir -p "$LOG_DIR"
exec 1> >(tee -a "$LOG_FILE")
exec 2>&1

# 스크립트 실행
main
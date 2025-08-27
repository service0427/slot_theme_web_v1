#!/bin/bash

# ========================================
# v3_rank_daily 동기화 스크립트
# v2_slot_tasks_daily_progress 테이블에서 데이터 가져오기
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

# ========================================
# 변수 설정
# ========================================

# 날짜 파라미터 (기본값: 오늘)
CHECK_DATE="${1:-$(date +%Y-%m-%d)}"
YESTERDAY=$(date -d "$CHECK_DATE - 1 day" +%Y-%m-%d 2>/dev/null || date -v-1d -j -f "%Y-%m-%d" "$CHECK_DATE" +%Y-%m-%d 2>/dev/null || echo "")

# 디버그 모드
DEBUG="${DEBUG:-false}"

# ========================================
# 메인 처리
# ========================================

main() {
    log_info "========================================="
    log_info "v3_rank_daily 동기화 시작"
    log_info "대상 날짜: $CHECK_DATE"
    log_info "v2_slot_tasks_daily_progress 테이블 사용"
    log_info "========================================="
    
    # 1. 우리 DB의 슬롯 조회
    log_info "로컬 DB에서 슬롯 정보 조회 중..."
    
    SLOTS=$(PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A -F'|' <<EOF 2>/dev/null
        SELECT DISTINCT 
            s.id,
            COALESCE(s.trim_keyword, REPLACE(s.keyword, ' ', '')) as keyword,
            SUBSTRING(s.url FROM 'products/([0-9]+)') as product_id,
            COALESCE(SUBSTRING(s.url FROM 'itemId=([0-9]+)'), '') as item_id,
            COALESCE(SUBSTRING(s.url FROM 'vendorItemId=([0-9]+)'), '') as vendor_item_id
        FROM slots s
        WHERE s.status = 'active'
          AND s.keyword IS NOT NULL
          AND s.keyword != ''
          AND s.url IS NOT NULL
          AND s.url != ''
        ORDER BY 1;
EOF
    )
    
    if [ -z "$SLOTS" ]; then
        log_warn "활성 슬롯이 없습니다."
        exit 0
    fi
    
    TOTAL_SLOTS=$(echo "$SLOTS" | wc -l)
    log_info "총 ${TOTAL_SLOTS}개의 활성 슬롯 발견"
    
    # 2. 오늘 날짜의 기존 데이터 삭제
    log_info "v2_rank_daily에서 $CHECK_DATE 데이터 삭제 중..."
    
    DELETE_COUNT=$(PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A <<EOF 2>/dev/null
        DELETE FROM v2_rank_daily 
        WHERE date = '$CHECK_DATE'::date
        RETURNING 1;
EOF
    )
    
    DELETED_ROWS=$(echo "$DELETE_COUNT" | wc -l)
    log_info "삭제된 레코드: ${DELETED_ROWS}건"
    
    # 3. 각 슬롯에 대해 순위 정보 동기화
    SUCCESS_COUNT=0
    FAIL_COUNT=0
    NO_DATA_COUNT=0
    
    while IFS='|' read -r slot_id keyword product_id item_id vendor_item_id; do
        log_debug "처리 중: $keyword (ID: $slot_id)"
        
        # 외부 DB에서 순위 정보 가져오기 (v2_slot_tasks_daily_progress 사용)
        RESULT=$(PGPASSWORD=$EXTERNAL_PASS psql -h $EXTERNAL_HOST -p $EXTERNAL_PORT -U $EXTERNAL_USER -d $EXTERNAL_DB -t -A <<EOF 2>/dev/null
        WITH yesterday_data AS (
            -- 어제 순위 데이터
            SELECT 
                latest_rank as yesterday_rank
            FROM v2_slot_tasks_daily_progress
            WHERE keyword = '$keyword'
              AND product_id = '$product_id'
              AND item_id = '$item_id'
              AND vendor_item_id = '$vendor_item_id'
              AND progress_date = '$CHECK_DATE'::date - interval '1 day'
              AND site_code = 'cpck'
              AND is_rcheck_completed = true
              AND rcheck_count > 9
        ),
        today_data AS (
            SELECT 
                p.product_name,
                p.thumbnail,
                h.*,
                COALESCE(y.yesterday_rank, 0) as yesterday_rank
            FROM v2_slot_tasks_daily_progress h
            LEFT JOIN v2_products p ON 
                p.product_id = h.product_id 
                AND p.item_id = h.item_id 
                AND p.vendor_item_id = h.vendor_item_id
            LEFT JOIN yesterday_data y ON 1=1
            WHERE h.keyword = '$keyword'
              AND h.product_id = '$product_id'
              AND h.item_id = '$item_id'
              AND h.vendor_item_id = '$vendor_item_id'
              AND h.progress_date = '$CHECK_DATE'
              AND h.rcheck_count > 9
              AND h.site_code = 'cpck'
              AND h.is_rcheck_completed = true
            ORDER BY h.rcheck_count DESC
            LIMIT 1
        )
        SELECT 
            CASE 
                WHEN min_rank IS NOT NULL AND min_rank > 0 AND min_rank <= 500 THEN min_rank
                WHEN min_rank IS NOT NULL AND min_rank > 500 THEN 0
                WHEN min_rank IS NULL AND EXISTS (
                    SELECT 1 FROM jsonb_array_elements(rank_data) elem 
                    WHERE (elem->>'rank')::integer = 0
                ) THEN 0
                ELSE NULL
            END as rank,
            yesterday_rank,
            COALESCE(product_name, '') as product_name,
            COALESCE(thumbnail, '') as thumbnail,
            COALESCE(rating::text, '0') as rating,
            COALESCE(review_count::text, '0') as review_count
        FROM today_data;
EOF
        )
        
        if [ -z "$RESULT" ]; then
            log_debug "  → 데이터 없음: $keyword"
            ((NO_DATA_COUNT++))
            continue
        fi
        
        # 결과 파싱
        IFS='|' read -r rank yesterday_rank product_name thumbnail rating review_count <<< "$RESULT"
        
        # NULL 처리
        if [ "$rank" = "" ]; then
            rank="NULL"
        fi
        if [ "$yesterday_rank" = "" ] || [ "$yesterday_rank" = "0" ]; then
            yesterday_rank="0"
        fi
        
        # 로컬 DB에 저장
        INSERT_RESULT=$(PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A <<EOF 2>&1
            INSERT INTO v2_rank_daily (
                date, keyword, product_id, item_id, vendor_item_id,
                rank, yesterday_rank, product_name, thumbnail, rating, review_count
            ) VALUES (
                '$CHECK_DATE'::date,
                '$keyword',
                '$product_id',
                '$item_id',
                '$vendor_item_id',
                $([ "$rank" = "NULL" ] && echo "NULL" || echo "$rank"),
                $yesterday_rank,
                \$\$${product_name}\$\$,
                \$\$${thumbnail}\$\$,
                ${rating:-0},
                ${review_count:-0}
            )
            ON CONFLICT (date, keyword, product_id, item_id, vendor_item_id)
            DO UPDATE SET
                rank = EXCLUDED.rank,
                yesterday_rank = EXCLUDED.yesterday_rank,
                product_name = EXCLUDED.product_name,
                thumbnail = EXCLUDED.thumbnail,
                rating = EXCLUDED.rating,
                review_count = EXCLUDED.review_count,
                updated_at = CURRENT_TIMESTAMP
            RETURNING 1;
EOF
        )
        
        if [ "$?" -eq 0 ]; then
            log_debug "  ✓ 저장 성공: $keyword (순위: ${rank:-측정중}, 어제: ${yesterday_rank})"
            ((SUCCESS_COUNT++))
        else
            log_error "  ✗ 저장 실패: $keyword"
            log_debug "    에러: $INSERT_RESULT"
            ((FAIL_COUNT++))
        fi
        
    done <<< "$SLOTS"
    
    # 4. 결과 요약
    log_info "========================================="
    log_info "동기화 완료"
    log_info "성공: ${SUCCESS_COUNT}건"
    log_info "실패: ${FAIL_COUNT}건"  
    log_info "데이터 없음: ${NO_DATA_COUNT}건"
    log_info "========================================="
    
    # 5. 최종 통계 확인
    STATS=$(PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A <<EOF 2>/dev/null
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN rank IS NOT NULL THEN 1 END) as with_rank,
            COUNT(CASE WHEN rank = 0 THEN 1 END) as zero_rank,
            COUNT(CASE WHEN rank IS NULL THEN 1 END) as null_rank,
            COUNT(CASE WHEN yesterday_rank > 0 THEN 1 END) as with_yesterday
        FROM v2_rank_daily
        WHERE date = '$CHECK_DATE'::date;
EOF
    )
    
    IFS='|' read -r total with_rank zero_rank null_rank with_yesterday <<< "$STATS"
    
    log_info "v2_rank_daily 통계 ($CHECK_DATE):"
    log_info "  - 전체: ${total}건"
    log_info "  - 순위 있음: ${with_rank}건"
    log_info "  - 순위 없음(0): ${zero_rank}건"
    log_info "  - 측정중(NULL): ${null_rank}건"
    log_info "  - 어제 순위 있음: ${with_yesterday}건"
}

# ========================================
# 스크립트 실행
# ========================================

main "$@"
#!/bin/bash

# ========================================
# v3_rank_daily 테스트 스크립트
# 특정 키워드로 동기화 테스트
# v2_slot_tasks_daily_progress 테이블 사용
# ========================================

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_debug() {
    echo -e "${BLUE}[DEBUG]${NC} $1"
}

log_success() {
    echo -e "${CYAN}[SUCCESS]${NC} $1"
}

# ========================================
# 설정 파일 로드
# ========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/sync.config"

if [ ! -f "$CONFIG_FILE" ]; then
    log_error "설정 파일이 없습니다: $CONFIG_FILE"
    exit 1
fi

source "$CONFIG_FILE"

# ========================================
# 변수 설정
# ========================================

# 테스트할 키워드 (파라미터로 받거나 기본값)
TEST_KEYWORD="${1:-샤워기}"
CHECK_DATE="${2:-$(date +%Y-%m-%d)}"

echo ""
log_info "========================================="
log_info "v3 순위 동기화 테스트"
log_info "테스트 키워드: $TEST_KEYWORD"
log_info "체크 날짜: $CHECK_DATE"
log_info "========================================="
echo ""

# ========================================
# 1. 로컬 DB에서 슬롯 확인
# ========================================

log_info "[1단계] 로컬 DB 슬롯 확인..."
SLOT_INFO=$(PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A -F'|' <<EOF 2>/dev/null
    SELECT 
        s.id,
        s.keyword,
        COALESCE(s.trim_keyword, REPLACE(s.keyword, ' ', '')) as trim_keyword,
        s.url,
        SUBSTRING(s.url FROM 'products/([0-9]+)') as product_id,
        COALESCE(SUBSTRING(s.url FROM 'itemId=([0-9]+)'), '') as item_id,
        COALESCE(SUBSTRING(s.url FROM 'vendorItemId=([0-9]+)'), '') as vendor_item_id,
        s.status
    FROM slots s
    WHERE (s.keyword = '$TEST_KEYWORD' OR s.trim_keyword = '$TEST_KEYWORD')
    LIMIT 1;
EOF
)

if [ -z "$SLOT_INFO" ]; then
    log_error "키워드 '$TEST_KEYWORD'에 해당하는 슬롯을 찾을 수 없습니다."
    exit 1
fi

IFS='|' read -r slot_id keyword trim_keyword url product_id item_id vendor_item_id status <<< "$SLOT_INFO"

log_success "슬롯 발견!"
log_info "  - Slot ID: $slot_id"
log_info "  - 키워드: $keyword (trim: $trim_keyword)"
log_info "  - Product ID: $product_id"
log_info "  - Item ID: $item_id"
log_info "  - Vendor Item ID: $vendor_item_id"
log_info "  - 상태: $status"
echo ""

# ========================================
# 2. 외부 DB 테이블 확인
# ========================================

log_info "[2단계] 외부 DB 연결 테스트..."
EXTERNAL_CHECK=$(PGPASSWORD=$EXTERNAL_PASS psql -h $EXTERNAL_HOST -p $EXTERNAL_PORT -U $EXTERNAL_USER -d $EXTERNAL_DB -t -A <<EOF 2>&1
    SELECT COUNT(*) FROM v2_slot_tasks_daily_progress WHERE progress_date = '$CHECK_DATE' LIMIT 1;
EOF
)

if [ "$?" -ne 0 ]; then
    log_error "외부 DB 연결 실패"
    log_error "$EXTERNAL_CHECK"
    exit 1
fi

log_success "외부 DB 연결 성공!"
log_info "  - 오늘 전체 레코드: ${EXTERNAL_CHECK}건"
echo ""

# ========================================
# 3. v2_slot_tasks_daily_progress에서 순위 데이터 확인
# ========================================

log_info "[3단계] v2_slot_tasks_daily_progress 데이터 확인..."
RANK_DATA=$(PGPASSWORD=$EXTERNAL_PASS psql -h $EXTERNAL_HOST -p $EXTERNAL_PORT -U $EXTERNAL_USER -d $EXTERNAL_DB -t -A -F'|' <<EOF 2>/dev/null
    SELECT 
        progress_date,
        keyword,
        product_id,
        rcheck_count,
        is_rcheck_completed,
        min_rank,
        latest_rank,
        max_rank,
        avg_rank,
        rating,
        review_count,
        CASE 
            WHEN jsonb_array_length(rank_data) > 0 THEN jsonb_array_length(rank_data)
            ELSE 0
        END as rank_data_count
    FROM v2_slot_tasks_daily_progress
    WHERE keyword = '$trim_keyword'
      AND product_id = '$product_id'
      AND item_id = '$item_id'
      AND vendor_item_id = '$vendor_item_id'
      AND progress_date = '$CHECK_DATE'
      AND site_code = 'cpck'
    ORDER BY rcheck_count DESC
    LIMIT 5;
EOF
)

if [ -z "$RANK_DATA" ]; then
    log_warn "해당 키워드의 순위 데이터가 없습니다."
    
    # 조건 완화하여 다시 확인
    log_info "조건을 완화하여 다시 확인 중..."
    RANK_DATA=$(PGPASSWORD=$EXTERNAL_PASS psql -h $EXTERNAL_HOST -p $EXTERNAL_PORT -U $EXTERNAL_USER -d $EXTERNAL_DB -t -A -F'|' <<EOF 2>/dev/null
        SELECT 
            progress_date,
            keyword,
            rcheck_count,
            is_rcheck_completed,
            min_rank,
            site_code
        FROM v2_slot_tasks_daily_progress
        WHERE keyword = '$trim_keyword'
          AND progress_date = '$CHECK_DATE'
        LIMIT 5;
EOF
    )
    
    if [ -z "$RANK_DATA" ]; then
        log_error "키워드 '$trim_keyword'의 데이터를 찾을 수 없습니다."
    else
        log_info "다른 조건의 데이터 발견:"
        echo "$RANK_DATA" | while IFS='|' read -r date kw rcount completed min_r site; do
            log_debug "  날짜: $date, 키워드: $kw, rcheck: $rcount, 완료: $completed, 최소순위: $min_r, 사이트: $site"
        done
    fi
else
    log_success "순위 데이터 발견!"
    echo "$RANK_DATA" | while IFS='|' read -r date kw pid rcount completed min_r latest_r max_r avg_r rating review rank_cnt; do
        log_info "  ----------------------------------------"
        log_info "  날짜: $date"
        log_info "  rcheck_count: $rcount"
        log_info "  is_rcheck_completed: $completed"
        log_info "  min_rank: ${min_r:-NULL}"
        log_info "  latest_rank: ${latest_r:-NULL}"
        log_info "  max_rank: ${max_r:-NULL}"
        log_info "  avg_rank: ${avg_r:-NULL}"
        log_info "  평점/리뷰: ${rating:-0} / ${review:-0}"
        log_info "  rank_data 개수: ${rank_cnt:-0}"
    done
fi
echo ""

# ========================================
# 4. 유효한 데이터만 필터링
# ========================================

log_info "[4단계] 동기화 조건 확인 (rcheck_count > 9 & is_rcheck_completed = true)..."
VALID_DATA=$(PGPASSWORD=$EXTERNAL_PASS psql -h $EXTERNAL_HOST -p $EXTERNAL_PORT -U $EXTERNAL_USER -d $EXTERNAL_DB -t -A -F'|' <<EOF 2>/dev/null
    SELECT 
        min_rank,
        latest_rank,
        rating,
        review_count,
        rcheck_count
    FROM v2_slot_tasks_daily_progress
    WHERE keyword = '$trim_keyword'
      AND product_id = '$product_id'
      AND item_id = '$item_id'
      AND vendor_item_id = '$vendor_item_id'
      AND progress_date = '$CHECK_DATE'
      AND site_code = 'cpck'
      AND is_rcheck_completed = true
      AND rcheck_count > 9
    ORDER BY rcheck_count DESC
    LIMIT 1;
EOF
)

if [ -z "$VALID_DATA" ]; then
    log_warn "동기화 조건을 만족하는 데이터가 없습니다."
    log_info "  - rcheck_count > 9"
    log_info "  - is_rcheck_completed = true"
    log_info "  - site_code = 'cpck'"
else
    IFS='|' read -r min_rank latest_rank rating review_count rcheck_count <<< "$VALID_DATA"
    log_success "유효한 데이터 발견!"
    log_info "  - min_rank: ${min_rank:-NULL}"
    log_info "  - latest_rank: ${latest_rank:-NULL}"
    log_info "  - rcheck_count: $rcheck_count"
    log_info "  - 평점: ${rating:-0}"
    log_info "  - 리뷰: ${review_count:-0}"
fi
echo ""

# ========================================
# 5. 실제 동기화 테스트
# ========================================

log_info "[5단계] 동기화 실행 중..."

# 기존 데이터 삭제
PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB <<EOF 2>/dev/null
    DELETE FROM v2_rank_daily 
    WHERE date = '$CHECK_DATE'
      AND keyword = '$trim_keyword'
      AND product_id = '$product_id';
EOF

# 동기화 실행
SYNC_RESULT=$(PGPASSWORD=$EXTERNAL_PASS psql -h $EXTERNAL_HOST -p $EXTERNAL_PORT -U $EXTERNAL_USER -d $EXTERNAL_DB -t -A <<EOF 2>/dev/null
    WITH yesterday_data AS (
        SELECT latest_rank as yesterday_rank
        FROM v2_slot_tasks_daily_progress
        WHERE keyword = '$trim_keyword'
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
        WHERE h.keyword = '$trim_keyword'
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
            ELSE NULL
        END as rank,
        yesterday_rank,
        COALESCE(product_name, '') as product_name,
        COALESCE(rating::text, '0') as rating,
        COALESCE(review_count::text, '0') as review_count
    FROM today_data;
EOF
)

if [ -z "$SYNC_RESULT" ]; then
    log_warn "동기화할 데이터가 없습니다."
else
    IFS='|' read -r rank yesterday_rank product_name rating review_count <<< "$SYNC_RESULT"
    
    # 로컬 DB에 저장
    INSERT_RESULT=$(PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB <<EOF 2>&1
        INSERT INTO v2_rank_daily (
            date, keyword, product_id, item_id, vendor_item_id,
            rank, yesterday_rank, product_name, rating, review_count
        ) VALUES (
            '$CHECK_DATE'::date,
            '$trim_keyword',
            '$product_id',
            '$item_id',
            '$vendor_item_id',
            $([ "$rank" = "" ] && echo "NULL" || echo "$rank"),
            ${yesterday_rank:-0},
            \$\$${product_name}\$\$,
            ${rating:-0},
            ${review_count:-0}
        )
        ON CONFLICT (date, keyword, product_id, item_id, vendor_item_id)
        DO UPDATE SET
            rank = EXCLUDED.rank,
            yesterday_rank = EXCLUDED.yesterday_rank,
            product_name = EXCLUDED.product_name,
            rating = EXCLUDED.rating,
            review_count = EXCLUDED.review_count,
            updated_at = CURRENT_TIMESTAMP
        RETURNING rank, yesterday_rank;
EOF
    )
    
    if [ "$?" -eq 0 ]; then
        log_success "동기화 성공!"
        log_info "  - 순위: ${rank:-측정중}"
        log_info "  - 어제 순위: ${yesterday_rank:-0}"
        log_info "  - 상품명: ${product_name:0:50}..."
    else
        log_error "동기화 실패"
        log_debug "$INSERT_RESULT"
    fi
fi

# ========================================
# 6. 최종 확인
# ========================================

echo ""
log_info "[6단계] 로컬 DB 저장 결과 확인..."
FINAL_CHECK=$(PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A -F'|' <<EOF 2>/dev/null
    SELECT 
        date,
        keyword,
        rank,
        yesterday_rank,
        product_name,
        rating,
        review_count,
        created_at
    FROM v2_rank_daily
    WHERE date = '$CHECK_DATE'
      AND keyword = '$trim_keyword'
      AND product_id = '$product_id';
EOF
)

if [ -z "$FINAL_CHECK" ]; then
    log_warn "저장된 데이터가 없습니다."
else
    IFS='|' read -r date kw rank y_rank pname rating review created <<< "$FINAL_CHECK"
    log_success "최종 저장 데이터:"
    log_info "  - 날짜: $date"
    log_info "  - 키워드: $kw"
    log_info "  - 순위: ${rank:-측정중}"
    log_info "  - 어제 순위: ${y_rank:-0}"
    log_info "  - 상품명: ${pname:0:50}..."
    log_info "  - 평점/리뷰: $rating / $review"
    log_info "  - 생성 시간: $created"
fi

echo ""
log_info "========================================="
log_info "테스트 완료!"
log_info "========================================="
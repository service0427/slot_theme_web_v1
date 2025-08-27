#!/bin/bash

# ========================================
# v3 동기화 검증 스크립트
# v2_slot_tasks_daily_progress 테이블 기반 검증
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
    echo -e "${CYAN}✅${NC} $1"
}

log_fail() {
    echo -e "${RED}❌${NC} $1"
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

CHECK_DATE="${1:-$(date +%Y-%m-%d)}"
DEBUG_KEYWORD="${2:-}"

echo ""
log_info "========================================="
log_info "v3 동기화 검증 시작"
log_info "대상 날짜: $CHECK_DATE"
if [ ! -z "$DEBUG_KEYWORD" ]; then
    log_info "디버그 키워드: $DEBUG_KEYWORD"
fi
log_info "========================================="
echo ""

# ========================================
# 1. 전체 통계 확인
# ========================================

log_info "[1단계] 전체 통계 확인..."

# 로컬 DB slots 테이블 통계
LOCAL_STATS=$(PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A -F'|' <<EOF 2>/dev/null
    SELECT 
        COUNT(*) as total_slots,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_slots,
        COUNT(DISTINCT keyword) as unique_keywords
    FROM slots
    WHERE keyword IS NOT NULL AND keyword != '';
EOF
)

IFS='|' read -r total_slots active_slots unique_keywords <<< "$LOCAL_STATS"
log_info "로컬 DB (slots):"
log_info "  - 전체 슬롯: ${total_slots}개"
log_info "  - 활성 슬롯: ${active_slots}개"
log_info "  - 고유 키워드: ${unique_keywords}개"

# v2_rank_daily 통계
RANK_STATS=$(PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A -F'|' <<EOF 2>/dev/null
    SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN rank IS NOT NULL THEN 1 END) as with_rank,
        COUNT(CASE WHEN rank = 0 THEN 1 END) as zero_rank,
        COUNT(CASE WHEN rank IS NULL THEN 1 END) as null_rank,
        MIN(rank) as best_rank,
        MAX(rank) as worst_rank
    FROM v2_rank_daily
    WHERE date = '$CHECK_DATE';
EOF
)

IFS='|' read -r total_records with_rank zero_rank null_rank best_rank worst_rank <<< "$RANK_STATS"
log_info "v2_rank_daily ($CHECK_DATE):"
log_info "  - 전체 레코드: ${total_records}개"
log_info "  - 순위 있음: ${with_rank}개"
log_info "  - 순위 없음(0): ${zero_rank}개"
log_info "  - 측정중(NULL): ${null_rank}개"
log_info "  - 최고 순위: ${best_rank:-없음}"
log_info "  - 최저 순위: ${worst_rank:-없음}"

echo ""

# ========================================
# 2. 외부 DB 연결 및 통계 확인
# ========================================

log_info "[2단계] 외부 DB (v2_slot_tasks_daily_progress) 확인..."

EXTERNAL_STATS=$(PGPASSWORD=$EXTERNAL_PASS psql -h $EXTERNAL_HOST -p $EXTERNAL_PORT -U $EXTERNAL_USER -d $EXTERNAL_DB -t -A -F'|' <<EOF 2>/dev/null
    SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN site_code = 'cpck' THEN 1 END) as cpck_count,
        COUNT(CASE WHEN is_rcheck_completed = true THEN 1 END) as completed,
        COUNT(CASE WHEN rcheck_count > 9 THEN 1 END) as valid_rcheck,
        COUNT(CASE WHEN min_rank IS NOT NULL THEN 1 END) as with_min_rank
    FROM v2_slot_tasks_daily_progress
    WHERE progress_date = '$CHECK_DATE';
EOF
)

if [ -z "$EXTERNAL_STATS" ]; then
    log_error "외부 DB 연결 실패 또는 데이터 없음"
else
    IFS='|' read -r total cpck completed valid_rcheck with_min <<< "$EXTERNAL_STATS"
    log_info "외부 DB 통계 ($CHECK_DATE):"
    log_info "  - 전체 레코드: ${total}개"
    log_info "  - site_code='cpck': ${cpck}개"
    log_info "  - is_rcheck_completed=true: ${completed}개"
    log_info "  - rcheck_count>9: ${valid_rcheck}개"
    log_info "  - min_rank 있음: ${with_min}개"
fi

echo ""

# ========================================
# 3. 동기화되지 않은 슬롯 찾기
# ========================================

log_info "[3단계] 동기화 누락 슬롯 확인..."

MISSING_SLOTS=$(PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A -F'|' <<EOF 2>/dev/null
    SELECT 
        s.keyword,
        s.url
    FROM slots s
    WHERE s.status = 'active'
      AND s.keyword IS NOT NULL
      AND s.keyword != ''
      AND NOT EXISTS (
          SELECT 1 
          FROM v2_rank_daily r
          WHERE r.keyword = COALESCE(s.trim_keyword, REPLACE(s.keyword, ' ', ''))
            AND r.date = '$CHECK_DATE'
      )
    LIMIT 10;
EOF
)

if [ -z "$MISSING_SLOTS" ]; then
    log_success "모든 활성 슬롯이 동기화되었습니다!"
else
    log_warn "동기화되지 않은 슬롯 (최대 10개):"
    echo "$MISSING_SLOTS" | while IFS='|' read -r keyword url; do
        log_info "  - ${keyword} (URL: ${url:0:50}...)"
    done
fi

echo ""

# ========================================
# 4. 특정 키워드 상세 디버깅 (옵션)
# ========================================

if [ ! -z "$DEBUG_KEYWORD" ]; then
    log_info "[4단계] 키워드 '$DEBUG_KEYWORD' 상세 분석..."
    
    # 로컬 DB 슬롯 정보
    log_info ""
    log_info "로컬 DB 슬롯 정보:"
    SLOT_DETAIL=$(PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A -F'|' <<EOF 2>/dev/null
        SELECT 
            id,
            keyword,
            COALESCE(trim_keyword, REPLACE(keyword, ' ', '')) as trim_keyword,
            status,
            SUBSTRING(url FROM 'products/([0-9]+)') as product_id
        FROM slots
        WHERE keyword = '$DEBUG_KEYWORD'
           OR trim_keyword = '$DEBUG_KEYWORD'
           OR keyword LIKE '%$DEBUG_KEYWORD%';
EOF
    )
    
    if [ -z "$SLOT_DETAIL" ]; then
        log_warn "  슬롯을 찾을 수 없습니다"
    else
        echo "$SLOT_DETAIL" | while IFS='|' read -r id kw trim status pid; do
            log_info "  - ID: $id"
            log_info "  - 키워드: $kw (trim: $trim)"
            log_info "  - 상태: $status"
            log_info "  - Product ID: $pid"
        done
        
        # Product ID 추출
        product_id=$(echo "$SLOT_DETAIL" | head -1 | cut -d'|' -f5)
        trim_keyword=$(echo "$SLOT_DETAIL" | head -1 | cut -d'|' -f3)
        
        # 외부 DB 데이터 확인
        log_info ""
        log_info "외부 DB v2_slot_tasks_daily_progress 확인:"
        EXTERNAL_DETAIL=$(PGPASSWORD=$EXTERNAL_PASS psql -h $EXTERNAL_HOST -p $EXTERNAL_PORT -U $EXTERNAL_USER -d $EXTERNAL_DB -t -A <<EOF 2>/dev/null
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN site_code = 'cpck' THEN 1 END) as cpck,
                COUNT(CASE WHEN is_rcheck_completed = true THEN 1 END) as completed,
                COUNT(CASE WHEN rcheck_count > 9 THEN 1 END) as valid,
                MAX(rcheck_count) as max_rcheck,
                MIN(min_rank) as best_min_rank
            FROM v2_slot_tasks_daily_progress
            WHERE keyword = '$trim_keyword'
              AND progress_date = '$CHECK_DATE';
EOF
        )
        
        if [ -z "$EXTERNAL_DETAIL" ]; then
            log_warn "  외부 DB에 데이터가 없습니다"
        else
            IFS='|' read -r total cpck completed valid max_rc best_rank <<< "$EXTERNAL_DETAIL"
            log_info "  - 전체 레코드: ${total}개"
            log_info "  - site_code='cpck': ${cpck}개"
            log_info "  - 완료된 체크: ${completed}개"
            log_info "  - 유효한 체크(>9): ${valid}개"
            log_info "  - 최대 rcheck_count: ${max_rc:-0}"
            log_info "  - 최고 min_rank: ${best_rank:-없음}"
            
            if [ "$valid" -eq 0 ]; then
                log_fail "  ⚠️ rcheck_count>9 조건을 만족하는 데이터가 없습니다!"
            fi
            if [ "$cpck" -eq 0 ]; then
                log_fail "  ⚠️ site_code='cpck' 데이터가 없습니다!"
            fi
            if [ "$completed" -eq 0 ]; then
                log_fail "  ⚠️ is_rcheck_completed=true 데이터가 없습니다!"
            fi
        fi
        
        # v2_rank_daily 확인
        log_info ""
        log_info "v2_rank_daily 저장 결과:"
        RANK_DETAIL=$(PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A -F'|' <<EOF 2>/dev/null
            SELECT 
                keyword,
                rank,
                yesterday_rank,
                product_name,
                rating,
                review_count
            FROM v2_rank_daily
            WHERE keyword = '$trim_keyword'
              AND date = '$CHECK_DATE';
EOF
        )
        
        if [ -z "$RANK_DETAIL" ]; then
            log_warn "  v2_rank_daily에 저장된 데이터가 없습니다"
        else
            IFS='|' read -r kw rank y_rank pname rating review <<< "$RANK_DETAIL"
            log_info "  - 키워드: $kw"
            log_info "  - 순위: ${rank:-측정중}"
            log_info "  - 어제 순위: ${y_rank:-0}"
            log_info "  - 상품명: ${pname:0:50}..."
            log_info "  - 평점/리뷰: ${rating:-0} / ${review:-0}"
        fi
    fi
fi

echo ""

# ========================================
# 5. 동기화 품질 검증
# ========================================

log_info "[5단계] 동기화 품질 검증..."

# 동기화율 계산
SYNC_RATE=$(PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A <<EOF 2>/dev/null
    SELECT 
        ROUND(
            (COUNT(DISTINCT r.keyword) * 100.0) / 
            NULLIF(COUNT(DISTINCT s.keyword), 0),
            2
        ) as sync_rate
    FROM slots s
    LEFT JOIN v2_rank_daily r ON 
        r.keyword = COALESCE(s.trim_keyword, REPLACE(s.keyword, ' ', ''))
        AND r.date = '$CHECK_DATE'
    WHERE s.status = 'active'
      AND s.keyword IS NOT NULL
      AND s.keyword != '';
EOF
)

log_info "동기화율: ${SYNC_RATE:-0}%"

# 데이터 품질 지표
QUALITY_CHECK=$(PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A -F'|' <<EOF 2>/dev/null
    SELECT 
        COUNT(CASE WHEN rank > 0 AND rank <= 100 THEN 1 END) as top100,
        COUNT(CASE WHEN rank > 100 AND rank <= 500 THEN 1 END) as top500,
        COUNT(CASE WHEN yesterday_rank > 0 THEN 1 END) as with_yesterday,
        COUNT(CASE WHEN product_name IS NOT NULL AND product_name != '' THEN 1 END) as with_product_name
    FROM v2_rank_daily
    WHERE date = '$CHECK_DATE';
EOF
)

IFS='|' read -r top100 top500 with_yesterday with_product <<< "$QUALITY_CHECK"
log_info "데이터 품질:"
log_info "  - Top 100 내: ${top100}개"
log_info "  - 101-500위: ${top500}개"
log_info "  - 어제 순위 있음: ${with_yesterday}개"
log_info "  - 상품명 있음: ${with_product}개"

echo ""

# ========================================
# 6. 최종 결과
# ========================================

log_info "========================================="
if [ "${SYNC_RATE%.*}" -ge 90 ]; then
    log_success "동기화 상태: 양호 (${SYNC_RATE}%)"
elif [ "${SYNC_RATE%.*}" -ge 70 ]; then
    log_warn "동기화 상태: 주의 필요 (${SYNC_RATE}%)"
else
    log_error "동기화 상태: 문제 있음 (${SYNC_RATE}%)"
fi
log_info "========================================="

# 문제가 있을 경우 추가 진단
if [ "${SYNC_RATE%.*}" -lt 90 ]; then
    echo ""
    log_warn "동기화율이 낮습니다. 다음 사항을 확인하세요:"
    log_info "  1. 외부 DB 연결 상태"
    log_info "  2. v2_slot_tasks_daily_progress 테이블 데이터 유무"
    log_info "  3. site_code='cpck' 조건"
    log_info "  4. is_rcheck_completed=true 조건"
    log_info "  5. rcheck_count > 9 조건"
    echo ""
    log_info "특정 키워드 디버깅: $0 $CHECK_DATE [키워드명]"
fi
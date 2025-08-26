#!/bin/bash

# ========================================
# v2_rank_daily 동기화 검증 스크립트
# 동기화 후 데이터 무결성 및 품질 검증
# ========================================

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

log_success() {
    echo -e "${CYAN}[✓]${NC} $1"
}

log_fail() {
    echo -e "${RED}[✗]${NC} $1"
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

# 설정 파일 로드 (로컬 DB 정보만 필요)
source "$CONFIG_FILE"

log_info "설정 파일 로드 완료: $CONFIG_FILE"

# 검증 날짜 (인자로 받거나 오늘 날짜)
CHECK_DATE=${1:-$(date +%Y-%m-%d)}

# 검증 결과 카운터
PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

# ========================================
# 1. 기본 통계 검증
# ========================================
verify_basic_stats() {
    log_info "===== 기본 통계 검증 시작 ====="
    
    # 전체 레코드 수
    TOTAL_COUNT=$(PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A -c "
        SELECT COUNT(*) FROM v2_rank_daily WHERE date = '$CHECK_DATE';
    ")
    
    if [ "$TOTAL_COUNT" -gt 0 ]; then
        log_success "총 레코드 수: ${TOTAL_COUNT}건"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        log_fail "데이터 없음 - 동기화가 실패했을 수 있습니다"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        return 1
    fi
    
    # 키워드별 통계
    log_info "키워드별 데이터 분포:"
    PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -c "
        SELECT 
            keyword,
            COUNT(*) as product_count,
            COUNT(CASE WHEN rank IS NOT NULL THEN 1 END) as with_rank,
            MIN(rank) as best_rank,
            MAX(rank) as worst_rank
        FROM v2_rank_daily
        WHERE date = '$CHECK_DATE'
        GROUP BY keyword
        ORDER BY product_count DESC
        LIMIT 10;
    "
    
    # 고유 키워드 수
    KEYWORD_COUNT=$(PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A -c "
        SELECT COUNT(DISTINCT keyword) FROM v2_rank_daily WHERE date = '$CHECK_DATE';
    ")
    
    log_info "고유 키워드 수: ${KEYWORD_COUNT}개"
}

# ========================================
# 2. 데이터 품질 검증
# ========================================
verify_data_quality() {
    log_info "===== 데이터 품질 검증 시작 ====="
    
    # NULL 값 체크
    NULL_PRODUCT_NAME=$(PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A -c "
        SELECT COUNT(*) FROM v2_rank_daily 
        WHERE date = '$CHECK_DATE' AND product_name IS NULL;
    ")
    
    if [ "$NULL_PRODUCT_NAME" -eq 0 ]; then
        log_success "모든 레코드에 상품명 있음"
        PASS_COUNT=$((PASS_COUNT + 1))
    elif [ "$NULL_PRODUCT_NAME" -lt 10 ]; then
        log_warn "상품명 없는 레코드: ${NULL_PRODUCT_NAME}건"
        WARN_COUNT=$((WARN_COUNT + 1))
    else
        log_fail "상품명 없는 레코드 과다: ${NULL_PRODUCT_NAME}건"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
    
    # 순위 NULL 체크
    NULL_RANK=$(PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A -c "
        SELECT COUNT(*) FROM v2_rank_daily 
        WHERE date = '$CHECK_DATE' AND rank IS NULL;
    ")
    
    RANK_PERCENTAGE=$((100 - (NULL_RANK * 100 / TOTAL_COUNT)))
    
    if [ "$RANK_PERCENTAGE" -gt 90 ]; then
        log_success "순위 정보 충실도: ${RANK_PERCENTAGE}%"
        PASS_COUNT=$((PASS_COUNT + 1))
    elif [ "$RANK_PERCENTAGE" -gt 70 ]; then
        log_warn "순위 정보 충실도: ${RANK_PERCENTAGE}%"
        WARN_COUNT=$((WARN_COUNT + 1))
    else
        log_fail "순위 정보 부족: ${RANK_PERCENTAGE}%"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
    
    # 중복 체크 (같은 날짜, 키워드, 상품ID 조합)
    DUPLICATE_COUNT=$(PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A -c "
        SELECT COUNT(*) FROM (
            SELECT date, keyword, product_id, item_id, vendor_item_id, COUNT(*) as cnt
            FROM v2_rank_daily
            WHERE date = '$CHECK_DATE'
            GROUP BY date, keyword, product_id, item_id, vendor_item_id
            HAVING COUNT(*) > 1
        ) as duplicates;
    ")
    
    if [ "$DUPLICATE_COUNT" -eq 0 ]; then
        log_success "중복 데이터 없음"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        log_fail "중복 데이터 발견: ${DUPLICATE_COUNT}건"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        
        # 중복 상세 정보
        log_warn "중복 데이터 상세:"
        PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -c "
            SELECT date, keyword, product_id, item_id, vendor_item_id, COUNT(*) as duplicate_count
            FROM v2_rank_daily
            WHERE date = '$CHECK_DATE'
            GROUP BY date, keyword, product_id, item_id, vendor_item_id
            HAVING COUNT(*) > 1
            LIMIT 5;
        "
    fi
}

# ========================================
# 3. 순위 일관성 검증
# ========================================
verify_rank_consistency() {
    log_info "===== 순위 일관성 검증 시작 ====="
    
    # 순위 범위 체크 (1-100 사이여야 함)
    INVALID_RANK=$(PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A -c "
        SELECT COUNT(*) FROM v2_rank_daily 
        WHERE date = '$CHECK_DATE' 
          AND rank IS NOT NULL 
          AND (rank < 1 OR rank > 100);
    ")
    
    if [ "$INVALID_RANK" -eq 0 ]; then
        log_success "모든 순위가 1-100 범위 내"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        log_fail "비정상 순위 발견: ${INVALID_RANK}건"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        
        # 비정상 순위 상세 정보
        echo ""
        log_warn "===== 비정상 순위 상세 정보 ====="
        log_info "rank=0 또는 rank>100인 레코드:"
        PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -c "
            SELECT keyword, product_id, rank, 
                   SUBSTRING(product_name FROM 1 FOR 30) || '...' as product_name
            FROM v2_rank_daily
            WHERE date = '$CHECK_DATE'
              AND rank IS NOT NULL
              AND (rank < 1 OR rank > 100)
            ORDER BY rank, keyword
            LIMIT 15;
        "
        
        # rank=0인 경우 외부 DB 확인
        echo ""
        log_warn "외부 DB에서 rank=0인 샘플 확인:"
        ZERO_SAMPLE=$(PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A -F'|' -c "
            SELECT keyword, product_id, item_id, vendor_item_id
            FROM v2_rank_daily
            WHERE date = '$CHECK_DATE' AND rank = 0
            LIMIT 3;
        ")
        
        if [ ! -z "$ZERO_SAMPLE" ]; then
            echo "$ZERO_SAMPLE" | while IFS='|' read -r kw pid iid vid; do
                log_info "확인: $kw (product_id=$pid)"
                PGPASSWORD=$EXTERNAL_PASS psql -h $EXTERNAL_HOST -p $EXTERNAL_PORT -U $EXTERNAL_USER -d $EXTERNAL_DB -c "
                    SELECT 
                        keyword,
                        check_count,
                        latest_rank,
                        CASE 
                            WHEN rank_data IS NULL THEN 'NULL'
                            WHEN rank_data::text = '[]' THEN '빈 배열'
                            ELSE '데이터 있음'
                        END as rank_data_status,
                        ARRAY(
                            SELECT DISTINCT (elem->>'rank')::integer 
                            FROM jsonb_array_elements(rank_data) elem 
                            WHERE elem->>'rank' IS NOT NULL
                            ORDER BY (elem->>'rank')::integer
                            LIMIT 5
                        )::text as sample_ranks
                    FROM v2_rank_history
                    WHERE keyword = '$kw'
                      AND product_id = '$pid'
                      AND check_date = '$CHECK_DATE'
                    ORDER BY check_count DESC
                    LIMIT 1;
                " 2>/dev/null || echo "  외부 DB 조회 실패: $kw"
                echo ""
            done
        fi
        echo ""
    fi
    
    # 키워드별 순위 중복 체크
    RANK_DUPLICATES=$(PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A -c "
        SELECT COUNT(*) FROM (
            SELECT keyword, rank, COUNT(*) as cnt
            FROM v2_rank_daily
            WHERE date = '$CHECK_DATE' AND rank IS NOT NULL
            GROUP BY keyword, rank
            HAVING COUNT(*) > 1
        ) as rank_dups;
    ")
    
    if [ "$RANK_DUPLICATES" -eq 0 ]; then
        log_success "키워드별 순위 중복 없음"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        log_warn "동일 순위 상품 존재: ${RANK_DUPLICATES}건 (정상일 수 있음)"
        WARN_COUNT=$((WARN_COUNT + 1))
    fi
}

# ========================================
# 4. 시계열 연속성 검증
# ========================================
verify_time_continuity() {
    log_info "===== 시계열 연속성 검증 시작 ====="
    
    # 이전 날짜 데이터와 비교
    YESTERDAY=$(date -v-1d -j -f "%Y-%m-%d" "$CHECK_DATE" +%Y-%m-%d 2>/dev/null || date -d "$CHECK_DATE -1 day" +%Y-%m-%d 2>/dev/null || echo "")
    
    if [ ! -z "$YESTERDAY" ]; then
        YESTERDAY_COUNT=$(PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A -c "
            SELECT COUNT(*) FROM v2_rank_daily WHERE date = '$YESTERDAY';
        ")
        
        if [ "$YESTERDAY_COUNT" -gt 0 ]; then
            # 데이터 변화량 체크
            CHANGE_RATE=$(( (TOTAL_COUNT - YESTERDAY_COUNT) * 100 / YESTERDAY_COUNT ))
            
            if [ "$CHANGE_RATE" -gt -50 ] && [ "$CHANGE_RATE" -lt 200 ]; then
                log_success "일별 데이터 변화량 정상: ${CHANGE_RATE}%"
                PASS_COUNT=$((PASS_COUNT + 1))
            else
                log_warn "급격한 데이터 변화: ${CHANGE_RATE}%"
                WARN_COUNT=$((WARN_COUNT + 1))
            fi
            
            # prev_rank 검증
            PREV_RANK_COUNT=$(PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A -c "
                SELECT COUNT(*) FROM v2_rank_daily 
                WHERE date = '$CHECK_DATE' AND prev_rank IS NOT NULL;
            ")
            
            if [ "$PREV_RANK_COUNT" -gt 0 ]; then
                log_success "이전 순위 정보 있음: ${PREV_RANK_COUNT}건"
                PASS_COUNT=$((PASS_COUNT + 1))
            else
                log_warn "이전 순위 정보 없음"
                WARN_COUNT=$((WARN_COUNT + 1))
            fi
        fi
    fi
}

# ========================================
# 5. 이상 데이터 탐지
# ========================================
detect_anomalies() {
    log_info "===== 이상 데이터 탐지 ====="
    
    # 빈 키워드 체크
    EMPTY_KEYWORD=$(PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A -c "
        SELECT COUNT(*) FROM v2_rank_daily 
        WHERE date = '$CHECK_DATE' 
          AND (keyword IS NULL OR keyword = '');
    ")
    
    if [ "$EMPTY_KEYWORD" -eq 0 ]; then
        log_success "빈 키워드 없음"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        log_fail "빈 키워드 발견: ${EMPTY_KEYWORD}건"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
    
    # 비정상 평점 체크 (0-5 범위)
    INVALID_RATING=$(PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A -c "
        SELECT COUNT(*) FROM v2_rank_daily 
        WHERE date = '$CHECK_DATE' 
          AND rating IS NOT NULL 
          AND (rating < 0 OR rating > 5);
    ")
    
    if [ "$INVALID_RATING" -eq 0 ]; then
        log_success "모든 평점이 정상 범위"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        log_fail "비정상 평점 발견: ${INVALID_RATING}건"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
}

# ========================================
# 6. 최종 보고서
# ========================================
generate_report() {
    echo ""
    log_info "========================================="
    log_info "동기화 검증 완료 - $CHECK_DATE"
    log_info "========================================="
    
    # 점수 계산 (100점 만점)
    TOTAL_CHECKS=$((PASS_COUNT + FAIL_COUNT + WARN_COUNT))
    SCORE=$((PASS_COUNT * 100 / TOTAL_CHECKS))
    
    echo -e "${GREEN}통과: ${PASS_COUNT}건${NC}"
    echo -e "${YELLOW}경고: ${WARN_COUNT}건${NC}"
    echo -e "${RED}실패: ${FAIL_COUNT}건${NC}"
    echo ""
    
    if [ "$SCORE" -ge 90 ]; then
        echo -e "${GREEN}▶ 검증 점수: ${SCORE}/100 - 우수${NC}"
        log_info "동기화 품질이 매우 좋습니다."
    elif [ "$SCORE" -ge 70 ]; then
        echo -e "${YELLOW}▶ 검증 점수: ${SCORE}/100 - 양호${NC}"
        log_warn "일부 개선이 필요할 수 있습니다."
    else
        echo -e "${RED}▶ 검증 점수: ${SCORE}/100 - 주의 필요${NC}"
        log_error "동기화 품질을 확인해주세요."
    fi
    
    echo ""
    log_info "========================================="
    
    # 문제가 있으면 상세 정보 제공
    if [ "$FAIL_COUNT" -gt 0 ] || [ "$WARN_COUNT" -gt 0 ]; then
        echo ""
        log_warn "권장 조치사항:"
        
        if [ "$DUPLICATE_COUNT" -gt 0 ]; then
            echo "  • 중복 데이터 제거: DELETE FROM v2_rank_daily WHERE ... (중복 조건)"
        fi
        
        if [ "$NULL_PRODUCT_NAME" -gt 0 ]; then
            echo "  • 상품명 업데이트: sync_product_info 재실행 검토"
        fi
        
        if [ "$FAIL_COUNT" -gt 3 ]; then
            echo "  • 전체 재동기화 검토: TRUNCATE 후 재실행"
        fi
    fi
    
    # 초기화 옵션 제공
    if [ "$FAIL_COUNT" -gt 0 ]; then
        echo ""
        read -p "데이터를 초기화하고 재동기화하시겠습니까? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_warn "v2_rank_daily 테이블 초기화 중..."
            PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -c "
                DELETE FROM v2_rank_daily WHERE date = '$CHECK_DATE';
            "
            log_info "초기화 완료. sync_v2_rank_daily.sh를 다시 실행하세요."
        fi
    fi
}

# ========================================
# 메인 실행
# ========================================
main() {
    clear
    log_info "v2_rank_daily 동기화 검증 시작"
    log_info "검증 날짜: $CHECK_DATE"
    echo ""
    
    # 각 검증 단계 실행
    verify_basic_stats
    if [ $? -eq 0 ]; then
        verify_data_quality
        verify_rank_consistency
        verify_time_continuity
        detect_anomalies
    fi
    
    # 최종 보고서 생성
    generate_report
}

# 스크립트 실행
main
#!/bin/bash

# ========================================
# v2_rank_daily 테스트 동기화 스크립트
# 대화형 인터페이스와 상세 로그 포함
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

log_debug() {
    echo -e "${BLUE}[DEBUG]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_test() {
    echo -e "${CYAN}[TEST]${NC} $1"
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
CHECK_DATE=${1:-$(date +%Y-%m-%d)}
TEMP_DIR="/tmp/v2_rank_test_$$"
DEBUG=true  # 테스트에서는 항상 디버그 모드

# 임시 디렉토리 생성
mkdir -p $TEMP_DIR

# ========================================
# 1. 연결 테스트
# ========================================
test_connections() {
    log_test "=== DB 연결 테스트 ==="
    
    # 로컬 DB 테스트
    log_info "로컬 DB 연결 테스트 중..."
    PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -c "SELECT version();" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        log_info "✅ 로컬 DB 연결 성공"
    else
        log_error "❌ 로컬 DB 연결 실패"
        exit 1
    fi
    
    # 외부 DB 테스트
    log_info "외부 DB 연결 테스트 중..."
    PGPASSWORD=$EXTERNAL_PASS psql -h $EXTERNAL_HOST -p $EXTERNAL_PORT -U $EXTERNAL_USER -d $EXTERNAL_DB -c "SELECT version();" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        log_info "✅ 외부 DB 연결 성공"
    else
        log_error "❌ 외부 DB 연결 실패"
        exit 1
    fi
    
    echo ""
}

# ========================================
# 2. 테이블 확인
# ========================================
test_tables() {
    log_test "=== 테이블 구조 확인 ==="
    
    # 로컬 테이블 확인
    log_info "로컬 DB 테이블 확인:"
    PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -c "
        SELECT COUNT(*) as slots_count FROM slots;
        SELECT COUNT(*) as v2_rank_daily_count FROM v2_rank_daily WHERE date = '$CHECK_DATE';
    "
    
    # 외부 테이블 확인
    log_info "외부 DB 테이블 확인:"
    PGPASSWORD=$EXTERNAL_PASS psql -h $EXTERNAL_HOST -p $EXTERNAL_PORT -U $EXTERNAL_USER -d $EXTERNAL_DB -c "
        SELECT COUNT(*) as products_count FROM v2_products;
        SELECT COUNT(*) as rank_history_count FROM v2_rank_history WHERE check_date = '$CHECK_DATE';
    "
    
    echo ""
}

# ========================================
# 3. 우리 slots 데이터 분석
# ========================================
analyze_our_slots() {
    log_test "=== 우리 slots 데이터 분석 ==="
    
    # slots 데이터 추출
    PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A -F'|' -c "
        SELECT DISTINCT 
            sfv.value as keyword,
            s.product_id::text,
            s.item_id::text,
            s.vendor_item_id::text
        FROM slots s
        JOIN slot_field_values sfv ON s.id = sfv.slot_id
        JOIN slot_fields sf ON sfv.field_id = sf.id
        WHERE sf.name = 'keyword'
          AND s.product_id IS NOT NULL AND s.product_id != ''
          AND s.item_id IS NOT NULL AND s.item_id != ''
          AND s.vendor_item_id IS NOT NULL AND s.vendor_item_id != ''
          AND sfv.value IS NOT NULL AND sfv.value != '';
    " > $TEMP_DIR/our_slots.txt
    
    local TOTAL_SLOTS=$(wc -l < $TEMP_DIR/our_slots.txt)
    log_info "전체 slots: ${TOTAL_SLOTS}개"
    
    # 키워드별 통계
    log_info "키워드별 통계:"
    PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -c "
        SELECT sfv.value as keyword, COUNT(*) as count
        FROM slots s
        JOIN slot_field_values sfv ON s.id = sfv.slot_id
        JOIN slot_fields sf ON sfv.field_id = sf.id
        WHERE sf.name = 'keyword'
          AND s.product_id IS NOT NULL
        GROUP BY sfv.value
        ORDER BY count DESC
        LIMIT 10;
    "
    
    echo ""
}

# ========================================
# 4. 샘플 테스트 동기화
# ========================================
test_sync_sample() {
    log_test "=== 샘플 데이터 동기화 테스트 ==="
    
    read -p "테스트할 데이터 개수 (기본값 5): " TEST_COUNT
    if [ -z "$TEST_COUNT" ]; then
        TEST_COUNT=5
    fi
    
    # 키워드 선택
    echo ""
    log_info "테스트 방법 선택:"
    echo "  1) 특정 키워드 지정"
    echo "  2) 모든 키워드에서 샘플링"
    read -p "선택 (1 또는 2): " -n 1 -r CHOICE
    echo ""
    
    if [[ "$CHOICE" == "1" ]]; then
        read -p "키워드 입력: " TEST_KEYWORD
        FILTER_CONDITION="AND sfv.value = '$TEST_KEYWORD'"
        log_info "선택된 키워드: $TEST_KEYWORD"
    else
        FILTER_CONDITION=""
        log_info "모든 키워드에서 샘플링"
    fi
    
    # 테스트할 데이터 추출
    PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A -F'|' -c "
        SELECT DISTINCT 
            sfv.value as keyword,
            s.product_id::text,
            s.item_id::text,
            s.vendor_item_id::text
        FROM slots s
        JOIN slot_field_values sfv ON s.id = sfv.slot_id
        JOIN slot_fields sf ON sfv.field_id = sf.id
        WHERE sf.name = 'keyword'
          AND s.product_id IS NOT NULL AND s.product_id != ''
          AND s.item_id IS NOT NULL AND s.item_id != ''
          AND s.vendor_item_id IS NOT NULL AND s.vendor_item_id != ''
          $FILTER_CONDITION
        LIMIT $TEST_COUNT;
    " > $TEMP_DIR/test_slots.txt
    
    local ACTUAL_COUNT=$(wc -l < $TEMP_DIR/test_slots.txt)
    log_info "테스트할 데이터: ${ACTUAL_COUNT}개"
    echo ""
    
    # 각 데이터 처리
    local PROCESSED=0
    local SUCCESS=0
    local FAILED=0
    
    while IFS='|' read -r keyword product_id item_id vendor_item_id; do
        PROCESSED=$((PROCESSED + 1))
        
        log_info "[${PROCESSED}/${ACTUAL_COUNT}] 처리 중:"
        echo "  키워드: $keyword"
        echo "  상품ID: $product_id / $item_id / $vendor_item_id"
        
        # 외부 DB에서 상품 정보 가져오기
        log_debug "상품 정보 조회 중..."
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
            echo "  상품명: ${product_name:0:50}$([ ${#product_name} -gt 50 ] && echo '...')"
            echo "  썸네일: $([ ! -z "$thumbnail" ] && echo '있음' || echo '없음')"
        else
            echo "  ❌ 상품 정보 없음"
        fi
        
        # 외부 DB에서 순위 정보 가져오기 (상세 정보 포함)
        log_debug "순위 정보 조회 중..."
        RANK_DEBUG_INFO=$(PGPASSWORD=$EXTERNAL_PASS psql -h $EXTERNAL_HOST -p $EXTERNAL_PORT -U $EXTERNAL_USER -d $EXTERNAL_DB -t -A -F'|' <<EOF 2>/dev/null
        WITH rank_history AS (
            SELECT 
                *,
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
                ARRAY(
                    SELECT DISTINCT (elem->>'rank')::integer 
                    FROM jsonb_array_elements(rank_data) elem 
                    WHERE elem->>'rank' IS NOT NULL
                    ORDER BY (elem->>'rank')::integer
                ) as ranks_array,
                yesterday_rank,
                latest_rank,
                rating,
                review_count,
                check_count
            FROM rank_history
            WHERE check_date = '$CHECK_DATE'::date
              AND check_count > 9
            ORDER BY check_count DESC
            LIMIT 1
        )
        SELECT 
            -- 디버그 정보
            ARRAY_TO_STRING(ranks_array, ',') as available_ranks,
            COALESCE(yesterday_rank, 0) as yesterday_rank,
            -- 계산된 순위
            COALESCE(
                CASE 
                    WHEN array_length(ranks_array, 1) > 0 THEN
                        CASE
                            WHEN yesterday_rank IS NOT NULL THEN
                                (SELECT MIN(r) FROM unnest(ranks_array) r WHERE r > yesterday_rank)
                            ELSE
                                (SELECT MAX(r) FROM unnest(ranks_array) r)
                        END
                    ELSE latest_rank
                END, 0
            ) as calculated_rank,
            COALESCE(rating, 0) as rating,
            COALESCE(review_count, 0) as review_count,
            CASE 
                WHEN yesterday_rank IS NOT NULL THEN '어제 순위 있음'
                ELSE '어제 순위 없음'
            END as rank_reason
        FROM today_data;
EOF
        )
        
        if [ ! -z "$RANK_DEBUG_INFO" ]; then
            IFS='|' read -r available_ranks yesterday_rank calculated_rank rating review_count rank_reason <<< "$RANK_DEBUG_INFO"
            
            echo ""
            echo -e "  ${YELLOW}📊 순위 계산 과정:${NC}"
            echo "  - rank_data 순위들: [${available_ranks}]"
            echo "  - 어제 순위: ${yesterday_rank}$([ "$yesterday_rank" = "0" ] && echo ' (없음)')"
            echo "  - 선택 이유: ${rank_reason}"
            if [ "$yesterday_rank" != "0" ] && [ "$yesterday_rank" != "" ]; then
                echo "  - 계산 로직: 어제 순위($yesterday_rank)보다 바로 높은 순위 선택"
            else
                echo "  - 계산 로직: 어제 순위 없음 → 최대값(가장 낮은 순위) 선택"
            fi
            echo -e "  ${GREEN}→ 최종 선택된 순위: ${calculated_rank}${NC}"
            echo "  - 평점: $rating, 리뷰: $review_count"
            
            # 실제로 저장 테스트
            if [ "$calculated_rank" != "0" ]; then
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
                
                # 순위 정보 저장
                PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -c "
                    SELECT v2_upsert_rank_info(
                        '$CHECK_DATE'::date,
                        '$keyword',
                        '$product_id',
                        '$item_id',
                        '$vendor_item_id',
                        $calculated_rank,
                        $rating,
                        $review_count
                    );
                " > /dev/null 2>&1
                
                if [ $? -eq 0 ]; then
                    echo -e "  ${GREEN}✅ 저장 성공${NC}"
                    SUCCESS=$((SUCCESS + 1))
                else
                    echo -e "  ${RED}❌ 저장 실패${NC}"
                    FAILED=$((FAILED + 1))
                fi
            else
                echo -e "  ${YELLOW}⚠️ 순위 정보 없음${NC}"
                FAILED=$((FAILED + 1))
            fi
        else
            echo -e "  ${RED}❌ 순위 정보 조회 실패${NC}"
            FAILED=$((FAILED + 1))
        fi
        
        echo ""
    done < $TEMP_DIR/test_slots.txt
    
    # 결과 요약
    log_test "=== 테스트 결과 요약 ==="
    log_info "처리: $PROCESSED개"
    log_info "성공: $SUCCESS개"
    log_info "실패: $FAILED개"
    echo ""
    
    # 저장된 데이터 확인
    if [ "$SUCCESS" -gt 0 ]; then
        log_test "=== 저장된 데이터 확인 ==="
        PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -c "
            SELECT 
                keyword,
                product_id,
                rank,
                product_name,
                rating,
                review_count
            FROM v2_rank_daily
            WHERE date = '$CHECK_DATE'
            ORDER BY created_at DESC
            LIMIT $TEST_COUNT;
        "
    fi
}

# ========================================
# 5. 전체 동기화 옵션
# ========================================
test_full_sync() {
    log_test "=== 전체 동기화 테스트 ==="
    
    log_warn "주의: 이 작업은 모든 slots 데이터를 동기화합니다."
    read -p "계속하시겠습니까? (y/n): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "취소됨"
        return
    fi
    
    # 실제 스크립트 실행
    bash "$SCRIPT_DIR/sync_v2_rank_daily.sh" "$CHECK_DATE"
}

# ========================================
# 6. 데이터 초기화 옵션
# ========================================
reset_data() {
    log_test "=== 데이터 초기화 ==="
    
    log_warn "주의: 이 작업은 $CHECK_DATE 날짜의 v2_rank_daily 데이터를 삭제합니다."
    read -p "정말로 삭제하시겠습니까? (yes 입력): " CONFIRM
    
    if [ "$CONFIRM" != "yes" ]; then
        log_info "취소됨"
        return
    fi
    
    PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -c "
        DELETE FROM v2_rank_daily WHERE date = '$CHECK_DATE';
    "
    
    log_info "삭제 완료"
}

# ========================================
# 메인 메뉴
# ========================================
show_menu() {
    echo ""
    log_test "========================================="
    log_test "v2_rank_daily 테스트 도구"
    log_test "대상 날짜: $CHECK_DATE"
    log_test "========================================="
    echo "1) DB 연결 테스트"
    echo "2) 테이블 구조 확인"
    echo "3) 우리 slots 데이터 분석"
    echo "4) 샘플 데이터 동기화 테스트"
    echo "5) 전체 동기화 실행"
    echo "6) 오늘 날짜 데이터 초기화"
    echo "7) 검증 스크립트 실행"
    echo "0) 종료"
    echo ""
    read -p "선택: " -n 1 -r CHOICE
    echo ""
}

# ========================================
# 메인 실행
# ========================================
main() {
    while true; do
        show_menu
        
        case $CHOICE in
            1) test_connections ;;
            2) test_tables ;;
            3) analyze_our_slots ;;
            4) test_sync_sample ;;
            5) test_full_sync ;;
            6) reset_data ;;
            7) bash "$SCRIPT_DIR/verify_v2_sync.sh" ;;
            0) 
                log_info "종료"
                rm -rf $TEMP_DIR
                exit 0
                ;;
            *) log_error "잘못된 선택" ;;
        esac
    done
}

# 스크립트 실행
main
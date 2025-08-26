#!/bin/bash

# ========================================
# v2_rank_daily 동기화 테스트 스크립트
# 실제 실행 없이 쿼리와 데이터만 확인
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

log_test() {
    echo -e "${BLUE}[TEST]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
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

log_test "설정 파일 로드 완료: $CONFIG_FILE"

# ========================================
# 설정값
# ========================================
CHECK_DATE=$(date +%Y-%m-%d)
TEST_MODE=true
LIMIT_ROWS=5  # 테스트시 가져올 행 수

# ========================================
# 1. DB 연결 테스트
# ========================================
test_connections() {
    log_test "=== DB 연결 테스트 시작 ==="
    
    # 로컬 DB 연결 테스트
    log_test "로컬 DB 연결 테스트..."
    PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -c "SELECT version();" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        log_info "✅ 로컬 DB 연결 성공"
    else
        log_error "❌ 로컬 DB 연결 실패"
        return 1
    fi
    
    # 외부 DB 연결 테스트
    log_test "외부 DB 연결 테스트..."
    PGPASSWORD=$EXTERNAL_PASS psql -h $EXTERNAL_HOST -p $EXTERNAL_PORT -U $EXTERNAL_USER -d $EXTERNAL_DB -c "SELECT version();" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        log_info "✅ 외부 DB 연결 성공"
    else
        log_error "❌ 외부 DB 연결 실패 - 연결 정보를 확인해주세요"
        log_warn "HOST: $EXTERNAL_HOST, PORT: $EXTERNAL_PORT, DB: $EXTERNAL_DB, USER: $EXTERNAL_USER"
        return 1
    fi
    
    log_test "=== DB 연결 테스트 완료 ==="
    echo ""
}

# ========================================
# 2. 테이블 존재 확인
# ========================================
check_tables() {
    log_test "=== 테이블 확인 시작 ==="
    
    # 로컬 테이블 확인
    log_test "로컬 DB 테이블 확인..."
    RESULT=$(PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A -c "
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_name IN ('v2_rank_daily', 'slots', 'users');
    ")
    log_info "로컬 DB 필수 테이블 발견: $RESULT/3"
    
    # 외부 테이블 목록 보기 (실제 테이블명 확인용)
    log_test "외부 DB 테이블 목록 (상위 10개)..."
    PGPASSWORD=$EXTERNAL_PASS psql -h $EXTERNAL_HOST -p $EXTERNAL_PORT -U $EXTERNAL_USER -d $EXTERNAL_DB -c "
        SELECT table_schema, table_name 
        FROM information_schema.tables 
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
        ORDER BY table_name
        LIMIT 10;
    " 2>/dev/null
    
    log_test "=== 테이블 확인 완료 ==="
    echo ""
}

# ========================================
# 3. 함수 존재 확인
# ========================================
check_functions() {
    log_test "=== 함수 확인 시작 ==="
    
    RESULT=$(PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A -c "
        SELECT COUNT(*) FROM information_schema.routines 
        WHERE routine_name IN ('v2_upsert_product_info', 'v2_upsert_rank_info');
    ")
    
    if [ "$RESULT" -eq "2" ]; then
        log_info "✅ 필수 함수 모두 존재"
    else
        log_warn "⚠️ 필수 함수가 없습니다 ($RESULT/2). 마이그레이션 스크립트를 먼저 실행해주세요."
    fi
    
    log_test "=== 함수 확인 완료 ==="
    echo ""
}

# ========================================
# 4. 샘플 데이터 미리보기
# ========================================
preview_data() {
    log_test "=== 샘플 데이터 미리보기 ==="
    
    log_test "외부 DB v2_products 테이블 샘플 (상품 정보):"
    PGPASSWORD=$EXTERNAL_PASS psql -h $EXTERNAL_HOST -p $EXTERNAL_PORT -U $EXTERNAL_USER -d $EXTERNAL_DB -c "
        SELECT 
            product_id,
            item_id,
            vendor_item_id,
            product_data->>'title' as product_name,
            product_data->'thumbnailImages'->0->>'url' as thumbnail
        FROM v2_products
        LIMIT 3;
    " 2>/dev/null
    
    if [ $? -ne 0 ]; then
        log_error "v2_products 테이블 조회 실패"
    fi
    
    echo ""
    
    log_test "외부 DB v2_rank_history 테이블 샘플 (오늘 순위 정보):"
    PGPASSWORD=$EXTERNAL_PASS psql -h $EXTERNAL_HOST -p $EXTERNAL_PORT -U $EXTERNAL_USER -d $EXTERNAL_DB -c "
        SELECT 
            keyword,
            product_id,
            item_id,
            vendor_item_id,
            latest_rank as rank,
            rating,
            review_count,
            check_date,
            check_count
        FROM v2_rank_history
        WHERE check_date = CURRENT_DATE
          AND check_count > 9
        ORDER BY latest_rank ASC NULLS LAST
        LIMIT 5;
    " 2>/dev/null
    
    if [ $? -ne 0 ]; then
        log_error "v2_rank_history 테이블 조회 실패"
    fi
    
    echo ""
    
    log_test "키워드별 데이터 건수 확인:"
    PGPASSWORD=$EXTERNAL_PASS psql -h $EXTERNAL_HOST -p $EXTERNAL_PORT -U $EXTERNAL_USER -d $EXTERNAL_DB -c "
        SELECT 
            keyword,
            COUNT(*) as product_count
        FROM v2_rank_history
        WHERE check_date = CURRENT_DATE
        GROUP BY keyword
        ORDER BY product_count DESC
        LIMIT 5;
    " 2>/dev/null
    
    log_test "=== 샘플 데이터 미리보기 완료 ==="
    echo ""
}

# ========================================
# 5. 드라이런 (실제 실행하지 않고 쿼리만 생성)
# ========================================
dry_run() {
    log_test "=== 드라이런 모드 시작 (실제 실행하지 않음) ==="
    
    log_test "외부 DB에서 실제 데이터 1건씩 가져와서 쿼리 예시 생성..."
    
    # 상품 정보 1건 가져오기
    PRODUCT_SAMPLE=$(PGPASSWORD=$EXTERNAL_PASS psql -h $EXTERNAL_HOST -p $EXTERNAL_PORT -U $EXTERNAL_USER -d $EXTERNAL_DB -t -A -F'|' <<EOF 2>/dev/null
        SELECT 
            r.keyword,
            p.product_id,
            p.item_id,
            p.vendor_item_id,
            REPLACE(COALESCE(p.product_data->>'title', 'Unknown Product'), '|', ' ') as product_name,
            COALESCE(p.product_data->'thumbnailImages'->0->>'url', '') as thumbnail
        FROM v2_products p
        JOIN v2_rank_history r ON 
            p.product_id = r.product_id AND
            p.item_id = r.item_id AND
            p.vendor_item_id = r.vendor_item_id
        WHERE r.check_date = CURRENT_DATE
          AND r.check_count > 9
        LIMIT 1;
EOF
    )
    
    if [ ! -z "$PRODUCT_SAMPLE" ]; then
        IFS='|' read -r keyword product_id item_id vendor_item_id product_name thumbnail <<< "$PRODUCT_SAMPLE"
        
        echo -e "${YELLOW}-- 실제 데이터 기반 상품정보 UPSERT 쿼리 예시${NC}"
        cat << EOF
    SELECT v2_upsert_product_info(
        '${CHECK_DATE}'::date,
        '${keyword}',
        '${product_id}',
        '${item_id}',
        '${vendor_item_id}',
        '${product_name}',
        '${thumbnail}'
    );
EOF
    else
        log_warn "외부 DB에서 상품 샘플 데이터를 가져올 수 없음"
    fi
    
    echo ""
    
    # 순위 정보 1건 가져오기
    RANK_SAMPLE=$(PGPASSWORD=$EXTERNAL_PASS psql -h $EXTERNAL_HOST -p $EXTERNAL_PORT -U $EXTERNAL_USER -d $EXTERNAL_DB -t -A -F'|' <<EOF 2>/dev/null
        SELECT 
            keyword,
            product_id,
            item_id,
            vendor_item_id,
            COALESCE(latest_rank, 0) as rank,
            COALESCE(rating, 0) as rating,
            COALESCE(review_count, 0) as review_count
        FROM v2_rank_history
        WHERE check_date = CURRENT_DATE
          AND keyword IS NOT NULL
          AND check_count > 9
          AND latest_rank IS NOT NULL
        LIMIT 1;
EOF
    )
    
    if [ ! -z "$RANK_SAMPLE" ]; then
        IFS='|' read -r keyword product_id item_id vendor_item_id rank rating review_count <<< "$RANK_SAMPLE"
        
        echo -e "${YELLOW}-- 실제 데이터 기반 순위정보 UPSERT 쿼리 예시${NC}"
        cat << EOF
    SELECT v2_upsert_rank_info(
        '${CHECK_DATE}'::date,
        '${keyword}',
        '${product_id}',
        '${item_id}',
        '${vendor_item_id}',
        ${rank},
        ${rating},
        ${review_count}
    );
EOF
    else
        log_warn "외부 DB에서 순위 샘플 데이터를 가져올 수 없음"
    fi
    
    echo ""
    log_test "위 쿼리들이 실제로 실행될 예정 (테스트 모드에서는 실행하지 않음)"
    log_test "=== 드라이런 완료 ==="
    echo ""
}

# ========================================
# 6. 현재 v2_rank_daily 상태 확인
# ========================================
check_current_status() {
    log_test "=== 현재 v2_rank_daily 테이블 상태 ==="
    
    PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -c "
        SELECT 
            COUNT(*) as total_records,
            COUNT(DISTINCT date) as unique_dates,
            COUNT(DISTINCT keyword) as unique_keywords,
            MIN(date) as earliest_date,
            MAX(date) as latest_date
        FROM v2_rank_daily;
    "
    
    log_test "최근 5개 레코드:"
    PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -c "
        SELECT 
            date,
            keyword,
            product_id,
            rank,
            product_name
        FROM v2_rank_daily
        ORDER BY created_at DESC
        LIMIT 5;
    "
    
    log_test "=== 상태 확인 완료 ==="
    echo ""
}

# ========================================
# 7. 작은 배치로 테스트 실행
# ========================================
test_small_batch() {
    log_test "=== 작은 배치 테스트 ==="
    
    read -p "테스트 데이터 동기화를 진행하시겠습니까? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warn "테스트 건너뜀"
        return
    fi
    
    # 키워드 선택
    echo ""
    log_info "테스트 방법을 선택하세요:"
    echo "  1) 특정 키워드 입력"
    echo "  2) 랜덤 키워드 선택"
    read -p "선택 (1 또는 2): " -n 1 -r KEYWORD_CHOICE
    echo
    
    KEYWORD_FILTER=""
    if [[ "$KEYWORD_CHOICE" == "1" ]]; then
        read -p "키워드 입력: " KEYWORD_INPUT
        KEYWORD_FILTER="AND r.keyword = '$KEYWORD_INPUT'"
        log_info "선택한 키워드: $KEYWORD_INPUT"
    else
        log_info "랜덤 키워드로 진행합니다."
    fi
    
    # 가져올 건수 선택
    read -p "가져올 데이터 건수 (기본값 1): " DATA_COUNT
    if [ -z "$DATA_COUNT" ]; then
        DATA_COUNT=1
    fi
    
    log_test "${DATA_COUNT}건 테스트 동기화 시작..."
    
    # 이미 가져온 데이터 확인
    log_info "오늘 이미 동기화된 데이터 확인 중..."
    EXISTING_COUNT=$(PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A -c "
        SELECT COUNT(*) FROM v2_rank_daily WHERE date = '$CHECK_DATE';
    ")
    log_info "기존 데이터: ${EXISTING_COUNT}건"
    
    # 이미 가져온 데이터의 고유 키 조합 만들기
    log_info "이미 동기화된 데이터 키 목록 생성 중..."
    
    # 먼저 얼마나 있는지 확인
    log_test "로컬 DB에서 기존 키 확인:"
    PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -c "
        SELECT keyword, product_id, item_id, vendor_item_id 
        FROM v2_rank_daily 
        WHERE date = '$CHECK_DATE' 
        LIMIT 5;
    " 2>&1
    
    # 외부 DB에서 전체 데이터 수 확인
    TOTAL_EXTERNAL=$(PGPASSWORD=$EXTERNAL_PASS psql -h $EXTERNAL_HOST -p $EXTERNAL_PORT -U $EXTERNAL_USER -d $EXTERNAL_DB -t -A -c "
        SELECT COUNT(*) 
        FROM v2_products p
        JOIN v2_rank_history r ON 
            p.product_id = r.product_id AND
            p.item_id = r.item_id AND
            p.vendor_item_id = r.vendor_item_id
        WHERE r.check_date = CURRENT_DATE
          AND r.check_count > 9
          AND r.latest_rank IS NOT NULL
          $KEYWORD_FILTER;
    " 2>/dev/null)
    
    log_info "외부 DB 전체 데이터: ${TOTAL_EXTERNAL}건"
    
    # NOT IN 대신 LEFT JOIN 방식으로 변경
    NOT_IN_CONDITION=""
    log_info "중복 제외 조건 준비 (기존 ${EXISTING_COUNT}건 제외 예정)"
    
    # 외부 DB에서 새로운 데이터만 가져오기
    log_info "외부 DB에서 새로운 데이터 ${DATA_COUNT}건 가져오기..."
    
    SUCCESS_COUNT=0
    
    # 먼저 로컬에 있는 키를 임시 파일에 저장
    PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A -c "
        SELECT keyword || '|' || product_id || '|' || item_id || '|' || vendor_item_id
        FROM v2_rank_daily 
        WHERE date = '$CHECK_DATE';
    " > /tmp/existing_v2_keys.txt 2>/dev/null
    
    # 모든 외부 데이터를 가져와서 필터링
    ALL_EXTERNAL_DATA=$(PGPASSWORD=$EXTERNAL_PASS psql -h $EXTERNAL_HOST -p $EXTERNAL_PORT -U $EXTERNAL_USER -d $EXTERNAL_DB -t -A -F'|' <<EOF 2>/dev/null
        SELECT 
            r.keyword,
            p.product_id,
            p.item_id,
            p.vendor_item_id,
            REPLACE(COALESCE(p.product_data->>'title', 'Unknown Product'), '|', ' ') as product_name,
            COALESCE(p.product_data->'thumbnailImages'->0->>'url', '') as thumbnail,
            COALESCE(r.latest_rank, 0) as rank,
            COALESCE(r.rating, 0) as rating,
            COALESCE(r.review_count, 0) as review_count
        FROM v2_products p
        JOIN v2_rank_history r ON 
            p.product_id = r.product_id AND
            p.item_id = r.item_id AND
            p.vendor_item_id = r.vendor_item_id
        WHERE r.check_date = CURRENT_DATE
          AND r.check_count > 9
          AND r.latest_rank IS NOT NULL
          $KEYWORD_FILTER
        ORDER BY r.keyword, r.latest_rank;
EOF
    )
    
    # Shell에서 필터링
    NEW_DATA=""
    COUNT=0
    while IFS='|' read -r keyword product_id item_id vendor_item_id product_name thumbnail rank rating review_count; do
        CHECK_KEY="${keyword}|${product_id}|${item_id}|${vendor_item_id}"
        
        # 이미 있는지 체크
        if ! grep -q "^${CHECK_KEY}$" /tmp/existing_v2_keys.txt 2>/dev/null; then
            if [ $COUNT -lt $DATA_COUNT ]; then
                if [ -z "$NEW_DATA" ]; then
                    NEW_DATA="${keyword}|${product_id}|${item_id}|${vendor_item_id}|${product_name}|${thumbnail}|${rank}|${rating}|${review_count}"
                else
                    NEW_DATA="${NEW_DATA}\n${keyword}|${product_id}|${item_id}|${vendor_item_id}|${product_name}|${thumbnail}|${rank}|${rating}|${review_count}"
                fi
                COUNT=$((COUNT + 1))
            fi
        fi
    done <<< "$ALL_EXTERNAL_DATA"
    
    # echo -e를 사용해서 개행 처리
    if [ ! -z "$NEW_DATA" ]; then
        NEW_DATA=$(echo -e "$NEW_DATA")
    fi
    
    log_info "외부 전체 데이터 중 새로운 데이터 ${COUNT}건 발견"
    
    if [ -z "$NEW_DATA" ]; then
        log_error "새로운 데이터가 없습니다"
        if [ ! -z "$KEYWORD_INPUT" ]; then
            log_warn "키워드 '$KEYWORD_INPUT'에 해당하는 새 데이터가 없을 수 있습니다"
        else
            log_warn "모든 데이터가 이미 동기화되었거나 조건에 맞는 데이터가 없습니다"
        fi
        return
    fi
    
    # 가져온 데이터 건수 확인
    ACTUAL_COUNT=$COUNT
    log_info "실제 가져온 새 데이터: ${ACTUAL_COUNT}건"
    
    # 각 데이터 처리 (이미 Shell에서 필터링했으므로 중복 체크 불필요)
    PROCESSED_COUNT=0
    SUCCESS_COUNT=0
    echo "$NEW_DATA" | while IFS='|' read -r keyword product_id item_id vendor_item_id product_name thumbnail rank rating review_count; do
        PROCESSED_COUNT=$((PROCESSED_COUNT + 1))
        
        log_info "[${PROCESSED_COUNT}/${ACTUAL_COUNT}] 처리 중:"
        echo "  키워드: $keyword"
        echo "  상품ID: $product_id / $item_id / $vendor_item_id"
        echo "  상품명: ${product_name:0:50}$([ ${#product_name} -gt 50 ] && echo '...')"
        echo "  순위: $rank (평점: $rating, 리뷰: $review_count)"
        
        # 1. 상품정보 INSERT
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
            echo "  ✅ 상품정보 저장"
        else
            echo "  ❌ 상품정보 실패"
            continue
        fi
        
        # 2. 순위정보 INSERT
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
            echo "  ✅ 순위정보 저장"
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        else
            echo "  ❌ 순위정보 실패"
        fi
        echo ""
    done
    
    # 전체 결과 요약
    log_info "===== 테스트 동기화 결과 ====="
    log_info "요청 건수: $DATA_COUNT"
    log_info "가져온 건수: $ACTUAL_COUNT"
    log_info "성공 건수: $SUCCESS_COUNT"
    
    # 최종 확인
    NEW_COUNT=$(PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A -c "
        SELECT COUNT(*) FROM v2_rank_daily WHERE date = '$CHECK_DATE';
    ")
    log_info "전체 데이터: ${EXISTING_COUNT}건 → ${NEW_COUNT}건 (추가: $((NEW_COUNT - EXISTING_COUNT))건)"
    
    # 임시 파일 정리
    rm -f /tmp/existing_v2_keys.txt
    
    log_info "테스트 동기화 완료"
    echo ""
}

# ========================================
# 8. 테스트 데이터 확인 및 초기화
# ========================================
check_and_cleanup() {
    log_test "=== 테스트 데이터 확인 및 정리 ==="
    
    # 현재 v2_rank_daily에 있는 모든 데이터 확인
    log_info "현재 v2_rank_daily 테이블의 모든 데이터:"
    PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -c "
        SELECT 
            id,
            date,
            keyword,
            product_id,
            SUBSTRING(product_name, 1, 30) || CASE WHEN LENGTH(product_name) > 30 THEN '...' ELSE '' END as product_name,
            rank,
            rating,
            review_count,
            created_at
        FROM v2_rank_daily
        ORDER BY created_at DESC;
    "
    
    # 데이터 건수 확인
    COUNT=$(PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A -c "
        SELECT COUNT(*) FROM v2_rank_daily;
    ")
    
    log_info "총 ${COUNT}건의 테스트 데이터가 있습니다."
    
    if [ "$COUNT" -gt 0 ]; then
        echo ""
        read -p "테스트 데이터를 모두 삭제하시겠습니까? (다음 테스트를 위해) (y/n): " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_warn "v2_rank_daily 테이블 초기화 중..."
            
            PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -c "
                TRUNCATE TABLE v2_rank_daily RESTART IDENTITY;
            " 2>&1
            
            if [ $? -eq 0 ]; then
                log_info "✅ 테이블 초기화 완료 (ID 시퀀스도 리셋됨)"
            else
                log_error "❌ 테이블 초기화 실패"
            fi
            
            # 초기화 후 확인
            COUNT_AFTER=$(PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -A -c "
                SELECT COUNT(*) FROM v2_rank_daily;
            ")
            log_info "초기화 후 데이터 건수: ${COUNT_AFTER}건"
        else
            log_info "데이터를 유지합니다."
        fi
    else
        log_info "삭제할 데이터가 없습니다."
    fi
    
    echo ""
}

# ========================================
# 메인 실행
# ========================================
main() {
    clear
    log_info "===== v2_rank_daily 동기화 테스트 시작 ====="
    log_info "대상 날짜: $CHECK_DATE"
    log_warn "이것은 테스트 모드입니다. 실제 대량 동기화는 실행하지 않습니다."
    echo ""
    
    # 1. DB 연결 테스트
    test_connections
    if [ $? -ne 0 ]; then
        log_error "DB 연결 실패. 종료합니다."
        exit 1
    fi
    
    # 2. 테이블 확인
    check_tables
    
    # 3. 함수 확인
    check_functions
    
    # 4. 현재 상태 확인
    check_current_status
    
    # 5. 샘플 데이터 미리보기
    preview_data
    
    # 6. 드라이런
    dry_run
    
    # 7. 작은 배치 테스트 (선택적)
    test_small_batch
    
    # 8. 테스트 데이터 확인 및 초기화 (선택적)
    check_and_cleanup
    
    log_info "===== 테스트 완료 ====="
    echo ""
    log_warn "실제 동기화를 실행하려면 sync_v2_rank_daily.sh를 사용하세요."
}

# 스크립트 실행
main
#!/bin/bash

echo "=== Cloudflare 속도 테스트 ==="
echo ""

# 1. Cloudflare 경유 테스트
echo "1. Cloudflare 경유 (https://www.cpc-korea.com)"
echo "----------------------------------------"
for i in {1..5}; do
  echo -n "시도 $i: "
  curl -w "DNS: %{time_namelookup}s, Connect: %{time_connect}s, SSL: %{time_appconnect}s, Total: %{time_total}s\n" \
       -o /dev/null -s \
       -X POST https://www.cpc-korea.com/api/auth/login \
       -H "Content-Type: application/json" \
       -d '{"email":"test@test.com","password":"test"}'
done

echo ""
echo "2. 직접 연결 (http://211.37.173.150:8001)"
echo "----------------------------------------"
for i in {1..5}; do
  echo -n "시도 $i: "
  curl -w "DNS: %{time_namelookup}s, Connect: %{time_connect}s, Total: %{time_total}s\n" \
       -o /dev/null -s \
       -X POST http://211.37.173.150:8001/api/auth/login \
       -H "Content-Type: application/json" \
       -d '{"email":"test@test.com","password":"test"}'
done

echo ""
echo "3. Cloudflare 엣지 서버 위치 확인"
echo "----------------------------------------"
curl -I https://www.cpc-korea.com 2>/dev/null | grep -E "cf-ray|cf-cache-status|server"

echo ""
echo "4. 추가 헤더 정보"
echo "----------------------------------------"
curl -I -X POST https://www.cpc-korea.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test","password":"test"}' 2>/dev/null | grep -E "cf-|x-|cache"
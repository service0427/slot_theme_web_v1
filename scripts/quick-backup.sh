#!/bin/bash

# 빠른 백업 스크립트 - 매개변수 없이 간단하게 백업
# 사용법: ./scripts/quick-backup.sh

cd "$(dirname "$0")/.."

# 기본 백업 실행
./scripts/backup.sh \
    "빠른 백업 (작업 전 안전 백업)" \
    "간단한 작업 전 예방 백업" \
    "소규모 수정 또는 실험적 변경"
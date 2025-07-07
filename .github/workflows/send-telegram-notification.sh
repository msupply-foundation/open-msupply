#!/bin/bash
set -e

ARM64_FILENAME=$(ls ./client/packages/android/app/build/outputs/apk/arm64/release/*.apk);
UNIVERSAL_FILENAME=$(ls ./client/packages/android/app/build/outputs/apk/arm64/release/*.apk);
python3 .github/workflows/telegram-notification.py

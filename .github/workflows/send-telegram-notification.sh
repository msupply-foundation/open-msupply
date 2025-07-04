#!/bin/bash
set -e

ARM64_FILENAME=$(ls ./client/packages/android/app/build/outputs/apk/arm64/release/);
UNIVERSAL_FILENAME=$(ls ./client/packages/android/app/build/outputs/apk/arm64/release/);
python3 ./send-telegram-notification.py

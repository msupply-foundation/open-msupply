#!/bin/bash
# DEPENDANDCIES
# curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
# python3 get-pip.py
# python3 -m pip install requests
# python3 -m pip install b2
#
# TODO fix path for b2 cli? Make it a nicer path?
B2_PATH=/Users/tmfmacmini/Library/Python/3.9/bin/b2
B2_BUCKET_NAME=msupply-releases

GITHUB_REF_NAME=$(echo "${GITHUB_REF}" | sed -e 's,.*/,,')
echo "GITHUB_REF = ${GITHUB_REF_NAME}"

# Get the full path and extract just the filename
ARM64_FILE_PATH=$(ls ./client/packages/android/app/build/outputs/apk/arm64/release/*.apk)
ARM64_FILENAME=$(basename "$ARM64_FILE_PATH")
echo "Found file $ARM64_FILENAME to upload"
$B2_PATH file upload --no-progress $B2_BUCKET_NAME "$ARM64_FILE_PATH" "${GITHUB_REF_NAME}/${ARM64_FILENAME}"

UNIVERSAL_FILE_PATH=$(ls ./client/packages/android/app/build/outputs/apk/universal/release/*.apk)
UNIVERSAL_FILENAME=$(basename "$UNIVERSAL_FILE_PATH")
echo "Found file $UNIVERSAL_FILENAME to upload"
$B2_PATH file upload --no-progress $B2_BUCKET_NAME "$UNIVERSAL_FILE_PATH" "${GITHUB_REF_NAME}/${UNIVERSAL_FILENAME}"

python3 .github/workflows/send-telegram-notification.py $ARM64_FILENAME $UNIVERSAL_FILENAME

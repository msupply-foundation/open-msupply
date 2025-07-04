#!/bin/bash
# DEPENDANDCIES
# curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
# python3 get-pip.py
# python3 -m pip install requests
# python3 -m pip install b2
#
# TODO fix path for b2 cli? Make it a nicer path?

echo "GITHUB_REF = ${GITHUB_REF}"

ARM64_FILENAME=$(ls ./client/packages/android/app/build/outputs/apk/arm64/release/);
echo "Found file $ARM64_FILENAME to upload"
/Users/tmfmacmini/Library/Python/3.9/bin/b2 file upload msupply-releases ./client/packages/android/app/build/outputs/apk/arm64/release/${ARM64_FILENAME} ${GITHUB_REF}/${ARM64_FILENAME};

UNIVERSAL_FILENAME=$(ls ./client/packages/android/app/build/outputs/apk/universal/release/);
echo "Found file $UNIVERSAL_FILENAME to upload"
/Users/tmfmacmini/Library/Python/3.9/bin/b2 file upload msupply-releases ./client/packages/android/app/build/outputs/apk/universal/release/${UNIVERSAL_FILENAME} ${GITHUB_REF}/${UNIVERSAL_FILENAME};

python3 ./send-telegram-notification.py $ARM64_FILENAME $UNIVERSAL_FILENAME

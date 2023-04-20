#!/bin/bash

# intel or arm
ARCHITECHTURE=$1
# Get version from package.json, get line with version on it, then remove everything but version
# and replace . with _
VERSION=$(cat package.json | grep 'version":' | sed 's/[^0-9.]//g' | sed 's/[.]/_/g')
# Commit {DAY}{MONTH}_{HOUR}{SECOND}
HASH=$(git log -1 --format=%cd --date=format:%d%m_%H%M)
echo "omSupply_mac_${ARCHITECHTURE}_v${VERSION}_${HASH}"


#!/bin/sh
# Script to sort specific JSON files

TRANSLATION_FILES=($(find ./client/packages/common/src/intl/locales/* -type f \( -name "*.json"  \)))

for FILE in "${TRANSLATION_FILES[@]}"; do
  if [ -f "$FILE" ]; then
    cat "$FILE" | jq --sort-keys >> output.tmp && mv output.tmp "$FILE"
    echo "Sorted $FILE"
    git add "$FILE"
  fi
done

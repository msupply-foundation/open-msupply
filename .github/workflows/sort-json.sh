
for FILE in `find . -type f -name "*.json" | grep locales`; do
  echo "Sorting translations in $FILE"

  cat "$FILE" | jq --sort-keys >> output.tmp && mv output.tmp "$FILE"
  git add $FILE
done

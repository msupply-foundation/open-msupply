# yarn add -W sort-json
for FILE in `git diff --relative --name-only | grep "locales.*json"`; do
  echo "Sorting translations in $FILE"

  # npx --yes sort-json $FILE $FILE --ignore-case
  cat "$FILE" | jq --sort-keys >> output.tmp && mv output.tmp "$FILE"
  yarn prettier --write $FILE
  git add $FILE

#   yarn "Object.keys(o).sort().reduce((r, k) => (r[k] = o[k], r), {})" $FILE > .husky/tmp.json

#   diff=$(comm -3 $FILE .husky/tmp.json)

#   if [ "${diff}" != "" ]; then
#     cat .husky/tmp.json > $FILE
#     git add $FILE
#   fi
#   rm .husky/tmp.json
done
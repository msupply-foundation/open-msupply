#!/bin/bash
# Submit a PR from an approved plan file.
# Usage: submit.sh <plan-file> [extra args passed to `gh pr create`...]
# Plan file format: line 1 is "# <PR title>", line 2 is blank, rest is PR body.

set -euo pipefail

plan_file="$1"
shift

title=$(head -n 1 "$plan_file" | sed 's/^# //')
tail -n +3 "$plan_file" | gh pr create --title "$title" --body-file - "$@"

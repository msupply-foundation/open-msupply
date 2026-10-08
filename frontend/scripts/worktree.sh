#!/usr/bin/env bash
# Multi-worktree dev helper (see CLAUDE.md "multi-worktree dev flow").
#
# Spin up / tear down parallel git worktrees under .worktrees/, each with its
# own node_modules and its own dev-server port, so several Claude Code sessions
# and their live previews can run side by side. The main checkout keeps :3005;
# each worktree gets the next free port from :3006 up. All previews share the
# one backend the dev server proxies to (GRAPHQL_PROXY_TARGET, default :8000).
#
# Usage:
#   pnpm worktree add <name> [port] [base-branch]   # create + install
#   pnpm worktree remove <name> [--force]           # delete a worktree
#   pnpm worktree list                              # show worktrees + ports
#
# Flags:
#   add     --no-install   skip `pnpm install` (e.g. re-adding an existing branch)
#   remove  --force        drop uncommitted changes AND force-delete the branch
#
# Notes:
#   * <name> is used verbatim as the branch name. If the branch already exists
#     it is checked out into the worktree; otherwise it is created from <base>
#     (default: main).
#   * remove deletes the worktree dir and, by default, the branch too (safe
#     delete — refuses if unmerged; use --force to override).
set -euo pipefail

# Anchor everything to the MAIN checkout, even when run from inside a worktree.
git_common=$(git rev-parse --git-common-dir)
case "$git_common" in /*) ;; *) git_common="$PWD/$git_common" ;; esac
MAIN_ROOT=$(cd "$(dirname "$git_common")" && pwd)
WORKTREES_DIR="$MAIN_ROOT/.worktrees"
PORTS_FILE="$WORKTREES_DIR/.ports"
FIRST_PORT=3006

die() { echo "worktree: $*" >&2; exit 1; }

port_of()  { [ -f "$PORTS_FILE" ] && sed -n "s/^$1=//p" "$PORTS_FILE" | head -1; }
del_port() {
  [ -f "$PORTS_FILE" ] || return 0
  grep -v "^$1=" "$PORTS_FILE" > "$PORTS_FILE.tmp" 2>/dev/null || : > "$PORTS_FILE.tmp"
  mv "$PORTS_FILE.tmp" "$PORTS_FILE"
}
set_port() { del_port "$1"; printf '%s=%s\n' "$1" "$2" >> "$PORTS_FILE"; }

port_taken() {
  grep -q "=$1$" "$PORTS_FILE" 2>/dev/null && return 0
  lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1 && return 0
  return 1
}
free_port() {
  local p=$FIRST_PORT
  while port_taken "$p"; do p=$((p + 1)); done
  echo "$p"
}

cmd_add() {
  local no_install=0 args=()
  for a in "$@"; do
    case "$a" in
      --no-install) no_install=1 ;;
      -*) die "unknown flag for add: $a" ;;
      *) args+=("$a") ;;
    esac
  done
  local name="${args[0]:-}" port="${args[1]:-}" base="${args[2]:-main}"
  [ -n "$name" ] || die "usage: pnpm worktree add <name> [port] [base-branch]"

  local path="$WORKTREES_DIR/$name"
  [ -e "$path" ] && die "worktree already exists: $path"
  mkdir -p "$WORKTREES_DIR"

  [ -n "$port" ] || port=$(free_port)
  port_taken "$port" && die "port $port is already in use — pick another"

  if git -C "$MAIN_ROOT" show-ref --verify --quiet "refs/heads/$name"; then
    echo "→ branch '$name' exists; checking it out into $path"
    git -C "$MAIN_ROOT" worktree add "$path" "$name"
  else
    echo "→ creating branch '$name' from '$base' at $path"
    git -C "$MAIN_ROOT" worktree add "$path" -b "$name" "$base"
  fi

  set_port "$name" "$port"

  if [ "$no_install" -eq 0 ]; then
    echo "→ pnpm install (in $path)"
    (cd "$path" && pnpm install)
  else
    echo "→ skipping install (--no-install); run 'pnpm install' before dev"
  fi

  cat <<EOF

✓ Worktree '$name' ready on port $port.

  Next:
    code $path
  then in that window's terminal:
    DEV_SERVER_PORT=$port pnpm dev      # preview → http://localhost:$port
    claude                              # session scoped to this worktree

  Remove later with:  pnpm worktree remove $name
EOF
}

cmd_remove() {
  local force=0 name=""
  for a in "$@"; do
    case "$a" in
      --force|-f) force=1 ;;
      -*) die "unknown flag for remove: $a" ;;
      *) name="$a" ;;
    esac
  done
  [ -n "$name" ] || die "usage: pnpm worktree remove <name> [--force]"

  local path="$WORKTREES_DIR/$name"
  [ -e "$path" ] || die "no such worktree: $path"

  if [ "$force" -eq 1 ]; then
    git -C "$MAIN_ROOT" worktree remove --force "$path"
  else
    git -C "$MAIN_ROOT" worktree remove "$path"
  fi
  del_port "$name"
  echo "→ removed worktree $path"

  if git -C "$MAIN_ROOT" show-ref --verify --quiet "refs/heads/$name"; then
    if [ "$force" -eq 1 ]; then
      git -C "$MAIN_ROOT" branch -D "$name"
      echo "→ force-deleted branch '$name'"
    elif git -C "$MAIN_ROOT" branch -d "$name" 2>/dev/null; then
      echo "→ deleted branch '$name'"
    else
      echo "→ kept branch '$name' (unmerged; 'git branch -D $name' to force)"
    fi
  fi
}

cmd_list() {
  git -C "$MAIN_ROOT" worktree list
  if [ -f "$PORTS_FILE" ] && [ -s "$PORTS_FILE" ]; then
    echo
    echo "Assigned dev ports (.worktrees/.ports):"
    sed 's/^/  /; s/=/  →  :/' "$PORTS_FILE"
  fi
}

case "${1:-}" in
  add)    shift; cmd_add "$@" ;;
  remove|rm) shift; cmd_remove "$@" ;;
  list|ls) shift; cmd_list "$@" ;;
  ""|-h|--help)
    awk 'NR==1{next} /^#/{sub(/^# ?/,""); print; next} {exit}' "$0"
    ;;
  *) die "unknown command '$1' (try: add | remove | list)" ;;
esac

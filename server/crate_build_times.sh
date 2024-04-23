#!/bin/zsh

# Disable SCCACHE if being used
export SCCACHE_RECACHE=1;

if [ -z "$(git status --untracked-files=no --porcelain)" ]; then 
  # Build time for server change
  export TIME="%E"
  export TIMEFMT="%E"
  echo "// BUILD TEST PLEASE REMOVE" >> server/src/lib.rs
  echo -n "Server,"
  time cargo build -q

  echo "// BUILD TEST PLEASE REMOVE" >> util/src/lib.rs
  echo -n "Util,"
  time cargo build -q

  echo "// BUILD TEST PLEASE REMOVE" >> repository/src/lib.rs
  echo -n "Repository,"
  time cargo build -q

  echo "// BUILD TEST PLEASE REMOVE" >> service/src/lib.rs
  echo -n "Service,"
  time cargo build -q

  echo "// BUILD TEST PLEASE REMOVE" >> graphql/core/src/lib.rs
  echo -n "Graphql core,"
  time cargo build -q

  echo "// BUILD TEST PLEASE REMOVE" >> graphql/types/src/lib.rs
  echo -n "Graphql types,"
  time cargo build -q

  echo "// BUILD TEST PLEASE REMOVE" >> graphql/general/src/lib.rs
  echo -n "Graphql general,"
  time cargo build -q

  echo "Reseting Repo"
  git reset --hard
else 
  echo "Please commit any changes before running this command"
  git status
fi


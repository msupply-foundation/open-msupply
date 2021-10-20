#!/usr/bin/env bash

set -x
set -eo pipefail

DB_USER=${POSTGRES_USER:=postgres}
DB_PASSWORD="${POSTGRES_PASSWORD:=password}"
DB_NAME="${POSTGRES_DB:=omsupply-database}"
DB_PORT="${POSTGRES_PORT:=5432}"

DOCKER_CMD="docker"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    DOCKER_CMD="sudo docker"
fi

$DOCKER_CMD run \
    --name postgres_docker \
    -e POSTGRES_USER=${DB_USER} \
    -e POSTGRES_PASSWORD=${DB_PASSWORD} \
    -e POSTGRES_DB=${DB_NAME} \
    -p "${DB_PORT}":5432 \
    -d postgres \
    postgres -N 1000 -c log_statement=all -c logging_collector=on

#!/bin/bash
# Generates or loads a per-deployment machine id at the given path and copies
# it to /etc/machine-id for the server's machine_uid lookup.
#
# Usage: setup-machine-id.sh <path-to-machine-id-file>
#
# Skipped entirely when /etc/machine-id is already non-empty — that's how we
# defer to a host bind-mount when the operator has chosen that path.
#
# The file lives next to the database, NOT inside it, so logical dumps
# (sqlite .dump, pg_dump) don't carry it. A restored dump on a new
# deployment generates a fresh id and the central API can detect the
# mismatch — preventing a copied database from accidentally syncing as
# the original site.

set -e

ID_FILE="${1:?machine-id file path required}"

if [ ! -s /etc/machine-id ]; then
    if [ ! -s "$ID_FILE" ]; then
        cat /proc/sys/kernel/random/uuid > "$ID_FILE"
    fi
    cat "$ID_FILE" > /etc/machine-id
fi

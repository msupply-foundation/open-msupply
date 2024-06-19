#!/bin/bash

# When binaries are downloaded on Mac, they will be marked with attributes that prevent them from being launched
# File corruption error is typically shown

# This script will remove those attributes, allowing binary to run, this is dangerous and should only be use in demo 
# testing purposes and when binary is downloaded from trusted sources

cd "$(dirname "$0")"
chmod +x bin/remote_server
xattr -cr bin/remote_server
$(sleep 3 && open "http://localhost:8000") &
APP__SERVER__DANGER_ALLOW_HTTP=true ./bin/remote_server
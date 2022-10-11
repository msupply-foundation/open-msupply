#!/bin/bash

# From repo root directory, make sure 
DESTINATION="$(uname -m)_mac_sqlite"

# Buid (on Mac)
cd client && yarn install && yarn build && cd ../server && cargo clean && cargo build --release --bin remote_server && cd ../
# Copy binaries to $DESTINATION
rm -rf $DESTINATION && mkdir $DESTINATION&& mkdir $DESTINATION/bin && mv server/target/release/remote_server $DESTINATION/bin 
# Copy configurations
mkdir $DESTINATION/configuration && cp -R server/configuration/base.yaml $DESTINATION/configuration/
# Local file should be present
touch $DESTINATION/configuration/local.yaml
# Empty out local.yaml
rm $DESTINATION/configuration/local.yaml

# Copy launch script
cp build/mac/open_msupply_server.sh $DESTINATION/
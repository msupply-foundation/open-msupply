#!/bin/bash
set -e

# Current directory
DIR="$(cd "$(dirname "$0")" && pwd)"
# intel or arm
ARCHITECTURE=$1
SHOULD_INCLUDE_DEMO_DATA=$2
DESTINATION=$("${DIR}"/get_name.sh $ARCHITECTURE)

echo "destination: ${DESTINATION}"

# Select target
if [ "$ARCHITECTURE" == "intel" ]; then
    TARGET="x86_64-apple-darwin"
elif [ "$ARCHITECTURE" == "arm" ]; then
    TARGET="aarch64-apple-darwin"
else
    echo "Error: first argument must be 'intel' or 'arm'"
    exit 1
fi

# Add target
rustup target add $TARGET

# Buid (on Mac)
# This repo's frontend is the OLD UI, served under /old-ui/, so it must be built
# with that public path (asset URLs + router base). The NEW FE served at / is
# fetched as a pinned dist zip below, not built here.
cd client
yarn install
PUBLIC_PATH=/old-ui/ yarn build

cd ../server
cargo build --release --bin remote_server --bin remote_server_cli --target $TARGET
cd ../

# Copy binaries to $DESTINATION
rm -rf $DESTINATION
mkdir $DESTINATION
mkdir $DESTINATION/bin
cp "server/target/${TARGET}/release/remote_server" $DESTINATION/bin 
cp "server/target/${TARGET}/release/remote_server_cli" $DESTINATION/bin 

# New FE at / : fetch the pinned, checksum-verified dist zip from the
# open-msupply-frontend repo and unpack it into frontend/ (served from
# frontend_dir, relative to the launch script's working directory). The FE repo
# is private and has no release yet, so drive this with FRONTEND_DIST_URL (and a
# token once releases exist) until frontend-version.json is pinned to a real tag
# — see server/README.md ('Serving front-end'). No silent fallback to the in-tree
# build: the wrong FE at / is worse than a loud failure.
node build/fetch-frontend.js "$DESTINATION/frontend"

# Old UI at /old-ui/ : the client build above (PUBLIC_PATH=/old-ui/) goes here.
cp -R client/packages/host/dist "$DESTINATION/frontend/old-ui"

# Copy configurations
mkdir $DESTINATION/configuration
cp -R server/configuration/base.yaml $DESTINATION/configuration/
mkdir $DESTINATION/app_data
# Local file should be present. Point the server at the old UI so the bundle
# serves both frontends out of the box (base.yaml keeps old_ui_frontend_dir
# commented; local.yaml overrides it for this bundle).
printf 'server:\n  old_ui_frontend_dir: "frontend/old-ui"\n' > $DESTINATION/configuration/local.yaml

# Initialise demo data
if [ "$SHOULD_INCLUDE_DEMO_DATA" == "true" ]; then
    cp -R server/data $DESTINATION
    cd $DESTINATION
    ./bin/remote_server_cli initialise-from-export -n reference1
    cd ../
fi

# Copy launch script
cp build/mac/open_msupply_server.sh $DESTINATION/

# This would set openWith = terminal for mac (you can manually set openWith = terminal then do 'xattr -px com.apple.LaunchServices.OpenWith open_msupply_server.sh' to see this hash)
xattr -wx com.apple.LaunchServices.OpenWith 62706C6973743030D30102030405065776657273696F6E54706174685F101062756E646C656964656E74696669657210005F102B2F53797374656D2F4170706C69636174696F6E732F5574696C69746965732F5465726D696E616C2E6170705F1012636F6D2E6170706C652E5465726D696E616C080F171C2F315F0000000000000101000000000000000700000000000000000000000000000074 $DESTINATION/open_msupply_server.sh
chmod +x $DESTINATION/open_msupply_server.sh

# Copy instructions

cp build/mac/instructions.txt $DESTINATION/
# Write hash
echo $(git log -1) > $DESTINATION/sha.txt
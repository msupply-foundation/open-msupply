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
cd client
yarn install
yarn build

cd ../server
cargo build --release --bin remote_server --bin remote_server_cli --target $TARGET
cd ../

# Copy binaries to $DESTINATION
rm -rf $DESTINATION
mkdir $DESTINATION
mkdir $DESTINATION/bin
cp "server/target/${TARGET}/release/remote_server" $DESTINATION/bin 
cp "server/target/${TARGET}/release/remote_server_cli" $DESTINATION/bin 

# Copy configurations
mkdir $DESTINATION/configuration
cp -R server/configuration/base.yaml $DESTINATION/configuration/
mkdir $DESTINATION/app_data
# Local file should be present
touch $DESTINATION/configuration/local.yaml

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
@ECHO ##### Building omsupply for the sqlite #####
SET installerWorkspace=C:\Program Files (x86)\Jenkins\jobs\omSupplyMain - installers\workspace\omSupply
cd .. && cd client && yarn install --force && yarn build && cd .. && cd server && cargo clean && cargo build --release && cd .. && @ECHO ##### Copying build artifacts to the installer folder ##### && copy "server\target\release\remote_server.exe" "%installerWorkspace%\omSupply Web Server\omSupply-sqlite.exe" && copy "server\target\release\remote_server.exe" "%installerWorkspace%\omSupply Desktop Server\server\omSupply-sqlite.exe"

@ECHO ##### Building omsupply for the sqlite #####
SET installerWorkspace=C:\Program Files (x86)\Jenkins\jobs\omSupplyMain - installers\workspace\omSupply
cd "..\..\server" && cargo build --release && cd .. && @ECHO ##### Copying build artifacts to the installer folder ##### && copy "server\target\release\remote_server.exe" "%installerWorkspace%\omSupply Server\omSupply-sqlite.exe"

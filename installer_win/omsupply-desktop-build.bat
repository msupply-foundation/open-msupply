@ECHO ##### Building omSupply for the desktop #####
SET installerWorkspace=C:\Program Files (x86)\Jenkins\jobs\omSupplyMain - installers\workspace\omSupply
cd .. && cd "server" && cargo clean && cd .. && cd "client" && yarn install --force && yarn electron:build && cd .. && @ECHO ##### Copying build artifacts to the installer folder ##### && xcopy "client\packages\electron\out\open mSupply-win32-x64\**" "%installerWorkspace%\omSupply Desktop Server\" /e /h /c /i

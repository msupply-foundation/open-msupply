@ECHO ##### Building omSupply for the desktop #####
SET installerWorkspace=C:\Program Files (x86)\Jenkins\jobs\omSupplyMain - installers\workspace\omSupply
cd "..\..\client" && yarn electron:build && cd .. && @ECHO ##### Copying build artifacts to the installer folder ##### && xcopy "client\packages\electron\out\open mSupply-win32-x64\**" "%installerWorkspace%\omSupply Desktop\" /e /h /c /i

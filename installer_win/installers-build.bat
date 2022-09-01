@ECHO ##### Removing installers folder #####
@rmdir "installers" /s /q

@ECHO ##### Copying bin and certs folders #####
mkdir "omSupply\omSupply Web Server\app_data"
xcopy "omSupply\bin" "omSupply\omSupply Web Server\bin" /e /h /c /i
xcopy "omSupply\certs" "omSupply\omSupply Web Server\app_data\certs" /e /h /c /i

mkdir "omSupply\omSupply Desktop Server\server\app_data"
xcopy "omSupply\bin" "omSupply\omSupply Desktop Server\server\bin" /e /h /c /i
xcopy "omSupply\certs" "omSupply\omSupply Desktop Server\server\app_data\certs" /e /h /c /i

copy "omSupply\build\omsupply_license_and_warranty.txt" "omSupply\omsupply_license_and_warranty.txt"
copy "omSupply\build\omSupply.ico" "omSupply\omSupply.ico"

@ECHO ##### Adjusting SUFS #####
SET installerWorkspace=C:\Program Files (x86)\Jenkins\jobs\omSupplyMain - installers\workspace\omSupply
SET SUFlocation=%installerWorkspace%\build
FOR /F "delims=*" %%i in ('more omSupply\version.txt') do SET versionTag=%%i
@ECHO "current tag = %versionTag%"
SET installersOutputFolder=C:\Program Files (x86)\Jenkins\jobs\omSupplyMain - installers\workspace\installers

@cd omSupply
node "%SUFlocation%\adjustSUFs.js"
@cd ..

@ECHO ##### Creating installers #####
start "" /wait "C:\Program Files (x86)\Setup Factory 9\SUFDesign.exe" /BUILD /LOG:installers\setup-factory.log "%installerWorkspace%\omsupply_server.suf"
start "" /wait "C:\Program Files (x86)\Setup Factory 9\SUFDesign.exe" /BUILD /LOG:installers\setup-factory.log "%installerWorkspace%\omsupply_server_upgrader.suf"
start "" /wait "C:\Program Files (x86)\Setup Factory 9\SUFDesign.exe" /BUILD /LOG:installers\setup-factory.log "%installerWorkspace%\omsupply_desktop_server.suf"
start "" /wait "C:\Program Files (x86)\Setup Factory 9\SUFDesign.exe" /BUILD /LOG:installers\setup-factory.log "%installerWorkspace%\omsupply_desktop_server_upgrader.suf"

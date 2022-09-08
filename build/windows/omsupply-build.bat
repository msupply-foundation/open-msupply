@ECHO ##### Removing previous builds #####
SET installerWorkspace=C:\Program Files (x86)\Jenkins\jobs\omSupplyMain - installers\workspace\omSupply

@rmdir "%installerWorkspace%" /s /q
@mkdir "%installerWorkspace%"

@ECHO ##### Starting omsupply builds #####
mkdir "%installerWorkspace%\omSupply Web Server"
xcopy "server\configuration" "%installerWorkspace%\omSupply Web Server\configuration" /e /h /c /i

mkdir "%installerWorkspace%\omSupply Desktop Server"
mkdir "%installerWorkspace%\omSupply Desktop Server\server"
xcopy "server\configuration" "%installerWorkspace%\omSupply Desktop Server\server\configuration" /e /h /c /i

copy "server\server\omSupply.ico" "build\omSupply.ico"
xcopy "build\*.*" "%installerWorkspace%" /e /h /c /i
xcopy "build\windows\*.*" "%installerWorkspace%" /e /h /c /i
copy "version.txt" "%installerWorkspace%\version.txt"

@cd "build\windows"
start /b /wait omsupply-prepare.bat

start /b /wait omsupply-sqlite-build.bat

start /b /wait omsupply-postgres-build.bat

start /b /wait omsupply-desktop-build.bat

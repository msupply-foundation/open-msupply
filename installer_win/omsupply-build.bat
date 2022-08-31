@ECHO ##### Removing previous builds #####
SET installerWorkspace=C:\Program Files (x86)\Jenkins\jobs\omSupplyMain - installers\workspace\omSupply
@rmdir "%installerWorkspace%\omSupply Web Server" /s /q
@rmdir "%installerWorkspace%\omSupply Desktop Server" /s /q
@rmdir "%installerWorkspace%\build" /s /q

@ECHO ##### Starting omsupply builds #####
mkdir "%installerWorkspace%\omSupply Web Server"
xcopy "server\configuration" "%installerWorkspace%\omSupply Web Server\configuration" /e /h /c /i

mkdir "%installerWorkspace%\omSupply Desktop Server"
mkdir "%installerWorkspace%\omSupply Desktop Server\server"
xcopy "server\configuration" "%installerWorkspace%\omSupply Desktop Server\server\configuration" /e /h /c /i

copy "server\server\src\omSupply.ico" "build\omSupply.ico"
xcopy "installer_win" "%installerWorkspace%\build" /e /h /c /i
copy "version.txt" "%installerWorkspace%\version.txt"

@cd "installer_win"
start /b /wait omsupply-sqlite-build.bat

@cd "installer_win"
start /b /wait omsupply-postgres-build.bat

@cd "installer_win"
start /b /wait omsupply-desktop-build.bat

@ECHO ##### Removing previous builds #####
@rmdir "omSupply" /s /q

@ECHO ##### Starting omsupply builds #####
mkdir "omSupply"
mkdir "omSupply\Server"
mkdir "omSupply\Desktop"
xcopy "server\configuration" "omSupply\Server\configuration" /e /h /c /i

copy "server\server\omSupply.ico" "build\omSupply.ico"
xcopy "build\*.*" "omSupply" /c
xcopy "build\windows\*.*" "omSupply" /c
copy "version.txt" "omSupply\version.txt"

@cd "build\windows"
start /b /wait omsupply-prepare.bat
start /b /wait omsupply-sqlite-build.bat
start /b /wait omsupply-postgres-build.bat
start /b /wait omsupply-desktop-build.bat
cd "..\..\server"
start /wait cargo build --release && copy "target\release\remote_server.exe" "..\omSupply\Server\omSupply-server-sqlite.exe"
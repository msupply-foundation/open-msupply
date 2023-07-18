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
xcopy "build\windows\demo" "omSupply\demo" /c /y /i
copy "version.txt" "omSupply\version.txt"

@cd "build\windows"
call omsupply-prepare.bat
@if %errorlevel% neq 0 exit /b %errorlevel%

call omsupply-sqlite-build.bat
@if %errorlevel% neq 0 exit /b %errorlevel%

call omsupply-postgres-build.bat
@if %errorlevel% neq 0 exit /b %errorlevel%

call omsupply-desktop-build.bat
@if %errorlevel% neq 0 exit /b %errorlevel%

cd "..\..\server"
call cargo build --release && copy "target\release\remote_server.exe" "..\omSupply\Server\omSupply-server-sqlite.exe"
@if %errorlevel% neq 0 exit /b %errorlevel%

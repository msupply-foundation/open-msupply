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
@REM start /b /wait omsupply-prepare.bat
@REM @if %errorlevel% neq 0 exit /b %errorlevel%

call omsupply-sqlite-build.bat
@if %errorlevel% neq 0 exit /b %errorlevel%

@REM start /b /wait omsupply-postgres-build.bat
@REM @if %errorlevel% neq 0 exit /b %errorlevel%

@REM start /b /wait omsupply-desktop-build.bat
@REM @if %errorlevel% neq 0 exit /b %errorlevel%

@REM cd "..\..\server"
@REM start /wait cargo build --release && copy "target\release\remote_server.exe" "..\omSupply\Server\omSupply-server-sqlite.exe"
@REM @if %errorlevel% neq 0 exit /b %errorlevel%

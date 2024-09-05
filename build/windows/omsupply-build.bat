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

start /wait /b build\windows\omsupply-prepare.bat
@if %errorlevel% neq 0 exit /b %errorlevel%

@REM @ECHO ##### Building omsupply for sqlite #####
@REM @cd server 
@REM cargo build --release --bin omsupply_service && copy "target\release\omsupply_service.exe" "..\omSupply\Server\omSupply-sqlite.exe"
@REM @if %errorlevel% neq 0 exit /b %errorlevel%

@REM @ECHO ##### Building sqlite omsupply server #####
@REM cargo build --release && copy "target\release\remote_server.exe" "..\omSupply\Server\omSupply-server-sqlite.exe"
@REM @if %errorlevel% neq 0 exit /b %errorlevel%

@REM @ECHO ##### Building omsupply for postgres #####
@REM cargo build --release --bin omsupply_service --features postgres && copy "target\release\omsupply_service.exe" "..\omSupply\Server\omSupply-postgres.exe"
@REM @if %errorlevel% neq 0 exit /b %errorlevel%

@REM @ECHO ##### Building omSupply cli #####
@REM cargo build --release --bin remote_server_cli && copy "target\release\remote_server_cli.exe" "..\omSupply\Server\omSupply-cli-sqlite.exe"
@REM cargo build --release --bin remote_server_cli --features postgres && copy "target\release\remote_server_cli.exe" "..\omSupply\Server\omSupply-cli-postgres.exe"
@REM @if %errorlevel% neq 0 exit /b %errorlevel%

@REM @ECHO ##### Building connection test utility #####
@REM cargo build --release --bin test_connection && copy "target\release\test_connection.exe" "..\omSupply\Server\test-connection-sqlite.exe"
@REM cargo build --release --bin test_connection --features postgres && copy "target\release\test_connection.exe" "..\omSupply\Server\test-connection-postgres.exe"
@REM @if %errorlevel% neq 0 exit /b %errorlevel%

@REM @ECHO ##### Building omSupply for the desktop #####
@cd "..\client" 
@REM yarn electron:build && xcopy "packages\electron\out\open mSupply-win32-x64\**" "..\omSupply\Desktop\" /e /h /c /i
@REM @if %errorlevel% neq 0 exit /b %errorlevel%

@ECHO ##### Building omSupply apk #####
@REM copy the keystore and local.properties for apk signing
copy c:\android\local.properties packages\android\ /y && copy c:\android\release.keystore packages\android\app\ /y
yarn android:build:release
copy packages\android\app\build\outputs\apk\release\*.apk ..\omSupply
@if %errorlevel% neq 0 exit /b %errorlevel%

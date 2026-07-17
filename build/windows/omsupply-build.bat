@ECHO ##### Removing previous builds #####
@rmdir "omSupply" /s /q

@ECHO ##### Starting omsupply builds #####
mkdir "omSupply"
mkdir "omSupply\Server"
mkdir "omSupply\Desktop"
xcopy "server\configuration" "omSupply\Server\configuration" /e /h /c /i
xcopy "server\app_data" "omSupply\Server\app_data" /e /h /c /i

copy "server\server\omSupply.ico" "build\omSupply.ico"
xcopy "build\*.*" "omSupply" /c
xcopy "build\windows\*.*" "omSupply" /c
xcopy "build\windows\demo" "omSupply\demo" /c /y /i
copy "version.txt" "omSupply\version.txt"

@REM note: the /b must come first, otherwise the command is not waited
start /b /wait build\windows\omsupply-prepare.bat
@if %errorlevel% neq 0 (
    exit /b %errorlevel%
)

@ECHO ##### update cargo binary version #####
@FOR /F "delims=*" %%i in ('more omSupply\version.txt') do SET versionTag=%%i
@FOR /F "delims=*" %%i in ('node getVersion.js') do set version=%%i

@cd server 

cargo install cargo-edit
cargo set-version %version%

@ECHO ##### Building all sqlite binaries #####
cargo build --release --bin omsupply_service --bin remote_server --bin remote_server_cli --bin test_connection
@if %errorlevel% neq 0 ( exit /b %errorlevel% )

copy "target\release\omsupply_service.exe" "..\omSupply\Server\omSupply-sqlite.exe"
copy "target\release\remote_server.exe"    "..\omSupply\Server\omSupply-server-sqlite.exe"
copy "target\release\remote_server_cli.exe" "..\omSupply\Server\omSupply-cli-sqlite.exe"
copy "target\release\test_connection.exe"  "..\omSupply\Server\test-connection-sqlite.exe"

@ECHO ##### Building all postgres binaries #####
cargo build --release --bin omsupply_service --bin remote_server_cli --bin test_connection --features postgres
@if %errorlevel% neq 0 ( exit /b %errorlevel% )

copy "target\release\omsupply_service.exe" "..\omSupply\Server\omSupply-postgres.exe"
copy "target\release\remote_server_cli.exe" "..\omSupply\Server\omSupply-cli-postgres.exe"
copy "target\release\test_connection.exe"  "..\omSupply\Server\test-connection-postgres.exe"

@cd..

@ECHO ##### Copying frontend bundle (served from frontend_dir at runtime) #####
xcopy "client\packages\host\dist" "omSupply\Server\frontend" /e /h /c /i
@if %errorlevel% neq 0 ( exit /b %errorlevel% )

@REM start /b /wait build\windows\omsupply-android.bat
@REM @if %errorlevel% neq 0 exit /b %errorlevel%

start /b /wait build\windows\omsupply-electron.bat
@if %errorlevel% neq 0 (
    exit /b %errorlevel%
)

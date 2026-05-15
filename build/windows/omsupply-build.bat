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

@cd server

@ECHO ##### Building postgres server binary #####
cargo build --release --bin omsupply_service --no-default-features --features postgres
@if %errorlevel% neq 0 ( exit /b %errorlevel% )

copy "target\release\omsupply_service.exe" "..\omSupply\Server\omSupply-postgres.exe"

@cd..

@REM start /b /wait build\windows\omsupply-android.bat
@REM @if %errorlevel% neq 0 exit /b %errorlevel%

start /b /wait build\windows\omsupply-electron.bat
@if %errorlevel% neq 0 (
    exit /b %errorlevel%
)

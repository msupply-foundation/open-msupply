@ECHO ##### Building omsupply for the sqlite #####
cd "..\..\server" && cargo build --release --bin omsupply_service && copy "target\release\omsupply_service.exe" "..\omSupply\Server\omSupply-sqlite.exe"
@if %errorlevel% neq 0 exit /b %errorlevel%

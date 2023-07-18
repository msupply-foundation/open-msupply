@ECHO ##### Building omsupply for the postgres #####
cd "..\..\server" && cargo build --release --bin omsupply_service --features postgres && copy "target\release\omsupply_service.exe" "..\omSupply\Server\omSupply-postgres.exe"
@if %errorlevel% neq 0 exit /b %errorlevel%

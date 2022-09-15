@ECHO ##### Building omsupply for the sqlite #####
cd "..\..\server" && cargo build --release --bin omsupply_service && xcopy "target\release\omsupply_service.exe" "..\omSupply\Server\omSupply-sqlite.exe"

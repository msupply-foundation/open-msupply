@ECHO ##### Building omsupply for the postgres #####
cd "..\..\server" && cargo build --release --bin omsupply_service --features postgres && xcopy "target\release\remote_server.exe" "..\omSupply\Server\omSupply-postgres.exe"

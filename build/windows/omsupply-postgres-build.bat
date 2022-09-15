@ECHO ##### Building omsupply for the postgres #####
cd "..\..\server" && cargo build --release --bin omsupply_service --features postgres && copy "target\release\remote_server.exe" "..\omSupply\Server\omSupply-postgres.exe"

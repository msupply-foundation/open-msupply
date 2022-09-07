@ECHO ##### Prepare omsupply build #####
cd "..\..\client" && yarn install --force && yarn build && cd "..\server" && cargo clean

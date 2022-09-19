@ECHO ##### Prepare omsupply build #####
REM cd "..\..\client" && yarn install --force && yarn build && cd "..\server" && cargo clean
cd "..\..\client" && yarn install --force --frozen-lockfile && yarn build

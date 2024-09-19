@ECHO ##### Prepare omsupply build #####
cd "client" && yarn install --force --frozen-lockfile && yarn build
@if %errorlevel% neq 0 exit /b %errorlevel%

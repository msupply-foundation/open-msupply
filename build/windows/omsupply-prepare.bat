@ECHO ##### Prepare omsupply build #####
cd "client" && yarn install --force --frozen-lockfile && yarn build
@if %errorlevel% neq 0 (
    @ECHO ERROR: Failed to prepare client
    exit /b %errorlevel%
)

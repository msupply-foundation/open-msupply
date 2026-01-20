@ECHO ##### Prepare omsupply build #####

@REM Clean up previous build artifacts
@if exist "client\packages\host\dist" (
    rd /s /q "client\packages\host\dist" 2>nul
)

cd "client" && yarn install --force --frozen-lockfile && yarn build
@if %errorlevel% neq 0 (
    @ECHO ERROR: Failed to prepare client
    exit /b %errorlevel%
)

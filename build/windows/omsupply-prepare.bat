@ECHO ##### Prepare omsupply build #####

@REM Clean up previous build artifacts - not strictly necessary,
@REM but if the yarn commands below do not report errors there is a chance
@REM that the server bundles the previous build's frontend
@REM Should not be an issue now that 'call' is used for yarn commands
@if exist "client\packages\host\dist" (
    rd /s /q "client\packages\host\dist" 2>nul
)


cd "client" && call yarn install --force --frozen-lockfile && call yarn build
@if %errorlevel% neq 0 (
    @ECHO ERROR: Failed to prepare client
    exit /b %errorlevel%
)

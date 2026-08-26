@ECHO ##### Prepare omsupply build #####

@REM Clean up previous build artifacts - not strictly necessary,
@REM but if the yarn commands below do not report errors there is a chance
@REM that the server bundles the previous build's frontend
@REM Should not be an issue now that 'call' is used for yarn commands
@if exist "client\packages\host\dist" (
    rd /s /q "client\packages\host\dist" 2>nul
)


@REM This repo's client build is the OLD UI: in the dual-frontend bundle it is
@REM served under /old-ui/, so it must build with that public path (asset URLs +
@REM router base). The NEW FE served at / is fetched as a pinned dist zip in
@REM omsupply-build.bat, not built here.
@REM (This .bat runs in its own cmd via `start /b /wait`, so PUBLIC_PATH does not
@REM leak back to the caller; setting it here scopes it to the client build.)
set "PUBLIC_PATH=/old-ui/"

call corepack enable && cd "client" && call yarn install --immutable && call yarn build
@if %errorlevel% neq 0 (
    @ECHO ERROR: Failed to prepare client
    exit /b %errorlevel%
)

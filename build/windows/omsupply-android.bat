@ECHO ##### Building omSupply apk #####
@REM copy the keystore and local.properties for apk signing
copy c:\android\local.properties client\packages\android\ /y && copy c:\android\release.keystore client\packages\android\app\ /y
cd "client" && yarn android:build:release && copy packages\android\app\build\outputs\apk\release\*.apk ..\omSupply
@if %errorlevel% neq 0 (
    @ECHO ERROR: Failed to build android apk
    exit /b %errorlevel%
)

@ECHO ##### Building omSupply apk #####
@REM copy the keystore and local.properties for apk signing
copy c:\android\local.properties client\packages\android\ /y && copy c:\android\release.keystore client\packages\android\app\ /y
cd "client" && yarn android:build:release && copy packages\android\app\build\outputs\apk\release\*.apk ..\omSupply
@exit /b %errorlevel%

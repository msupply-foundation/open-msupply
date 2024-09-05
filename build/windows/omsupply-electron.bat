@REM keep electron last, as it exits the batch when complete
@ECHO ##### Building omSupply for the desktop #####
cd "client" && yarn electron:build && xcopy "packages\electron\out\open mSupply-win32-x64\**" "..\omSupply\Desktop\" /e /h /c /i
@if %errorlevel% neq 0 exit /b %errorlevel%


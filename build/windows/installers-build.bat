@ECHO ##### Removing installers folder #####
@rmdir "installers" /s /q

@ECHO ##### Adjusting SUFS #####
FOR /F "delims=*" %%i in ('more omSupply\version.txt') do SET versionTag=%%i
@ECHO "current tag = %versionTag%"
SET installersOutputFolder=%WORKSPACE%\installers

@cd omSupply
node "adjustSUFs.js"
@cd ..

@ECHO ##### Creating installers #####
@REM start "" /wait "C:\Program Files (x86)\Setup Factory 9\SUFDesign.exe" /BUILD /LOG:installers\setup-factory.log "omSupply\omsupply_server.suf"
@REM start "" /wait "C:\Program Files (x86)\Setup Factory 9\SUFDesign.exe" /BUILD /LOG:installers\setup-factory.log "omSupply\omsupply_desktop.suf"
@REM start "" /wait "C:\Program Files (x86)\Setup Factory 9\SUFDesign.exe" /BUILD /LOG:installers\setup-factory.log "omSupply\omsupply_demo.suf"
@REM start "" /wait "C:\Program Files (x86)\Setup Factory 9\SUFDesign.exe" /BUILD /LOG:installers\setup-factory.log "omSupply\omsupply_standalone.suf"
copy omSupply\open-msupply-*.apk installers\Open_mSupply_Android_%versionTag%.apk

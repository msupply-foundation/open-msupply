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
start "" /wait "C:\Program Files (x86)\Setup Factory 9\SUFDesign.exe" /BUILD /LOG:installers\setup-factory.log "omSupply\omsupply_server.suf"
start "" /wait "C:\Program Files (x86)\Setup Factory 9\SUFDesign.exe" /BUILD /LOG:installers\setup-factory.log "omSupply\omsupply_desktop.suf"
start "" /wait "C:\Program Files (x86)\Setup Factory 9\SUFDesign.exe" /BUILD /LOG:installers\setup-factory.log "omSupply\omsupply_demo.suf"
start "" /wait "C:\Program Files (x86)\Setup Factory 9\SUFDesign.exe" /BUILD /LOG:installers\setup-factory.log "omSupply\omsupply_standalone.suf"
@REM copy omSupply\open-msupply-*.apk installers\Open_mSupply_Android_%versionTag%.apk

@ECHO ##### Prepare omsupply build #####
cd "client" && yarn install --force --frozen-lockfile && yarn build
@exit /b %errorlevel%

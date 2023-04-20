# Making Mac Demo Binary

`NOTE` -> this is for demo and testing purposes only, not to be used in production

```bash
# for Intel mac
./build/mac/build.sh intel 
# or for Arm mac (with demo data)
./build/mac/build.sh arm true
```

Above will build and `bundle` files in `omSupply_mac_{ARCHITECHTURE}_{VERSION}_{COMMIT_DAY_MONTH}_{COMMIT_HOUR_AND_SECOND}`

You can zip the contents of that folder now and share with testers or for demo purposes. (they would need to double click on open_msupply_server.sh, and allow it in their mac security settings)

To include some data:

## Add demo data

Add 'true' as last argument (after intel or mac)

## Add other data

* Click on open_msupply_server.sh from finder
* After 3 seconds initialisation screen should open in browser
* Enter credentials and initialise
* Log in with all of the users that will need access in the demo data
* cmd + c out of terminal that was opened when `open_msupply_server.sh` was clicked

Now zipping `omSupply_mac_{ARCHITECHTURE}_{VERSION}_{COMMIT_DAY_MONTH}_{COMMIT_HOUR_AND_SECOND}` should save the data as well
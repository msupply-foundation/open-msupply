# Making Mac Demo Binary

`NOTE` -> this is for demo and testing purposes only, not to be used in production

```bash
./build/mac/build.sh
```

Above will build and `bundle` files in `{..}_mac_sqlite` folder where `{..}` is replaced with architecture of the build

* In finder, right click on `{..}_mac_sqlite/open_msupply_server.sh`, then `Get info`, then `Open with` then select `terminal` from `Utilities` after selecting `Enable All Application`

You can zip the contents of `{..}_mac_sqlite` folder now and share with testers or for demo purposes.

To include some data:

## Add data

* Click on open_msupply_server.sh from finder
* After 3 seconds initialisation screen should open in browser
* Enter credentials and initialise
* Log in with all of the users that will need access in the demo data
* cmd + c out of terminal that was opened when `open_msupply_server.sh` was clicked

You can zip the contents of `{..}_mac_sqlite` folder now and share with testers or for demo purposes.

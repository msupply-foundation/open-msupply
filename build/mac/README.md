# Making Mac Demo Binary

`NOTE` -> this is for demo and testing purposes only, not to be used in production

```bash
# for Intel mac (also works on Arm mac)
./build/mac/build.sh intel 
# or for Arm mac (with demo data)
./build/mac/build.sh arm true
```

Above will build and `bundle` files in `omSupply_mac_{ARCHITECTURE}_{VERSION}_{COMMIT_DAY_MONTH}_{COMMIT_HOUR_AND_SECOND}`

## Include the SQLite → Postgres migration driver (optional)

By default the bundle only contains the SQLite `remote_server_cli`. To also include a Postgres CLI with
the `migrate-sqlite-to-postgres` subcommand, set `INCLUDE_MIGRATION_DRIVER=true`:

```bash
INCLUDE_MIGRATION_DRIVER=true ./build/mac/build.sh arm
```

This produces an extra `bin/remote_server_cli-postgres` (the SQLite CLI is left untouched). It requires
libpq — install with `brew install libpq` (the script auto-detects it). See
`server/cli/SQLITE_TO_POSTGRES_MIGRATION.md` for how to run the migration.

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

Now zipping `omSupply_mac_{ARCHITECTURE}_{VERSION}_{COMMIT_DAY_MONTH}_{COMMIT_HOUR_AND_SECOND}` should save the data as well
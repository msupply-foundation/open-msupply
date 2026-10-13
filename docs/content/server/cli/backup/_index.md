+++
title = "Backup and Restore"
weight = 10
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "code"
+++

# Backup and Restore

omSupply server can be backed up and restored via cli.

`NOTE` In production backups should only be done for omSupply central servers, remote sites are backed up via synchronisation

For full cli arguments list and up to date description please run command with just `--help` argument

### Backup

To backup simply run:

**In development mode**

```
cargo run --bin remote_server_cli -- backup
```

or for postgres

```
cargo run --bin remote_server_cli --features postgres -- backup
```

**In production**

```
omSupply-cli backup
```

You will need to specify a backup folder in the configuration `.yaml` files - to get started, see the `example.yaml`. Each time backup runs a new folder will be created with this format `D[YYYY]_[mm]_[dd]T[HH]_[MM]_[SS]` e.g. `D2024_08_22T05_05_16`. A successful backup will print new backup name to console.

Backup will contain a folder with all of the app_data (plugins, static files, etc..) and a folder with either sqlite files or postgres database dump.

`max_number_of_backups` in configuration `.yaml` file can be used to limit number of backups that will be kept in backup folder, this will be checked during each backup and extra backup folder will be deleted

### Restore

To restore run:

**In development mode**

```
cargo run --bin remote_server_cli -- restore -b D2024_08_22T05_05_16 -s
```
or for postgres
```
cargo run --bin remote_server_cli --features postgres -- restore -b D2024_08_22T05_05_16 -s
```

**In production**

```
omSupply-cli restore -b D2024_08_22T05_05_16
```

Cli restore command will look for a backup folder specified with `-b` in backup folder specified by configurations `.yaml` files.

App data folder will be cleared and replaced by the content of backup app_data. For postgres existing database will be dropped and replaced by the backup database dump, and for sqlite, database files will be copied, after existing database sqlite files are wiped

### Extra

Configurations in `.yaml` files will be used in backup and restore, the base app folder, database name.

Before wiping anything, restore prints the database and app data folder it is about to replace, so check them before typing the confirmation.

Any configuration value can be overridden with an environment variable, which is the easiest way to restore into a database other than the one in your `.yaml` files, e.g. to restore a postgres backup into a `djibouti` database with its own app data folder:

```
APP__DATABASE__DATABASE_NAME=djibouti APP__SERVER__BASE_DIR=app_data_djibouti cargo run --bin remote_server_cli --features postgres -- restore -b D2024_08_22T05_05_16
```

Run the server with the same overrides to use the restored data.

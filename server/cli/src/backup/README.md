# Backup and Restore

omSupply server can be backed up and restored via cli. 

### Backup

To backup simply run: 

**In development mode**

`cargo run --bin remote service_cli -- backup`

**In production**

`omSupply-cli backup`

You will need to specify backup folder in configurations `.yaml` files see example.yaml. Each time backup runs a new folder will be created with this format `D2024_08_22T05_05_16`, a successful backup will print new backup name to console.

Backup will contain a folder with all of the app_data (plugins, static files, etc..) and a folder with either sqlite files or postgres database dump. 

### Restore

To restore run: 

**In development mode**

`cargo run --bin remote service_cli -- restore -b D2024_08_22T05_05_16 -s`

**In production**

`omSupply-cli restore -b D2024_08_22T05_05_16`

For full cli arguments list run `restore --help`

Cli restore command will look for a backup folder specified with `-b` in backup folder specified by configurations `.yaml` files.

App data folder will be cleared and replaced by the content of backup app_data. For postgres existing database will be dropped and replace by the backup database dump, and for sqlite, database files will be copied, after existing database sqlite files are wiped 

### Extra 

Configurations in `.yaml` files will be used in backup and restore, the base app folder, database name etc.. 

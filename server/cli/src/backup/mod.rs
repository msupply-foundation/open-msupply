mod backup;
pub(super) use self::backup::*;
mod restore;
pub(super) use self::restore::*;

use std::env::VarError;
use std::fs;
use std::str::FromStr;
use std::{io, path::PathBuf};

use repository::RepositoryError;
use service::settings::BackupSettings;
use service::settings::Settings;
use shellexpand::LookupError;
use thiserror::Error;

const BACKUP_FILE_DIR: &'static str = "files";

#[cfg(feature = "postgres")]
const BACKUP_DATABASE_DIR: &'static str = "postgres";
#[cfg(not(feature = "postgres"))]
const BACKUP_DATABASE_DIR: &'static str = "sqlite";

#[derive(Error, Debug)]
pub(super) enum BackupError {
    #[error("Cannot find pg_dump or pg_restore executable in PATH, add it to PATH or specify Postgres bin directory in the configuration file")]
    PgCommandNotFoundInPath,
    #[error("Cannot find pg_dump or pg_restore executable in Postgres bin directory specified in configurations")]
    PgCommandNotFoundInBinPath,
    #[error("Problem create folder at path: {1}")]
    CannotCreateBackupFolder(#[source] io::Error, PathBuf),
    #[error("base_dir must be configured in configuration files")]
    BaseDirNotSet,
    #[error("Invalid path specified: {0}")]
    InvalidPath(String),
    #[error("Problem copying folder, from: {0} to {1}")]
    ProblemCopyingFolder(#[source] io::Error, PathBuf, PathBuf),
    #[error("Cannot find sqlite backup files with name {0}")]
    CannotFindSqliteBackup(String),
    #[error(transparent)]
    StdIO(#[from] io::Error),
    #[error("Error while executing command line: {0:#?}")]
    CommandLineError(std::process::Output),
    #[error("Invalid sqlite backup file: {0}")]
    InvalidSqliteFile(PathBuf),
    #[error("Failed to confirm restore")]
    RestoreNotConfirmed,
    #[error("Backup configurations needs to be specified in configuration files")]
    BackupConfigurationMissing,
    #[error("Error while converting path {0} in {1}")]
    ErrorWhileConvertingPath(LookupError<VarError>, String),
    #[error("Issue opening backup folder {1}")]
    BackupFolderNotExist(#[source] io::Error, PathBuf),
    #[error(transparent)]
    DatabaseError(#[from] RepositoryError),
    #[error(transparent)]
    Other(#[from] anyhow::Error),
}
#[derive(clap::Parser, Debug)]
pub(super) struct RestoreArguments {
    /// Name of backup in directory specified by backup configurations
    #[clap(short, long)]
    backup_name: String,
    /// In dev can specify this to skip confirmation
    #[clap(short, long)]
    skip_confirmation: bool,
}

struct DirSettings {
    backup_dir: String,
    pg_bin_dir: Option<String>,
}

fn get_dirs_from_settings(settings: &Settings) -> Result<DirSettings, BackupError> {
    let Some(BackupSettings {
        backup_dir,
        pg_bin_dir,
        ..
    }) = settings.backup.clone()
    else {
        return Err(BackupError::BackupConfigurationMissing);
    };

    // Shell expand is mainly used to replace `~` with full path of home directory
    let backup_dir = shellexpand::full(&backup_dir)
        .map_err(|e| BackupError::ErrorWhileConvertingPath(e, backup_dir.clone()))?
        .to_string();
    let pg_bin_dir = pg_bin_dir
        .map(|d| {
            shellexpand::full(&d)
                .map_err(|e| BackupError::ErrorWhileConvertingPath(e, d.clone()))
                .map(|s| s.to_string())
        })
        .transpose()?;

    Ok(DirSettings {
        backup_dir,
        pg_bin_dir,
    })
}

fn get_base_dir(settings: &Settings) -> Result<PathBuf, BackupError> {
    settings
        .server
        .base_dir
        .as_ref()
        .map(|dir| PathBuf::from_str(dir).map_err(|_| BackupError::InvalidPath(dir.to_string())))
        .transpose()?
        .ok_or(BackupError::BaseDirNotSet)
}

fn get_sqlite_files_paths(settings: &Settings) -> Result<Vec<PathBuf>, BackupError> {
    // omSupply database name can be specified with .sqlite extension, converting path and comparing file_stem()
    // seems pretty easy way to deal with database_name discrepancy
    let backup_name = PathBuf::from_str(&settings.database.database_name)
        .map_err(|_| BackupError::InvalidPath(settings.database.database_name.to_string()))?;

    let paths = fs::read_dir("./")?
        .into_iter()
        .filter_map(Result::ok)
        .map(|e| e.path())
        .filter(|f| f.is_file() && f.file_stem() == backup_name.file_stem())
        .collect();

    Ok(paths)
}

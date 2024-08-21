mod backup;
pub(super) use self::backup::*;
mod restore;
pub(super) use self::restore::*;

use std::fs;
use std::str::FromStr;
use std::{io, path::PathBuf};

use repository::RepositoryError;
use service::settings::Settings;
use thiserror::Error;

const BACKUP_FILE_DIR: &'static str = "files";

#[cfg(feature = "postgres")]
const BACKUP_DATABASE_DIR: &'static str = "postgres";
#[cfg(not(feature = "postgres"))]
const BACKUP_DATABASE_DIR: &'static str = "sqlite";

#[derive(Error, Debug)]
pub(super) enum BackupError {
    #[error("Cannot find pg_dump or pg_restore executable in PATH, add it to PATH or specify Postgres bin directory with -p argument")]
    PgCommandNotFoundInPath,
    #[error("Cannot find pg_dump or pg_restore executable provided postgres bin path")]
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
    #[error(transparent)]
    DatabaseError(#[from] RepositoryError),
    #[error(transparent)]
    Other(#[from] anyhow::Error),
}
#[derive(clap::Parser, Debug)]
pub(super) struct BackupArguments {
    /// Output folder, backup folder will be created inside this folder
    #[clap(short, long)]
    output_dir: String,
    /// Bin directory of postgres binaries, in case pg_dump and/or pg_restore are not in PATH
    #[clap(short, long)]
    pg_bin_dir: Option<String>,
}

#[derive(clap::Parser, Debug)]
pub(super) struct RestoreArguments {
    /// Output folder, backup folder will be created inside this folder
    #[clap(short, long)]
    input_dir: String,
    /// Bin directory of postgres binaries, in case pg_dump and/or pg_restore are not in PATH
    #[clap(short, long)]
    pg_bin_dir: Option<String>,
}

fn get_file_dir(settings: &Settings) -> Result<PathBuf, BackupError> {
    settings
        .server
        .base_dir
        .as_ref()
        .map(|dir| PathBuf::from_str(dir).map_err(|_| BackupError::InvalidPath(dir.to_string())))
        .transpose()?
        .ok_or(BackupError::BaseDirNotSet)
}

fn get_sqlite_files_paths(settings: &Settings) -> Result<Vec<PathBuf>, BackupError> {
    let paths = fs::read_dir("./")?
        .into_iter()
        .filter_map(Result::ok)
        .map(|e| e.path())
        .filter(|f| {
            f.is_file()
                && f.file_stem().map(|s| s.to_str()).flatten()
                    == Some(settings.database.database_name.as_str())
        })
        .collect();

    Ok(paths)
}

use super::*;
use copy_dir::copy_dir;
use diesel::{Connection, RunQueryDsl};
use repository::DBBackendConnection;
use service::settings::{BackupSettings, Settings};
use simple_log::is_debug;
use std::{fs, io, path::PathBuf, process::Command, str::FromStr};

pub(crate) fn restore(
    settings: &Settings,
    RestoreArguments {
        skip_confirmation,
        backup_name,
    }: RestoreArguments,
) -> Result<(), BackupError> {
    let Some(BackupSettings {
        backup_dir,
        pg_bin_dir,
    }) = settings.backup.clone()
    else {
        return Err(BackupError::BackupConfigurationMissing);
    };

    confirmation(skip_confirmation)?;

    let Dirs {
        file_dir,
        database_dir,
    } = get_backup_dir(backup_dir, backup_name)?;

    copy_files(settings, &file_dir)?;

    // Backup database
    if cfg!(feature = "postgres") {
        restore_postgres_database(settings, &database_dir, pg_bin_dir)?;
    } else {
        copy_sqlite_files(settings, &database_dir)?;
    }

    Ok(())
}

fn confirmation(skip_confirmation: bool) -> Result<(), BackupError> {
    if is_debug() && skip_confirmation {
        return Ok(());
    }

    // In production confirm restore
    let confirmation = "I understand";
    println!(
        r#"This operation will completely wipe your omSupply database and other omSupply, are you sure (please type "{confirmation}" to continue): "#
    );
    let mut buffer = String::new();
    io::stdin().read_line(&mut buffer)?;

    if buffer.to_lowercase().trim() != confirmation.to_lowercase() {
        return Err(BackupError::RestoreNotConfirmed);
    }

    Ok(())
}

struct Dirs {
    file_dir: PathBuf,
    database_dir: PathBuf,
}

fn get_backup_dir(input_dir: String, backup_name: String) -> Result<Dirs, BackupError> {
    let base_dir = PathBuf::from_str(&input_dir)
        .map_err(|_| BackupError::InvalidPath(input_dir.clone()))?
        .join(backup_name);

    let file_dir = base_dir.join(BACKUP_FILE_DIR);

    let database_dir = base_dir.join(BACKUP_DATABASE_DIR);

    Ok(Dirs {
        file_dir,
        database_dir,
    })
}

fn copy_files(settings: &Settings, backup_file_dir: &PathBuf) -> Result<(), BackupError> {
    let restore_file_dir = get_base_dir(settings)?;
    // Wipe existing app_data (files folder) folder
    let _ = fs::remove_dir_all(&restore_file_dir);
    fs::create_dir_all(&restore_file_dir)
        .map_err(|e| BackupError::CannotCreateBackupFolder(e, restore_file_dir.clone()))?;

    for entry in fs::read_dir(backup_file_dir)
        .map_err(|e| BackupError::BackupFolderNotExist(e, backup_file_dir.clone()))?
    {
        let from_dir = entry?.path();

        let (Some(folder_name), true) = (from_dir.file_name(), from_dir.is_dir()) else {
            continue;
        };

        let to_dir = restore_file_dir.join(folder_name);

        copy_dir(&from_dir, &to_dir)
            .map_err(|e| BackupError::ProblemCopyingFolder(e, from_dir, to_dir))?;
    }

    Ok(())
}

fn restore_postgres_database(
    settings: &Settings,
    backup_database_dir: &PathBuf,
    pg_bin_dir_opt: Option<String>,
) -> Result<(), BackupError> {
    let pg_bin_dir = pg_bin_dir_opt.clone().unwrap_or_default();

    let command = PathBuf::from_str(&pg_bin_dir)
        .map_err(|_| BackupError::InvalidPath(pg_bin_dir.clone()))?
        .join("pg_restore");

    drop_and_create_database(settings)?;

    // Pg restore into database
    let result = Command::new(command.to_str().unwrap())
        .args([
            "--format",
            "d",
            "--dbname",
            &settings.database.connection_string(),
            backup_database_dir.to_str().unwrap(),
        ])
        .output()
        .map_err(|e| match (e.kind(), pg_bin_dir_opt.is_some()) {
            (io::ErrorKind::NotFound, true) => BackupError::PgCommandNotFoundInBinPath,
            (io::ErrorKind::NotFound, false) => BackupError::PgCommandNotFoundInPath,
            _ => e.into(),
        })?;

    if !result.status.success() {
        return Err(BackupError::CommandLineError(result));
    }

    Ok(())
}

// TODO this should already be provided by repository error
fn drop_and_create_database(settings: &Settings) -> Result<(), RepositoryError> {
    let database_settings = &settings.database;

    // Re-create database TODO this should use common method
    #[cfg(feature = "postgres")]
    let connection_string = &database_settings.connection_string_without_db();
    #[cfg(not(feature = "postgres"))]
    let connection_string = "unreachable";

    let mut connection = DBBackendConnection::establish(connection_string).unwrap();

    let database_name = &database_settings.database_name;
    diesel::sql_query(format!(r#"DROP DATABASE IF EXISTS "{database_name}""#))
        .execute(&mut connection)?;
    diesel::sql_query(format!(r#"CREATE DATABASE "{database_name}""#)).execute(&mut connection)?;

    Ok(())
}

fn copy_sqlite_files(
    settings: &Settings,
    backup_database_dir: &PathBuf,
) -> Result<(), BackupError> {
    // Remove database files
    let sqlite_files = get_sqlite_files_paths(settings)?;

    for sqlite_filename in sqlite_files {
        // Unwrap should be safe (would panic only if pathname terminates with '...')
        let sqlite_filename = sqlite_filename.file_name().unwrap();

        fs::remove_file(&sqlite_filename)?;
    }
    let database_name = &settings.database.database_name;

    // Move backup files
    for sqlite_filename in fs::read_dir(backup_database_dir)
        .map_err(|e| BackupError::BackupFolderNotExist(e, backup_database_dir.clone()))?
    {
        let from_file = sqlite_filename?.path();
        let extension = from_file
            .extension()
            .map(|e| e.to_str())
            .flatten()
            .ok_or(BackupError::InvalidSqliteFile(from_file.clone()))?;
        // Preserve database name
        fs::copy(&from_file, format!("{database_name}.{extension}"))?;
    }

    Ok(())
}

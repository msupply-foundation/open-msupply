use super::*;
use chrono::Utc;
use copy_dir::copy_dir;
use service::settings::{BackupSettings, Settings};
use std::{fs, io, path::PathBuf, process::Command, str::FromStr};

pub(crate) fn backup(settings: &Settings) -> Result<(), BackupError> {
    let Some(BackupSettings {
        backup_dir,
        pg_bin_dir,
    }) = settings.backup.clone()
    else {
        return Err(BackupError::BackupConfigurationMissing);
    };

    let Dirs {
        backup_name,
        file_dir,
        database_dir,
    } = create_backup_dir(backup_dir)?;

    copy_files(settings, &file_dir)?;

    // Backup database
    if cfg!(feature = "postgres") {
        dump_postgres_database(settings, &database_dir, pg_bin_dir)?;
    } else {
        copy_sqlite_files(settings, &database_dir)?;
    }

    println!("{backup_name}");
    Ok(())
}

struct Dirs {
    backup_name: String,
    file_dir: PathBuf,
    database_dir: PathBuf,
}

fn create_backup_dir(output_dir: String) -> Result<Dirs, BackupError> {
    let backup_name = Utc::now()
        .naive_local()
        .format("D%Y_%m_%dT%H_%M_%S")
        .to_string();

    let base_dir = PathBuf::from_str(&output_dir)
        .map_err(|_| BackupError::InvalidPath(output_dir.clone()))?
        .join(&backup_name);

    fs::create_dir_all(&base_dir)
        .map_err(|e| BackupError::CannotCreateBackupFolder(e, base_dir.clone()))?;

    let file_dir = base_dir.join(BACKUP_FILE_DIR);
    fs::create_dir_all(&file_dir)
        .map_err(|e| BackupError::CannotCreateBackupFolder(e, file_dir.clone()))?;

    let database_dir = base_dir.join(BACKUP_DATABASE_DIR);
    fs::create_dir_all(&database_dir)
        .map_err(|e| BackupError::CannotCreateBackupFolder(e, database_dir.clone()))?;

    Ok(Dirs {
        backup_name,
        file_dir,
        database_dir,
    })
}

fn copy_files(settings: &Settings, backup_file_dir: &PathBuf) -> Result<(), BackupError> {
    // TODO should only copy sync_files and plugins
    let file_dir = get_base_dir(settings)?;

    for entry in fs::read_dir(file_dir)? {
        let from_dir = entry?.path();

        let (Some(folder_name), true) = (from_dir.file_name(), from_dir.is_dir()) else {
            continue;
        };

        let to_dir = backup_file_dir.join(folder_name);
        copy_dir(&from_dir, &to_dir)
            .map_err(|e| BackupError::ProblemCopyingFolder(e, from_dir, to_dir))?;
    }

    Ok(())
}

fn dump_postgres_database(
    settings: &Settings,
    backup_database_dir: &PathBuf,
    pg_bin_dir_opt: Option<String>,
) -> Result<(), BackupError> {
    let pg_bin_dir = pg_bin_dir_opt.clone().unwrap_or_default();

    let command = PathBuf::from_str(&pg_bin_dir)
        .map_err(|_| BackupError::InvalidPath(pg_bin_dir.clone()))?
        .join("pg_dump");

    let result = Command::new(command.to_str().unwrap())
        .args([
            "--file",
            backup_database_dir.to_str().unwrap(),
            "--format",
            "d",
            "--dbname",
            &settings.database.connection_string(),
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

fn copy_sqlite_files(
    settings: &Settings,
    backup_database_dir: &PathBuf,
) -> Result<(), BackupError> {
    let sqlite_files: Vec<PathBuf> = fs::read_dir("./")?
        .into_iter()
        .filter_map(Result::ok)
        .map(|e| e.path())
        .filter(|f| {
            f.is_file()
                && f.file_stem().map(|s| s.to_str()).flatten()
                    == Some(settings.database.database_name.as_str())
        })
        .collect();

    if sqlite_files.is_empty() {
        return Err(BackupError::CannotFindSqliteBackup(
            settings.database.database_name.clone(),
        ));
    }

    for sqlite_filename in sqlite_files {
        // Unwrap should be safe (would panic only if pathname terminates with '...')
        let sqlite_filename = sqlite_filename.file_name().unwrap();

        fs::copy(&sqlite_filename, &backup_database_dir.join(sqlite_filename))?;
    }

    Ok(())
}

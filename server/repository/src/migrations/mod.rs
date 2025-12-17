pub mod constants;
mod types;
mod v1_00_04;
mod v1_01_01;
mod v1_01_02;
mod v1_01_03;
mod v1_01_05;
mod v1_01_11;
mod v1_01_12;
mod v1_01_13;
mod v1_01_14;
mod v1_01_15;
mod v1_02_00;
mod v1_02_01;
mod v1_03_00;
mod v1_04_00;
mod v1_05_00;
mod v1_05_04;
mod v1_06_00;
mod v1_07_00;
mod v2_00_00;
mod v2_01_00;
mod v2_02_00;
mod v2_02_01;
mod v2_02_02;
mod v2_03_00;
mod v2_03_01;
mod v2_04_00;
mod v2_04_01;
mod v2_05_00;
mod v2_06_00;
mod v2_06_01;
mod v2_06_02;
mod v2_06_03;
mod v2_07_00;
mod v2_07_04;
mod v2_08_00;
mod v2_08_03;
mod v2_09_00;
mod v2_09_01;
mod v2_09_02;
mod v2_10_00;
mod v2_10_01;
mod v2_11_00;
mod v2_11_02;
mod v2_12_00;
mod v2_13_00;
mod v2_13_01;
mod v2_14_00;
mod v2_15_00;
mod v2_16_00;
mod version;
mod views;

pub(crate) use self::types::*;
use self::v1_00_04::V1_00_04;
use self::v1_01_01::V1_01_01;
use self::v1_01_02::V1_01_02;
use self::v1_01_03::V1_01_03;

pub(crate) mod helpers;
mod templates;

pub use self::version::*;

use crate::{
    run_db_migrations, KeyType, KeyValueStoreRepository, MigrationFragmentLogRepository,
    RepositoryError, StorageConnection,
};
use chrono::{NaiveDateTime, Utc};
use diesel::connection::SimpleConnection;
use thiserror::Error;

pub(crate) trait Migration {
    fn version(&self) -> Version;
    // Will only run when database version < version
    fn migrate(&self, _: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }
    // Will run when database version <= migrate_fragments. And each fragment will run if it hasn't
    // yet run based on fragment identifiers (identifier can be changed to re-run migration, see README.md)
    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        Vec::new()
    }
}

pub(crate) trait MigrationFragment {
    fn identifier(&self) -> &'static str;
    fn migrate(&self, _: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }
}

#[derive(Debug, Error)]
pub enum MigrationError {
    #[error("The database you are connecting to is a later version ({0}) than the server ({1}). It is unsafe to run with this configuration, the server is stopping")]
    DatabaseVersionAboveAppVersion(Version, Version),
    #[error("Database version is pre release ({0}), it cannot be upgraded")]
    DatabaseVersionIsPreRelease(Version),
    #[error("Migration version ({0}) is higher then app version ({1}), consider increasing app version in root package.json")]
    MigrationAboveAppVersion(Version, Version),
    #[error("Problem dropping or re-creating views {0}")]
    DatabaseViewsError(anyhow::Error),
    #[error("Error during one time migration ({version})")]
    MigrationError {
        source: anyhow::Error,
        version: Version,
    },
    #[error("Error during fragment time migration ({version}) ({identifier})")]
    FragmentMigrationError {
        source: anyhow::Error,
        version: Version,
        identifier: &'static str,
    },
    #[error(transparent)]
    DatabaseError(#[from] RepositoryError),
}

pub fn migrate(
    connection: &StorageConnection,
    to_version: Option<Version>,
) -> Result<(Version, Vec<(String, NaiveDateTime)>), MigrationError> {
    let migrations: Vec<Box<dyn Migration>> = vec![
        Box::new(V1_00_04),
        Box::new(V1_01_01),
        Box::new(V1_01_02),
        Box::new(V1_01_03),
        Box::new(v1_01_05::V1_01_05),
        Box::new(v1_01_11::V1_01_11),
        Box::new(v1_01_12::V1_01_12),
        Box::new(v1_01_13::V1_01_13),
        Box::new(v1_01_14::V1_01_14),
        Box::new(v1_01_15::V1_01_15),
        Box::new(v1_02_00::V1_02_00),
        Box::new(v1_02_01::V1_02_01),
        Box::new(v1_03_00::V1_03_00),
        Box::new(v1_04_00::V1_04_00),
        Box::new(v1_05_00::V1_05_00),
        Box::new(v1_05_04::V1_05_04),
        Box::new(v1_06_00::V1_06_00),
        Box::new(v1_07_00::V1_07_00),
        Box::new(v2_00_00::V2_00_00),
        Box::new(v2_01_00::V2_01_00),
        Box::new(v2_02_00::V2_02_00),
        Box::new(v2_02_01::V2_02_01),
        Box::new(v2_02_02::V2_02_02),
        Box::new(v2_03_00::V2_03_00),
        Box::new(v2_03_01::V2_03_01),
        Box::new(v2_04_00::V2_04_00),
        Box::new(v2_04_01::V2_04_01),
        Box::new(v2_05_00::V2_05_00),
        Box::new(v2_06_00::V2_06_00),
        Box::new(v2_06_01::V2_06_01),
        Box::new(v2_06_02::V2_06_02),
        Box::new(v2_06_03::V2_06_03),
        Box::new(v2_07_00::V2_07_00),
        Box::new(v2_07_04::V2_07_04),
        Box::new(v2_08_00::V2_08_00),
        Box::new(v2_08_03::V2_08_03),
        Box::new(v2_09_00::V2_09_00),
        Box::new(v2_09_01::V2_09_01),
        Box::new(v2_09_02::V2_09_02),
        Box::new(v2_10_00::V2_10_00),
        Box::new(v2_10_01::V2_10_01),
        Box::new(v2_11_00::V2_11_00),
        Box::new(v2_11_02::V2_11_02),
        Box::new(v2_12_00::V2_12_00),
        Box::new(v2_13_00::V2_13_00),
        Box::new(v2_13_01::V2_13_01),
        Box::new(v2_14_00::V2_14_00),
        Box::new(v2_15_00::V2_15_00),
        Box::new(v2_16_00::V2_16_00),
    ];

    // Historic diesel migrations
    run_db_migrations(connection).unwrap();

    // Rust migrations
    let to_version = to_version.unwrap_or(Version::from_package_json());

    let starting_database_version = get_database_version(connection);

    // Get migration fragment log repository and create table if it doesn't exist
    create_migration_fragment_table(connection).map_err(|e| MigrationError::DatabaseError(e))?;
    let migration_fragment_log_repo = MigrationFragmentLogRepository::new(connection);

    // for `>` see PartialOrd implementation of Version
    if starting_database_version > to_version {
        return Err(MigrationError::DatabaseVersionAboveAppVersion(
            starting_database_version,
            to_version,
        ));
    }

    // From v2.3 we drop all views and re-create them
    let min_version_for_dropping_views = v2_03_00::V2_03_00.version();
    let mut drop_view_has_run = false;

    let mut migration_result = Vec::new();

    for migration in &migrations {
        let migration_version = migration.version();

        if migration_version > to_version {
            // During test, when we specify to_version manually, we want migrations
            // to stop at that version, even if there are migrations after specified to_version
            if cfg!(test) {
                break;
            }

            return Err(MigrationError::MigrationAboveAppVersion(
                migration_version,
                to_version,
            ));
        }

        let database_version = get_database_version(connection);

        // Drop view once during migrations, if next migration is 2.3.0 and above
        if !drop_view_has_run && migration_version >= min_version_for_dropping_views {
            drop_views(connection).map_err(|e| MigrationError::DatabaseViewsError(e))?;
            drop_view_has_run = true;
        }

        // TODO transaction ?

        // Run one time migrations only if we're on the last version, if we're in a test case checking an old creating migrations might fail
        if migration_version > database_version {
            migration
                .migrate(connection)
                .map_err(|source| MigrationError::MigrationError {
                    source,
                    version: migration_version.clone(),
                })?;

            migration_result.push((
                format!(
                    "Running one time database migration {}",
                    migration_version.to_string()
                ),
                Utc::now().naive_utc(),
            ));

            set_database_version(connection, &migration_version)
                .map_err(|e| MigrationError::DatabaseError(e))?;
        }

        // Run fragment migrations (can run on current version)
        if migration_version >= database_version {
            for fragment in migration.migrate_fragments() {
                if migration_fragment_log_repo
                    .has_run(migration, &fragment)
                    .map_err(|e| MigrationError::DatabaseError(e))?
                {
                    continue;
                }

                fragment.migrate(connection).map_err(|source| {
                    MigrationError::FragmentMigrationError {
                        source,
                        version: migration_version.clone(),
                        identifier: fragment.identifier(),
                    }
                })?;

                migration_fragment_log_repo
                    .insert(migration, &fragment)
                    .map_err(|e| MigrationError::DatabaseError(e))?;
            }
        }
    }

    migration_result.push((
        format!("Migrations finished to version {}", to_version.to_string()),
        Utc::now().naive_utc(),
    ));

    let final_database_version = get_database_version(connection);

    // Unwrap is safe here, because we know that the migration vec is not empty
    let last_version_in_migration_vec = migrations.last().unwrap().version();

    // Recreate views only if we've migrated to the latest version
    // Creating Views on an earlier version migration test might fail due to more recent views referencing schema elements that didn't previously exist
    // Note: When Migration tests run, views won't be available
    if final_database_version >= last_version_in_migration_vec && drop_view_has_run {
        rebuild_views(connection).map_err(|e| MigrationError::DatabaseViewsError(e))?;
    } else {
        log::warn!(
            "Not recreating views, database version is {final_database_version}, last version in migration vec is {last_version_in_migration_vec}"
        );
    }

    set_database_version(connection, &to_version).map_err(|e| MigrationError::DatabaseError(e))?;

    migration_result.push((
        format!("Views recreated for {}", to_version.to_string()),
        Utc::now().naive_utc(),
    ));

    Ok((to_version, migration_result))
}

fn get_database_version(connection: &StorageConnection) -> Version {
    match KeyValueStoreRepository::new(connection).get_string(KeyType::DatabaseVersion) {
        Ok(Some(version_str)) => Version::from_str(&version_str),
        // Rust migrations start at "1.0.3"
        // DatabaseVersion key is introduced in 1.0.4 and first app version to have manual rust migrations
        // is in 1.1.0 (there is an intentional gap between 1.0.4 and 1.1.0 to allow example migrations to be runnable and testable)
        _ => Version::from_str("1.0.3"),
    }
}

fn create_migration_fragment_table(connection: &StorageConnection) -> Result<(), RepositoryError> {
    // Migration fragment table is created in between 2.2 and 2.3 migrations
    // adding it here for easy transition
    sql!(
        connection,
        r#"
            CREATE TABLE IF NOT EXISTS migration_fragment_log (
                version_and_identifier TEXT NOT NULL PRIMARY KEY,
                datetime TIMESTAMP
            );
        "#
    )
    .map_err(|SqlError(_, e)| e)
}

fn set_database_version(
    connection: &StorageConnection,
    new_version: &Version,
) -> Result<(), RepositoryError> {
    KeyValueStoreRepository::new(connection)
        .set_string(KeyType::DatabaseVersion, Some(new_version.to_string()))
}

#[derive(Error, Debug)]
#[error("Sql error {0}")]
pub(crate) struct SqlError(String, #[source] RepositoryError);

/// Will try and execute diesel query return SQL error which contains debug version of SQL statements
#[cfg(test)] // uncomment this when used in queries outside of tests
pub(crate) fn execute_sql_with_error<Q>(
    connection: &StorageConnection,
    query: Q,
) -> Result<usize, SqlError>
where
    Q: diesel::query_dsl::methods::ExecuteDsl<crate::DBConnection>,
    Q: diesel::query_builder::QueryFragment<crate::DBType>,
{
    let debug_query = diesel::debug_query::<crate::DBType, _>(&query).to_string();
    Q::execute(query, connection.lock().connection())
        .map_err(|source| SqlError(debug_query, source.into()))
}

/// Will try and execute batch sql statements, return SQL error which contains sql being run
/// differs to execute_sql_with_error, accepts string query rather then diesel query and
/// allows for multiple statements to be executed
pub(crate) fn batch_execute_sql_with_error(
    connection: &StorageConnection,
    query: &str,
) -> Result<(), SqlError> {
    connection
        .lock()
        .connection()
        .batch_execute(query)
        .map_err(|source| SqlError(query.to_string(), source.into()))
}

/// Macro will create and run SQL query, it's a less verbose way of running SQL in migrations
/// allows batch execution
/// $($arg:tt)* is taken directly from format! macro
macro_rules! sql {
    ($connection:expr, $($arg:tt)*) => {{
        crate::migrations::batch_execute_sql_with_error($connection, &format!($($arg)*))
    }};
}

pub(crate) use sql;
use views::{drop_views, rebuild_views};

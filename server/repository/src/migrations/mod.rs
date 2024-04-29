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
mod version;

pub(crate) use self::types::*;
use self::v1_00_04::V1_00_04;
use self::v1_01_01::V1_01_01;
use self::v1_01_02::V1_01_02;
use self::v1_01_03::V1_01_03;

pub(crate) mod helpers;
mod templates;

pub use self::version::*;

use crate::{
    run_db_migrations, KeyValueStoreRepository, KeyValueType, RepositoryError, StorageConnection,
};
use diesel::connection::SimpleConnection;
use thiserror::Error;

pub(crate) trait Migration {
    fn version(&self) -> Version;
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
    #[error("Error during migration ({version})")]
    MigrationError {
        source: anyhow::Error,
        version: Version,
    },
    #[error(transparent)]
    DatabaseError(#[from] RepositoryError),
}

// TODO: logging
pub fn migrate(
    connection: &StorageConnection,
    to_version: Option<Version>,
) -> Result<Version, MigrationError> {
    let migrations: Vec<Box<dyn Migration>> = vec![
        Box::new(V1_00_04),
        #[cfg(test)]
        Box::new(templates::adding_table::V1_00_05),
        #[cfg(test)]
        Box::new(templates::data_migration::V1_00_06),
        #[cfg(test)]
        Box::new(templates::data_and_schema::V1_00_07),
        #[cfg(test)]
        Box::new(templates::add_data_from_sync_buffer::V1_00_08),
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
    ];

    // Historic diesel migrations
    run_db_migrations(connection).unwrap();

    // Rust migrations
    let to_version = to_version.unwrap_or(Version::from_package_json());

    let database_version = get_database_version(connection);

    // for `>` see PartialOrd implementation of Version
    if database_version > to_version {
        return Err(MigrationError::DatabaseVersionAboveAppVersion(
            database_version,
            to_version,
        ));
    }

    if database_version.is_pre_release() {
        return Err(MigrationError::DatabaseVersionIsPreRelease(
            database_version,
        ));
    }

    for migration in migrations {
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

        // TODO transaction ?

        if migration_version > database_version {
            log::info!("Running database migration {}", migration_version);
            migration
                .migrate(connection)
                .map_err(|source| MigrationError::MigrationError {
                    source,
                    version: migration_version.clone(),
                })?;
            set_database_version(connection, &migration_version)?;
        }
    }

    set_database_version(connection, &to_version)?;
    Ok(to_version)
}

fn get_database_version(connection: &StorageConnection) -> Version {
    match KeyValueStoreRepository::new(connection).get_string(KeyValueType::DatabaseVersion) {
        Ok(Some(version_str)) => Version::from_str(&version_str),
        // Rust migrations start at "1.0.3"
        // DatabaseVersion key is introduced in 1.0.4 and first app version to have manual rust migrations
        // is in 1.1.0 (there is an intentional gap between 1.0.4 and 1.1.0 to allow example migrations to be runnable and testable)
        _ => Version::from_str("1.0.3"),
    }
}

fn set_database_version(
    connection: &StorageConnection,
    new_version: &Version,
) -> Result<(), RepositoryError> {
    KeyValueStoreRepository::new(connection)
        .set_string(KeyValueType::DatabaseVersion, Some(new_version.to_string()))
}

#[derive(Error, Debug)]
#[error("Sql error {0}")]
pub(crate) struct SqlError(String, #[source] RepositoryError);

/// Will try and execute diesel query return SQL error which contains debug version of SQL statements
#[cfg(test)] // uncomment this when used in queries outside of tests
pub(crate) fn execute_sql_with_error<'a, Q>(
    connection: &StorageConnection,
    query: Q,
) -> Result<usize, SqlError>
where
    Q: diesel::query_dsl::methods::ExecuteDsl<crate::DBConnection>,
    Q: diesel::query_builder::QueryFragment<crate::DBType>,
{
    let debug_query = diesel::debug_query::<crate::DBType, _>(&query).to_string();
    Q::execute(query, &connection.connection).map_err(|source| SqlError(debug_query, source.into()))
}

/// Will try and execute batch sql statements, return SQL error which contains sql being run
/// differs to execute_sql_with_error, accepts string query rather then diesel query and
/// allows for multiple statements to be executed
pub(crate) fn batch_execute_sql_with_error(
    connection: &StorageConnection,
    query: &str,
) -> Result<(), SqlError> {
    connection
        .connection
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

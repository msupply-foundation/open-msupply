mod types;
mod v1_00_04;
mod version;
pub(crate) use self::types::*;
use self::v1_00_04::V1_00_04;

mod templates;

pub(crate) use self::version::*;

use crate::{
    run_db_migrations, DBConnection, DBType, KeyValueStoreRepository, KeyValueType,
    RepositoryError, StorageConnection,
};
use diesel::{query_builder::QueryFragment, query_dsl::methods, sql_query, RunQueryDsl};
use thiserror::Error;

pub(crate) trait Migration {
    fn version(&self) -> Version;
    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()>;
}

#[derive(Debug, Error)]
pub enum MigrationError {
    #[error("The database you are connecting to is a later version ({0}) than the server ({1}). It is unsafe to run with this configuration, the server is stopping")]
    DatabaseVersionAboveAppVersion(Version, Version),
    #[error("Database version is pre release ({0}), it cannot be upgraded")]
    DatabaseVersionIsPreRelease(Version),
    #[error("Migration version ({0}) is higher then app version ({1})")]
    MigrationAboveAppVersion(Version, Version),
    #[error("Error during migration ({version})")]
    MigrationError {
        source: anyhow::Error,
        version: Version,
    },
    #[error(transparent)]
    DatabaseError(#[from] RepositoryError),
}

// TODO logging
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
pub(crate) fn execute_sql_with_error<'a, Q>(
    connection: &StorageConnection,
    query: Q,
) -> Result<usize, SqlError>
where
    Q: methods::ExecuteDsl<DBConnection>,
    Q: QueryFragment<DBType>,
{
    let debug_query = diesel::debug_query::<DBType, _>(&query).to_string();
    Q::execute(query, &connection.connection).map_err(|source| SqlError(debug_query, source.into()))
}

/// Macro will create and run SQL query, it's a less verbose way of running SQL in migrations
macro_rules! sql {
    ($connection:expr, $($arg:tt)*) => {{
        let query = diesel::sql_query(&format!($($arg)*));
        crate::migrations::execute_sql_with_error($connection, query)
    }};
}

pub(crate) use sql;

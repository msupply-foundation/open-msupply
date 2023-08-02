#[cfg(not(feature = "postgres"))]
pub(crate) mod sqlite;
#[cfg(not(feature = "postgres"))]
pub use self::sqlite::*;

#[cfg(feature = "postgres")]
mod postgres;
#[cfg(feature = "postgres")]
pub use self::postgres::*;

mod constants;

use crate::{
    database_settings::DatabaseSettings,
    migrations::Version,
    mock::{insert_extra_mock_data, MockData, MockDataCollection, MockDataInserts},
    StorageConnection, StorageConnectionManager,
};

/// Generic setup method to help setup test environment
/// - sets up database (create one and initialises schema), drops existing database
/// - creates connection
/// - inserts mock data
pub async fn setup_all(
    db_name: &str,
    inserts: MockDataInserts,
) -> (
    MockDataCollection,
    StorageConnection,
    StorageConnectionManager,
    DatabaseSettings,
) {
    let result = setup_test(SetupOption {
        db_name,
        inserts,
        ..Default::default()
    })
    .await;
    (
        result.core_data,
        result.connection,
        result.connection_manager,
        result.db_settings,
    )
}

pub async fn setup_all_with_data(
    db_name: &str,
    inserts: MockDataInserts,
    extra_mock_data: MockData,
) -> (
    MockDataCollection,
    StorageConnection,
    StorageConnectionManager,
    DatabaseSettings,
) {
    let result = setup_test(SetupOption {
        db_name,
        inserts,
        extra_mock_data,
        ..Default::default()
    })
    .await;
    (
        result.core_data,
        result.connection,
        result.connection_manager,
        result.db_settings,
    )
}

#[derive(Default)]
pub struct SetupOption<'a> {
    pub db_name: &'a str,
    pub version: Option<Version>,
    pub inserts: MockDataInserts,
    pub extra_mock_data: MockData,
}

pub struct SetupResult {
    pub core_data: MockDataCollection,
    pub connection: StorageConnection,
    pub connection_manager: StorageConnectionManager,
    pub db_settings: DatabaseSettings,
}

// Object/Struct input/output allow adding new setup parameters without mass
// refactor
pub async fn setup_test<'a>(
    SetupOption {
        db_name,
        version,
        inserts,
        extra_mock_data,
    }: SetupOption<'a>,
) -> SetupResult {
    let db_settings = get_test_db_settings(db_name);
    let (connection_manager, core_data) = setup_with_version(&db_settings, version, inserts).await;
    let connection = connection_manager.connection().unwrap();

    insert_extra_mock_data(&connection, extra_mock_data);
    SetupResult {
        core_data,
        connection,
        connection_manager,
        db_settings,
    }
}

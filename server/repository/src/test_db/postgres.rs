use std::path::PathBuf;
use std::str::FromStr;
use std::{fs, sync::Mutex};

use diesel::prelude::*;
use diesel::r2d2::{ConnectionManager, Pool};
use diesel::{PgConnection, RunQueryDsl};

use crate::{
    database_settings::DatabaseSettings,
    get_storage_connection_manager,
    migrations::{migrate, Version},
    mock::{all_mock_data, insert_all_mock_data, MockDataCollection, MockDataInserts},
    test_db::constants::{TEMPLATE_MARKER_FILE, TEST_OUTPUT_DIR},
    DBConnection, StorageConnectionManager,
};

pub fn get_test_db_settings(db_name: &str) -> DatabaseSettings {
    DatabaseSettings {
        username: "postgres".to_string(),
        password: "password".to_string(),
        port: 5432,
        host: "localhost".to_string(),
        database_name: db_name.to_string(),
        init_sql: None,
        database_path: None,
    }
}

static TEMPLATE_LOCK: Mutex<()> = Mutex::new(());

fn create_template_db(
    root_connection: &mut DBConnection,
    db_settings: &DatabaseSettings,
    version: Option<Version>,
) -> StorageConnectionManager {
    diesel::sql_query(format!(
        "DROP DATABASE IF EXISTS \"{}\";",
        &db_settings.database_name
    ))
    .execute(root_connection)
    .unwrap();

    diesel::sql_query(format!(
        "CREATE DATABASE \"{}\";",
        &db_settings.database_name
    ))
    .execute(root_connection)
    .unwrap();

    // migrate the DB:
    let connection_manager = get_storage_connection_manager(&db_settings);
    let connection = connection_manager.connection().unwrap();
    migrate(&connection, version).unwrap();

    connection_manager
}

fn find_workspace_root() -> PathBuf {
    let mut path = PathBuf::from_str(env!("CARGO_MANIFEST_DIR")).unwrap();
    while let Some(current) = path.parent() {
        path = current.to_path_buf();
        if path.join("Cargo.lock").exists() {
            return path;
        }
    }
    panic!("workspace root not found!");
}

table! {
    pg_database (oid) {
        oid -> BigInt,
        datname -> Text,
    }
}

#[derive(QueryableByName)]
#[diesel(table_name = pg_database)]
struct PgDatabaseRow {
    #[allow(dead_code)]
    oid: i64,
    #[allow(dead_code)]
    datname: String,
}

pub async fn setup(db_settings: &DatabaseSettings) -> StorageConnectionManager {
    setup_with_version(db_settings, None, MockDataInserts::none())
        .await
        .0
}

pub(crate) async fn setup_with_version(
    db_settings: &DatabaseSettings,
    version: Option<Version>,
    inserts: MockDataInserts,
) -> (StorageConnectionManager, MockDataCollection) {
    // cache db template
    let cache_all_mock_data = inserts == MockDataInserts::all();
    let template_name = if cache_all_mock_data {
        format!(
            "___template_{}_full_mock",
            version.as_ref().unwrap_or(&Version::from_package_json())
        )
    } else {
        format!(
            "___template_{}",
            version.as_ref().unwrap_or(&Version::from_package_json())
        )
    };

    let connection_manager =
        ConnectionManager::<PgConnection>::new(&db_settings.connection_string_without_db());
    let pool = Pool::new(connection_manager).expect("Failed to connect to database");
    // connection to no specific table
    let mut root_connection = pool.get().expect("Failed to open connection");

    // check if we need to refresh the cache
    let template_settings = get_test_db_settings(&template_name);
    {
        let _guard = TEMPLATE_LOCK.lock().unwrap();

        let existing_templates: Vec<String> = pg_database::table
            .select(pg_database::dsl::datname)
            .filter(pg_database::dsl::datname.ilike("___template_%"))
            .load(&mut root_connection)
            .unwrap();

        // only clear the DB once, i.e. use the repository test_output directory as reference
        let test_output_dir = find_workspace_root()
            .join("repository")
            .join(TEST_OUTPUT_DIR);
        let marker_path = test_output_dir.join(TEMPLATE_MARKER_FILE).to_path_buf();
        let marker_exists = marker_path.exists();

        // if test_output_dir doesn't exist or if the marker exist, refresh the cache
        let template_dbs = if !test_output_dir.exists() || marker_exists {
            // create the directory so that we don't recreate the cache on the next run
            fs::create_dir_all(&test_output_dir).unwrap();

            for template in existing_templates {
                diesel::sql_query(format!("DROP DATABASE IF EXISTS \"{}\";", &template))
                    .execute(&mut root_connection)
                    .unwrap();
            }

            // remove marker
            if marker_exists {
                fs::remove_file(&marker_path).unwrap();
            }
            vec![]
        } else {
            existing_templates
        };
        // create template
        if !template_dbs.contains(&template_settings.database_name) {
            let connection_manager =
                create_template_db(&mut root_connection, &template_settings, version.clone());
            let connection = connection_manager.connection().unwrap();
            if cache_all_mock_data {
                insert_all_mock_data(&connection, inserts.clone()).await;
            }
        }
    }

    // copy template

    // remove existing db
    diesel::sql_query(format!(
        "DROP DATABASE IF EXISTS \"{}\";",
        &db_settings.database_name
    ))
    .execute(&mut root_connection)
    .unwrap();
    diesel::sql_query(format!(
        "CREATE DATABASE \"{}\" WITH TEMPLATE \"{}\";",
        db_settings.database_name, template_settings.database_name
    ))
    .execute(&mut root_connection)
    .unwrap();

    let connection_manager = get_storage_connection_manager(db_settings);
    let collection = if !cache_all_mock_data {
        let connection = connection_manager.connection().unwrap();
        insert_all_mock_data(&connection, inserts).await
    } else {
        all_mock_data()
    };
    (connection_manager, collection)
}

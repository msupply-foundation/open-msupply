mod create_indexes;
mod delete_self_referencing_name_store_joins;
#[cfg(not(feature = "postgres"))]
mod remove_sqlite_check;
mod split_inventory_adjustment;

use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

pub(crate) struct V1_01_01;

impl Migration for V1_01_01 {
    fn version(&self) -> Version {
        Version::from_str("1.1.1")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            #[cfg(not(feature = "postgres"))]
            Box::new(remove_sqlite_check::Migrate),
            Box::new(split_inventory_adjustment::Migrate),
            Box::new(create_indexes::Migrate),
            Box::new(delete_self_referencing_name_store_joins::Migrate),
        ]
    }
}

#[cfg(test)]
async fn setup_data_migration(name: &str) -> StorageConnection {
    use crate::{
        migrations::{sql, templates::add_data_from_sync_buffer::V1_00_08},
        test_db::*,
    };

    // Migrate to version - 1
    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: name,
        version: Some(V1_00_08.version()),
        ..Default::default()
    })
    .await;
    // Common data
    sql!(
        &connection,
        r#"
        INSERT INTO name 
        (id, type, is_customer, is_supplier, code, name) 
        VALUES 
        ('name_id', 'STORE', false, false, '', '');
    "#
    )
    .unwrap();

    sql!(
        &connection,
        r#"
        INSERT INTO store 
        (id, name_id, site_id, code) 
        VALUES 
        ('store_id', 'name_id', 1, '');
    "#
    )
    .unwrap();
    connection
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_01_01() {
    use crate::migrations::*;
    use crate::test_db::*;

    let version = V1_01_01.version();

    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&connection), version);
}

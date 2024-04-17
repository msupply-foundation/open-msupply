mod create_indexes;
#[cfg(not(feature = "postgres"))]
mod remove_sqlite_check;
mod split_inventory_adjustment;

use super::{sql, version::Version, Migration};
use crate::StorageConnection;

pub(crate) struct V1_01_01;

impl Migration for V1_01_01 {
    fn version(&self) -> Version {
        Version::from_str("1.1.1")
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        #[cfg(not(feature = "postgres"))]
        remove_sqlite_check::migrate(connection)?;

        split_inventory_adjustment::migrate(connection)?;

        create_indexes::migrate(connection)?;

        // Remove self-referencing name_store_joins
        sql!(
            connection,
            r#"DELETE
                FROM name_store_join 
                WHERE name_store_join.name_id IN (SELECT name_id FROM store WHERE store.id = name_store_join.store_id);"#
        )?;

        Ok(())
    }
}

#[cfg(test)]
async fn setup_data_migration(name: &str) -> StorageConnection {
    use crate::{migrations::templates::add_data_from_sync_buffer::V1_00_08, test_db::*};

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

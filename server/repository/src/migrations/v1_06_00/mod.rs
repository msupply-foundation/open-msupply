use super::{version::Version, Migration};

use crate::StorageConnection;

mod contact_trace;
mod item_line_add_item_link_id;
mod item_link_create_table;
mod master_list;
mod plugin_data;
mod temperature_breach;

pub(crate) struct V1_06_00;

impl Migration for V1_06_00 {
    fn version(&self) -> Version {
        Version::from_str("1.6.0")
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        contact_trace::migrate(connection)?;
        plugin_data::migrate(connection)?;
        master_list::migrate(connection)?;
        temperature_breach::migrate(connection)?;
        item_link_create_table::migrate(connection)?;
        item_line_add_item_link_id::migrate(connection)?;
        Ok(())
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_06_00() {
    use crate::migrations::*;
    use crate::test_db::*;

    let previous_version = v1_05_00::V1_05_00.version();
    let version = V1_06_00.version();

    // This test allows checking sql syntax
    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(previous_version.clone()),
        ..Default::default()
    })
    .await;

    sql!(
        &connection,
        r#"
        INSERT INTO item 
        (id, name, code, default_pack_size, type, legacy_record)
        VALUES 
        ('item1', 'item1name', 'item1code', 1, 'STOCK', ''),
        ('item2', 'item2name', 'item2code', 2, 'STOCK', ''),
        ('item3', 'item3name', 'item3code', 3, 'STOCK', ''),
        ('item4', 'item4name', 'item4code', 4, 'STOCK', '');
    "#
    )
    .unwrap();
    sql!(
        &connection,
        r#"
        INSERT INTO
        name (id, name, code, is_customer, is_supplier, type, is_sync_update)
      VALUES
        ('name1', 'name1name', 'name1code', TRUE, FALSE, 'STORE', TRUE),
        ('name2', 'name2name', 'name2code', TRUE, FALSE, 'STORE', TRUE),
        ('name3', 'name3name', 'name3code', TRUE, FALSE, 'STORE', TRUE);

    "#
    )
    .unwrap();
    sql!(
        &connection,
        r#"
        INSERT INTO
        store (id, name_id, code, site_id, store_mode, 'disabled')
      VALUES
        ('store1', 'name1', 'store1code', 1, 'STORE', FALSE),
        ('store2', 'name2', 'store2code', 1, 'STORE', FALSE),
        ('store3', 'name3', 'store3code', 1, 'STORE', FALSE);
    "#
    )
    .unwrap();

    sql!(
        &connection,
        r#"
        INSERT INTO
        stock_line (
          id,
          item_id,
          store_id,
          cost_price_per_pack,
          sell_price_per_pack,
          available_number_of_packs,
          total_number_of_packs,
          pack_size,
          on_hold
        )
      VALUES
        ('stock_line1', 'item1', 'store1', 1.0, 1.0, 1.0, 1.0, 1.0, FALSE),
        ('stock_line2', 'item1', 'store1', 2.0, 2.0, 2.0, 2.0, 2.0, FALSE),
        ('stock_line3', 'item2', 'store1', 4.0, 4.0, 4.0, 4.0, 4.0, FALSE),
        ('stock_line4', 'item3', 'store2', 8.0, 8.0, 8.0, 8.0, 8.0, FALSE);
    "#
    )
    .unwrap();

    migrate(&connection, Some(version.clone())).unwrap();

    assert_eq!(get_database_version(&connection), version);
}

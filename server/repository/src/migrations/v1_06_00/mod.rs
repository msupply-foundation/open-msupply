use super::{version::Version, Migration};

use crate::StorageConnection;

mod contact_trace;
mod item_link_create_table;
mod master_list;
mod master_list_line_add_item_link_id;
mod plugin_data;
mod stock_line_add_item_link_id;
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
        stock_line_add_item_link_id::migrate(connection)?;
        master_list_line_add_item_link_id::migrate(connection)?;
        Ok(())
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_06_00() {
    use crate::migrations::*;
    use crate::test_db::*;
    use diesel::prelude::*;
    use item_link::dsl as item_link_dsl;
    use stock_on_hand::dsl as soh_dsl;

    table! {
        item_link {
            id->Text,
            item_id->Text,
        }
    }
    #[derive(Queryable, Debug, PartialEq)]
    struct ItemLinkRow {
        id: String,
        item_id: String,
    }

    table! {
        stock_on_hand(id) {
            id -> Text,
            item_id -> Text,
            store_id -> Text,
            available_stock_on_hand -> BigInt,
        }
    }

    #[derive(Queryable, Debug, PartialEq)]
    struct StockOnHandRow {
        id: String,
        item_id: String,
        store_id: String,
        available_stock_on_hand: i64,
    }

    let previous_version = v1_05_00::V1_05_00.version();
    let version = V1_06_00.version();

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

    let old_soh: Vec<StockOnHandRow> = soh_dsl::stock_on_hand
        .order(soh_dsl::id.asc())
        .load(&connection.connection)
        .unwrap();

    migrate(&connection, Some(version.clone())).unwrap();

    let new_soh: Vec<StockOnHandRow> = soh_dsl::stock_on_hand
        .order(soh_dsl::id.asc())
        .load(&connection.connection)
        .unwrap();
    assert_eq!(old_soh, new_soh);

    assert_eq!(get_database_version(&connection), version);

    let expected_item_links = vec![
        ItemLinkRow {
            id: "item1".to_string(),
            item_id: "item1".to_string(),
        },
        ItemLinkRow {
            id: "item2".to_string(),
            item_id: "item2".to_string(),
        },
        ItemLinkRow {
            id: "item3".to_string(),
            item_id: "item3".to_string(),
        },
        ItemLinkRow {
            id: "item4".to_string(),
            item_id: "item4".to_string(),
        },
    ];

    let migration_item_links: Vec<ItemLinkRow> = item_link_dsl::item_link
        .order(item_link_dsl::id)
        .load(&connection.connection)
        .unwrap();

    assert_eq!(expected_item_links, migration_item_links);
}

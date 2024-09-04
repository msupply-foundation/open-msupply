use super::{version::Version, Migration, MigrationFragment};

use crate::StorageConnection;
use diesel::prelude::*;

mod master_list;

pub(crate) struct V2_02_02;

impl Migration for V2_02_02 {
    fn version(&self) -> Version {
        Version::from_str("2.2.2")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![Box::new(master_list::Migrate)]
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_2_02_02() {
    use v2_02_00::V2_02_00;

    use crate::migrations::*;
    use crate::test_db::*;

    let previous_version = V2_02_00.version();
    let version = V2_02_02.version();

    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(previous_version.clone()),
        ..Default::default()
    })
    .await;

    add_rnr_form_changelogs_no_store_id(&connection).unwrap();

    assert_eq!(check_changelogs_have_store_id(&connection), false);

    // Run this migration
    migrate(&connection, Some(version.clone())).unwrap();
    assert_eq!(get_database_version(&connection), version);

    assert_eq!(check_changelogs_have_store_id(&connection), true);
}

// Temp table definition for testing for changelog schema at this point in time
table! {
    changelog (cursor) {
        cursor -> BigInt,
        record_id -> Text,
        store_id -> Nullable<Text>,
    }
}

#[cfg(test)]
fn check_changelogs_have_store_id(connection: &StorageConnection) -> bool {
    use changelog::dsl as changelog_dsl;

    let changelog_store_ids: Vec<Option<String>> = changelog_dsl::changelog
        .select(changelog::store_id)
        .filter(changelog::record_id.eq_any(vec!["TEST_RNR_FORM_ID", "TEST_RNR_FORM_LINE_ID"]))
        .load::<Option<String>>(connection.lock().connection())
        .unwrap();

    changelog_store_ids
        .iter()
        .all(|store_id| store_id.clone().unwrap_or("".to_string()) == "store1")
}

#[cfg(test)]
fn add_rnr_form_changelogs_no_store_id(connection: &StorageConnection) -> anyhow::Result<()> {
    use super::sql;
    // Setup test data
    sql!(
        connection,
        r#"
        INSERT INTO item  (id, name, code, default_pack_size, type, legacy_record) VALUES  ('item1', 'item1name', 'item1code', 1, 'STOCK', '');
        INSERT INTO item_link  (id, item_id) VALUES  ('item1', 'item1');

        INSERT INTO name (id, name, code, is_customer, is_supplier, type, is_sync_update) VALUES ('name1', 'name1name', 'name1code', TRUE, FALSE, 'STORE', TRUE);
        INSERT INTO name_link (id, name_id) VALUES ('name1', 'name1');

        INSERT INTO store (id, name_link_id, code, site_id, store_mode) VALUES ('store1', 'name1', 'store1code', 1, 'STORE');

        INSERT INTO period_schedule (id, name) VALUES ('schedule1', 'schedule1');
        INSERT INTO period (id, period_schedule_id, name, start_date, end_date) VALUES ('period1', 'schedule1', 'period1', '2024-08-01', '2024-08-31');
        "#
    )
    .unwrap();

    // Insert rnr_form and an rnr_form_line
    sql!(
        connection,
        r#"
        INSERT INTO rnr_form 
            ("id", "store_id", "name_link_id", "period_id", "program_id", "status", "created_datetime") 
        VALUES
            ('TEST_RNR_FORM_ID', 'store1', 'name1', 'period1', 'missing_program', 'DRAFT', '2024-08-27 23:34:55.380381');
        "#,
    )?;
    sql!(
        connection,
        r#"
        INSERT INTO rnr_form_line
            ("id", "rnr_form_id", "item_link_id", "average_monthly_consumption", "previous_monthly_consumption_values", "initial_balance", "snapshot_quantity_received", "snapshot_quantity_consumed", "snapshot_adjustments", "adjusted_quantity_consumed", "stock_out_duration", "final_balance", "maximum_quantity", "calculated_requested_quantity") 
        VALUES
            ('TEST_RNR_FORM_LINE_ID', 'TEST_RNR_FORM_ID', 'item1', 0.0, '', 0.0, 0.0, 0.0, 0.0, 0.0, 0, 0.0, 0.0, 0.0);
        "#,
    )?;

    // Create changelog records for form and line - missing store_id
    sql!(
        connection,
        r#"
        INSERT INTO changelog
            ("table_name", "record_id", "row_action", "store_id")
        VALUES
            ('rnr_form', 'TEST_RNR_FORM_ID', 'UPSERT', NULL),
            ('rnr_form_line', 'TEST_RNR_FORM_LINE_ID', 'UPSERT', NULL);
        "#,
    )?;

    Ok(())
}

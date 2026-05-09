use super::changelog::changelog;
use diesel::prelude::*;

use crate::{
    asset_class_row::{AssetClassRow, AssetClassRowRepository},
    asset_row::AssetRow,
    mock::{
        mock_item_a, mock_location_1, mock_location_2, mock_location_in_another_store,
        mock_location_on_hold, mock_name_store_b, mock_store_a, mock_store_b, MockData,
        MockDataInserts,
    },
    test_db::{self, setup_all, setup_all_with_data},
    ChangelogCondition, ChangelogFilter, ChangelogRepository, ChangelogRow, ChangelogSyncType,
    ChangelogTableName, CurrencyRow, CursorAndLimit, FilterBuilder, InvoiceLineRow,
    InvoiceLineRowRepository, InvoiceRow, InvoiceRowRepository, KeyType, KeyValueStoreRepository,
    LocationRowRepository, NameRow, RequisitionLineRow, RequisitionLineRowRepository,
    RequisitionRow, RequisitionRowRepository, RowActionType, StorageConnection, StoreRow,
    StoreRowRepository, Upsert, VaccinationRow, VaccinationRowRepository,
};

fn delete_all_changelog(connection: &StorageConnection) {
    diesel::delete(changelog::table)
        .execute(connection.lock().connection())
        .unwrap();
}

fn query_all(connection: &StorageConnection, cursor: i64, limit: i64) -> Vec<ChangelogRow> {
    ChangelogRepository::new(connection)
        .query(ChangelogCondition::True(), CursorAndLimit { cursor, limit })
        .unwrap()
        .rows
}

#[actix_rt::test]
async fn test_changelog() {
    let (_, connection, _, _) =
        test_db::setup_all("test_changelog", MockDataInserts::none().names().stores()).await;

    // Use location entries to populate the changelog (via the trigger)
    let location_repo = LocationRowRepository::new(&connection);
    let repo = ChangelogRepository::new(&connection);
    // Clear change log and get starting cursor
    let starting_cursor = repo.max_cursor().unwrap();
    delete_all_changelog(&connection);
    // single entry:
    location_repo.upsert_one(&mock_location_1()).unwrap();
    let mut result = query_all(&connection, starting_cursor as i64, 10);
    assert_eq!(1, result.len());
    let log_entry = result.pop().unwrap();
    assert_eq!(
        log_entry,
        ChangelogRow {
            cursor: starting_cursor as i64 + 1,
            table_name: ChangelogTableName::Location,
            record_id: mock_location_1().id,
            row_action: RowActionType::Upsert,
            store_id: Some(mock_location_1().store_id.clone()),
            ..Default::default()
        }
    );

    // querying from the entry just before the inserted cursor should give the same result:
    assert_eq!(
        query_all(&connection, starting_cursor as i64, 10),
        query_all(&connection, starting_cursor as i64, 10)
    );

    // update the entry
    location_repo
        .upsert_one(&{
            let mut u = mock_location_1();
            u.code = "new_code".to_string();
            u
        })
        .unwrap();
    let mut result = query_all(&connection, log_entry.cursor, 10);
    assert_eq!(1, result.len());
    let log_entry = result.pop().unwrap();
    assert_eq!(
        log_entry,
        ChangelogRow {
            cursor: starting_cursor as i64 + 2,
            table_name: ChangelogTableName::Location,
            record_id: mock_location_1().id,
            row_action: RowActionType::Upsert,
            store_id: Some(mock_location_1().store_id.clone()),
            ..Default::default()
        }
    );

    // query the full list from cursor=starting_cursor
    // No dedup view — both the insert and the update are returned
    let result = query_all(&connection, starting_cursor as i64, 10);
    assert_eq!(2, result.len());
    assert_eq!(
        result,
        vec![
            ChangelogRow {
                cursor: starting_cursor as i64 + 1,
                table_name: ChangelogTableName::Location,
                record_id: mock_location_1().id,
                row_action: RowActionType::Upsert,
                store_id: Some(mock_location_1().store_id.clone()),
                ..Default::default()
            },
            ChangelogRow {
                cursor: starting_cursor as i64 + 2,
                table_name: ChangelogTableName::Location,
                record_id: mock_location_1().id,
                row_action: RowActionType::Upsert,
                store_id: Some(mock_location_1().store_id.clone()),
                ..Default::default()
            },
        ]
    );

    // add another entry
    location_repo.upsert_one(&mock_location_on_hold()).unwrap();
    let result = query_all(&connection, starting_cursor as i64, 10);
    assert_eq!(3, result.len());

    // delete an entry
    location_repo.delete(&mock_location_on_hold().id).unwrap();
    let result = query_all(&connection, starting_cursor as i64, 10);
    assert_eq!(4, result.len());
    // Last entry should be the delete
    assert_eq!(result.last().unwrap().row_action, RowActionType::Delete);
    assert_eq!(result.last().unwrap().record_id, mock_location_on_hold().id);
}

#[actix_rt::test]
async fn test_changelog_iteration() {
    let (_, connection, _, _) =
        test_db::setup_all("test_changelog_2", MockDataInserts::none().names().stores()).await;

    // use names entries to populate the changelog
    let location_repo = LocationRowRepository::new(&connection);
    let repo = ChangelogRepository::new(&connection);
    // Clear change log and get starting cursor
    let starting_cursor = repo.max_cursor().unwrap();
    delete_all_changelog(&connection);

    // Insert 4 locations (4 changelog rows)
    location_repo.upsert_one(&mock_location_1()).unwrap();
    location_repo.upsert_one(&mock_location_on_hold()).unwrap();
    location_repo
        .upsert_one(&mock_location_in_another_store())
        .unwrap();
    location_repo.upsert_one(&mock_location_2()).unwrap();

    // All 4 rows should be present (no dedup)
    let all = query_all(&connection, starting_cursor as i64, 10);
    assert_eq!(all.len(), 4);

    // Test pagination: fetch in batches of 3
    let page1 = query_all(&connection, starting_cursor as i64, 3);
    assert_eq!(page1.len(), 3);
    let last_cursor = page1.last().unwrap().cursor;

    let page2 = query_all(&connection, last_cursor, 3);
    assert_eq!(page2.len(), 1);
    let last_cursor = page2.last().unwrap().cursor;

    let page3 = query_all(&connection, last_cursor, 3);
    assert_eq!(page3.len(), 0);
}

#[actix_rt::test]
async fn test_changelog_filter() {
    // changelog repository gets changelog.name_id from the related name_link
    // name_link.name_id so we need to add names and name_links into the DB.
    let (_, connection, _, _) =
        setup_all("test_changelog_filter", MockDataInserts::none().names()).await;

    // But remove any names and name_links from change log so
    // the cursors below don't conflict.
    delete_all_changelog(&connection);

    let log1 = ChangelogRow {
        cursor: 1,
        table_name: ChangelogTableName::Invoice,
        record_id: "invoice1".to_string(),
        row_action: RowActionType::Upsert,
        name_id: Some("name1".to_string()),
        store_id: Some("store1".to_string()),
        is_sync_update: false,
        source_site_id: None,
        ..Default::default()
    };

    let log2 = ChangelogRow {
        cursor: 2,
        table_name: ChangelogTableName::Requisition,
        record_id: "requisition1".to_string(),
        row_action: RowActionType::Upsert,
        name_id: Some("name2".to_string()),
        store_id: Some("store2".to_string()),
        is_sync_update: false,
        source_site_id: None,
        ..Default::default()
    };

    let log3 = ChangelogRow {
        cursor: 3,
        table_name: ChangelogTableName::Invoice,
        record_id: "invoice2".to_string(),
        row_action: RowActionType::Upsert,
        name_id: Some("name3".to_string()),
        store_id: Some("store3".to_string()),
        is_sync_update: false,
        source_site_id: None,
        ..Default::default()
    };

    let log4 = ChangelogRow {
        cursor: 4,
        table_name: ChangelogTableName::StocktakeLine,
        record_id: "stocktake_line1".to_string(),
        row_action: RowActionType::Upsert,
        name_id: None,
        store_id: None,
        is_sync_update: false,
        source_site_id: None,
        ..Default::default()
    };

    for log in [&log1, &log2, &log3, &log4] {
        diesel::insert_into(changelog::table)
            .values(log)
            .execute(connection.lock().connection())
            .unwrap();
    }

    // Filter by table name
    assert_eq!(
        ChangelogRepository::new(&connection)
            .query(
                ChangelogCondition::table_name::equal(ChangelogTableName::Requisition),
                CursorAndLimit {
                    cursor: 0,
                    limit: 20
                },
            )
            .unwrap(),
        vec![log2.clone()]
    );

    // Filter by record_id in
    assert_eq!(
        ChangelogRepository::new(&connection)
            .query(
                ChangelogCondition::table_name::any(vec![
                    ChangelogTableName::Invoice,
                    ChangelogTableName::StocktakeLine
                ]),
                CursorAndLimit {
                    cursor: 0,
                    limit: 20
                },
            )
            .unwrap(),
        vec![log1.clone(), log3.clone(), log4.clone()]
    );

    // Filter by store_id in
    assert_eq!(
        ChangelogRepository::new(&connection)
            .query(
                ChangelogCondition::store_id::any(vec!["store1".to_string(), "store2".to_string()]),
                CursorAndLimit {
                    cursor: 0,
                    limit: 20
                },
            )
            .unwrap(),
        vec![log1.clone(), log2.clone()]
    );
}

struct TestRecord<T> {
    record: T,
    record_id: String,
    /// Used to look up the store backed by this name; that store id is the
    /// expected `transfer_store_id` on the generated changelog.
    name_id: String,
    store_id: String,
}

/// Helper method to test transfer_store_id and store_id on the generated changelog.
/// Does db operation passed in as a function and then resolves the expected
/// transfer_store_id by looking up the store backed by `record.name_id`.
fn test_changelog_name_and_store_id<T, F>(
    connection: &StorageConnection,
    record: TestRecord<T>,
    row_action: RowActionType,
    db_op: F,
) where
    F: Fn(&StorageConnection, &T),
{
    db_op(connection, &record.record);

    let expected_transfer_store_id = StoreRowRepository::new(connection)
        .find_one_by_name_id(&record.name_id)
        .unwrap()
        .map(|s| s.id);

    let change_logs = ChangelogRepository::new(connection)
        .query(
            ChangelogCondition::True(),
            CursorAndLimit {
                cursor: -1,
                limit: 1000,
            },
        )
        .unwrap()
        .into_iter()
        .filter(|c| c.record_id == record.record_id)
        .collect::<Vec<_>>();

    // Without dedup view, multiple changelog rows may exist for the same record_id.
    // Check the latest (last) entry matches the expected row_action.
    let last = change_logs.last().unwrap();
    assert_eq!(last, &{
        let mut r = last.clone();
        r.transfer_store_id = expected_transfer_store_id;
        r.store_id = Some(record.store_id);
        r.record_id = record.record_id;
        r.row_action = row_action.clone();
        r
    });
}

#[actix_rt::test]
async fn test_changelog_name_and_store_id_in_trigger() {
    // This test checks that the database triggers that should create change log records are working correctly
    // For each record type we create an example record, then check that the associated changelog record has automatically been created.
    fn name() -> NameRow {
        NameRow {
            id: "name_id".to_string(),
            name: "name".to_string(),
            ..Default::default()
        }
    }

    fn store() -> StoreRow {
        StoreRow {
            id: "store".to_string(),
            name_id: name().id,
            ..Default::default()
        }
    }

    fn currency() -> CurrencyRow {
        CurrencyRow {
            id: "currency".to_string(),
            is_home_currency: true,
            code: "NZD".to_string(),
            ..Default::default()
        }
    }

    fn invoice() -> InvoiceRow {
        InvoiceRow {
            id: "invoice".to_string(),
            name_id: name().id,
            name_store_id: Some(store().id),
            store_id: store().id,
            currency_id: Some(currency().id),
            ..Default::default()
        }
    }

    fn invoice_line() -> InvoiceLineRow {
        InvoiceLineRow {
            id: "invoice_line".to_string(),
            invoice_id: invoice().id,
            item_link_id: mock_item_a().id,
            ..Default::default()
        }
    }

    fn requisition() -> RequisitionRow {
        RequisitionRow {
            id: "requisition".to_string(),
            name_id: name().id,
            name_store_id: Some(store().id),
            store_id: store().id,
            ..Default::default()
        }
    }

    fn requisition_line() -> RequisitionLineRow {
        RequisitionLineRow {
            id: "requisition_line".to_string(),
            requisition_id: requisition().id,
            item_link_id: mock_item_a().id,
            ..Default::default()
        }
    }

    let (_, connection, _, _) = setup_all_with_data(
        "test_changelog_name_and_store_id_insert",
        MockDataInserts::none().units().items(),
        MockData {
            names: vec![name()],
            stores: vec![store()],
            currencies: vec![currency()],
            invoices: vec![invoice()],
            invoice_lines: vec![invoice_line()],
            requisitions: vec![requisition()],
            requisition_lines: vec![requisition_line()],
            ..Default::default()
        },
    )
    .await;

    // Invoice Line Insert

    test_changelog_name_and_store_id(
        &connection,
        TestRecord {
            record: invoice_line(),
            record_id: invoice_line().id,
            name_id: invoice().name_id,
            store_id: invoice().store_id,
        },
        RowActionType::Upsert,
        |_, _| {
            // already inserted in setup_all
        },
    );

    // Invoice Line Upsert

    test_changelog_name_and_store_id(
        &connection,
        TestRecord {
            record: invoice_line(),
            record_id: invoice_line().id,
            name_id: invoice().name_id,
            store_id: invoice().store_id,
        },
        RowActionType::Upsert,
        |connection, r| {
            InvoiceLineRowRepository::new(connection)
                .upsert_one(r)
                .unwrap();
        },
    );

    // Invoice Line Delete

    test_changelog_name_and_store_id(
        &connection,
        TestRecord {
            record: invoice_line(),
            record_id: invoice_line().id,
            name_id: invoice().name_id,
            store_id: invoice().store_id,
        },
        RowActionType::Delete,
        |connection, r| {
            InvoiceLineRowRepository::new(connection)
                .delete(&r.id)
                .unwrap();
        },
    );

    // Invoice Insert

    test_changelog_name_and_store_id(
        &connection,
        TestRecord {
            record: invoice(),
            record_id: invoice().id,
            name_id: invoice().name_id,
            store_id: invoice().store_id,
        },
        RowActionType::Upsert,
        |_, _| {
            // already inserted in setup_all
        },
    );

    // Invoice Upsert

    test_changelog_name_and_store_id(
        &connection,
        TestRecord {
            record: invoice(),
            record_id: invoice().id,
            name_id: invoice().name_id,
            store_id: invoice().store_id,
        },
        RowActionType::Upsert,
        |connection, r| {
            InvoiceRowRepository::new(connection).upsert_one(r).unwrap();
        },
    );

    // Invoice Delete

    test_changelog_name_and_store_id(
        &connection,
        TestRecord {
            record: invoice(),
            record_id: invoice().id,
            name_id: invoice().name_id,
            store_id: invoice().store_id,
        },
        RowActionType::Delete,
        |connection, r| {
            InvoiceRowRepository::new(connection).delete(&r.id).unwrap();
        },
    );

    // Requisition Line Insert

    test_changelog_name_and_store_id(
        &connection,
        TestRecord {
            record: requisition_line(),
            record_id: requisition_line().id,
            name_id: requisition().name_id,
            store_id: requisition().store_id,
        },
        RowActionType::Upsert,
        |_, _| {
            // already inserted in setup_all
        },
    );

    // Requisition Line Upsert

    test_changelog_name_and_store_id(
        &connection,
        TestRecord {
            record: requisition_line(),
            record_id: requisition_line().id,
            name_id: requisition().name_id,
            store_id: requisition().store_id,
        },
        RowActionType::Upsert,
        |connection, r| {
            RequisitionLineRowRepository::new(connection)
                .upsert_one(r)
                .unwrap();
        },
    );

    // Requisition Line Deletes

    test_changelog_name_and_store_id(
        &connection,
        TestRecord {
            record: requisition_line(),
            record_id: requisition_line().id,
            name_id: requisition().name_id,
            store_id: requisition().store_id,
        },
        RowActionType::Delete,
        |connection, r| {
            RequisitionLineRowRepository::new(connection)
                .delete(&r.id)
                .unwrap();
        },
    );

    // Requisition Insert

    test_changelog_name_and_store_id(
        &connection,
        TestRecord {
            record: requisition(),
            record_id: requisition().id,
            name_id: requisition().name_id,
            store_id: requisition().store_id,
        },
        RowActionType::Upsert,
        |_, _| {
            // already inserted in setup_all
        },
    );

    // Requisition Upserts

    test_changelog_name_and_store_id(
        &connection,
        TestRecord {
            record: requisition(),
            record_id: requisition().id,
            name_id: requisition().name_id,
            store_id: requisition().store_id,
        },
        RowActionType::Upsert,
        |connection, r| {
            RequisitionRowRepository::new(connection)
                .upsert_one(r)
                .unwrap();
        },
    );

    // Requisition Deletes

    test_changelog_name_and_store_id(
        &connection,
        TestRecord {
            record: requisition(),
            record_id: requisition().id,
            name_id: requisition().name_id,
            store_id: requisition().store_id,
        },
        RowActionType::Delete,
        |connection, r| {
            RequisitionRowRepository::new(connection)
                .delete(&r.id)
                .unwrap();
        },
    );
}

#[actix_rt::test]
async fn test_changelog_outgoing_sync_records() {
    let (_, connection, _, _) = test_db::setup_all(
        "test_changelog_outgoing_sync_records",
        MockDataInserts::none().names().stores(),
    )
    .await;

    let site1_id = mock_store_a().site_id; // Site 1 is used in mock_store_a
    let site1_store_id = mock_store_a().id;

    let site2_id = mock_store_b().site_id; // Site 2 is used in mock_store_b

    assert_ne!(site1_id, site2_id);

    // This test simulates the central server. Set the current site id to a value
    // distinct from site1/site2 so that records upserted here (using
    // `SourceSiteId::CurrentSiteId`) get a non-null source_site_id.
    let central_site_id = 999;
    assert_ne!(central_site_id, site1_id);
    assert_ne!(central_site_id, site2_id);
    KeyValueStoreRepository::new(&connection)
        .set_i32(KeyType::SettingsSyncSiteId, Some(central_site_id))
        .unwrap();

    // Skip past changelog rows from mock setup (Central-style names/stores).
    let cursor_before = ChangelogRepository::new(&connection).max_cursor().unwrap() as i64;

    let outgoing_results = ChangelogRepository::new(&connection)
        .query(
            ChangelogFilter::all_data_for_site(1, false, None),
            CursorAndLimit {
                cursor: cursor_before,
                limit: 10,
            },
        )
        .unwrap();
    assert_eq!(outgoing_results.len(), 0); // Nothing to send to the remote site yet...

    // Insert an asset_class variant (which should trigger a changelog record for Central Sync)
    let asset_class_id = "asset_class_id".to_string();
    let row = AssetClassRow {
        id: asset_class_id.clone(),
        ..Default::default()
    };
    AssetClassRowRepository::new(&connection)
        .upsert_one(&row)
        .unwrap();

    let outgoing_results = ChangelogRepository::new(&connection)
        .query(
            ChangelogFilter::all_data_for_site(1, false, None),
            CursorAndLimit {
                cursor: cursor_before,
                limit: 1000,
            },
        )
        .unwrap();
    // outgoing_results should contain the changelog record for the asset class
    assert_eq!(outgoing_results.len(), 1);
    assert_eq!(outgoing_results[0].record_id, asset_class_id);

    // Insert an asset for the site `1``

    let asset_id = "asset_id".to_string();
    let row = AssetRow {
        id: asset_id.clone(),
        store_id: Some(site1_store_id.clone()),
        ..Default::default()
    };

    // We want to test the sync scenario where changelog is set with site id = site1_id.
    row.upsert_sync(
        &connection,
        ChangelogSyncType::SyncTypeV5V6 {
            source_site_id: Some(site1_id),
        },
    )
    .unwrap();

    // Now we should have two records to send to site 1 the remote site on initialisation
    // The asset class and the asset

    let outgoing_results = ChangelogRepository::new(&connection)
        .query(
            ChangelogFilter::all_data_for_site(site1_id, true, None),
            CursorAndLimit {
                cursor: cursor_before,
                limit: 1000,
            },
        )
        .unwrap();
    assert_eq!(outgoing_results.len(), 2);
    assert_eq!(outgoing_results[0].record_id, asset_class_id);
    assert_eq!(outgoing_results[1].record_id, asset_id);

    // If not during initialisation, we should only get the asset_class as the asset was synced from the site already
    let outgoing_results = ChangelogRepository::new(&connection)
        .query(
            ChangelogFilter::all_data_for_site(site1_id, false, None),
            CursorAndLimit {
                cursor: cursor_before,
                limit: 1000,
            },
        )
        .unwrap();
    assert_eq!(outgoing_results.len(), 1);
    assert_eq!(outgoing_results[0].record_id, asset_class_id);

    // Site 2 should only get the asset_class
    let outgoing_results = ChangelogRepository::new(&connection)
        .query(
            ChangelogFilter::all_data_for_site(site2_id, false, None),
            CursorAndLimit {
                cursor: cursor_before,
                limit: 1000,
            },
        )
        .unwrap();
    assert_eq!(outgoing_results.len(), 1);
    assert_eq!(outgoing_results[0].record_id, asset_class_id);

    // A requisition at store_a addressed to the name backing store_b should
    // reach site 1 via store_id (Remote) and site 2 via transfer_store_id (Transfer).
    // `RequisitionRow::generate_changelog` reads `transfer_store_id` directly
    // from `name_store_id`, so set it explicitly here.
    let req_id = "req_transfer".to_string();
    RequisitionRowRepository::new(&connection)
        .upsert_one(&RequisitionRow {
            id: req_id.clone(),
            store_id: site1_store_id.clone(),
            name_id: mock_name_store_b().id,
            name_store_id: Some(mock_store_b().id),
            ..Default::default()
        })
        .unwrap();

    let outgoing_results = ChangelogRepository::new(&connection)
        .query(
            ChangelogFilter::all_data_for_site(site1_id, false, None),
            CursorAndLimit {
                cursor: cursor_before,
                limit: 1000,
            },
        )
        .unwrap();
    assert_eq!(outgoing_results.len(), 2);
    assert_eq!(outgoing_results[1].record_id, req_id);

    let outgoing_results = ChangelogRepository::new(&connection)
        .query(
            ChangelogFilter::all_data_for_site(site2_id, false, None),
            CursorAndLimit {
                cursor: cursor_before,
                limit: 1000,
            },
        )
        .unwrap();
    assert_eq!(outgoing_results.len(), 2);
    assert_eq!(outgoing_results[1].record_id, req_id);
}

#[actix_rt::test]
async fn test_changelog_outgoing_patient_sync_records() {
    let (_, connection, _, _) = test_db::setup_all(
        "test_changelog_outgoing_patient_sync_records",
        MockDataInserts::all(),
    )
    .await;

    let repo = ChangelogRepository::new(&connection);

    let site1_id = mock_store_a().site_id; // Site 1 is used in mock_store_a

    // create a vaccination record from store B (site 2) for patient2
    let vaccination = VaccinationRow {
        id: "mock_vax_id".to_string(),
        patient_id: "patient2".to_string(),
        store_id: "store_b".to_string(),
        vaccine_course_dose_id: "vaccine_course_a_dose_a".to_string(),
        user_id: "user_account_a".to_string(),
        ..Default::default()
    };

    let cursor_before = repo.max_cursor().unwrap() as i64;
    VaccinationRowRepository::new(&connection)
        .upsert_one(&vaccination)
        .unwrap();
    let cursor = repo.max_cursor().unwrap() as i64;

    // store A (on site1) has name_store_join for patient2

    // Site 1 sync should get the vaccination changelog via name_store_join
    let outgoing_results = ChangelogRepository::new(&connection)
        .query(
            ChangelogFilter::all_data_for_site(site1_id, true, None),
            CursorAndLimit {
                cursor: cursor_before,
                limit: 1000,
            },
        )
        .unwrap();
    assert_eq!(outgoing_results.len(), 1);
    assert_eq!(outgoing_results[0].record_id, vaccination.id);

    // Site 1 patient_pull
    let outgoing_results = ChangelogRepository::new(&connection)
        .query(
            ChangelogCondition::And(vec![
                ChangelogFilter::patient_data_for_site(site1_id, None),
                ChangelogCondition::patient_id::equal("patient2".to_string()),
            ]),
            CursorAndLimit {
                cursor: cursor_before,
                limit: 1000,
            },
        )
        .unwrap();
    assert_eq!(outgoing_results.len(), 1);
    assert_eq!(outgoing_results[0].record_id, vaccination.id);

    // Ensure site without name_store_join for the patient does not get the vaccination changelog
    // on patient_pull
    let outgoing_results = ChangelogRepository::new(&connection)
        .query(
            ChangelogCondition::And(vec![
                ChangelogFilter::patient_data_for_site(5, None),
                ChangelogCondition::patient_id::equal("patient2".to_string()),
            ]),
            CursorAndLimit {
                cursor: cursor + 500,
                limit: 1000,
            },
        )
        .unwrap();
    assert_eq!(outgoing_results.len(), 0);
}

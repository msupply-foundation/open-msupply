use super::changelog::changelog;
use diesel::prelude::*;

use crate::{
    asset_class_row::AssetClassRow,
    asset_row::AssetRow,
    mock::{
        mock_item_a, mock_location_1, mock_location_2, mock_location_in_another_store,
        mock_location_on_hold, mock_store_a, mock_store_b, MockData, MockDataInserts,
    },
    test_db::{self, setup_all, setup_all_with_data},
    ChangelogFilter, ChangelogRepository, ChangelogRow, ChangelogTableName, CurrencyRow,
    EqualFilter, InvoiceLineRow, InvoiceLineRowRepository, InvoiceRow, InvoiceRowRepository,
    LocationRowRepository, NameRow, RequisitionLineRow, RequisitionLineRowRepository,
    RequisitionRow, RequisitionRowRepository, RowActionType, StorageConnection, StoreRow, Upsert,
    VaccinationRow,
};

#[actix_rt::test]
async fn test_changelog() {
    let (_, connection, _, _) =
        test_db::setup_all("test_changelog", MockDataInserts::none().names().stores()).await;

    // Use location entries to populate the changelog (via the trigger)
    let location_repo = LocationRowRepository::new(&connection);
    let repo = ChangelogRepository::new(&connection);
    // Clear change log and get starting cursor
    let starting_cursor = repo.latest_cursor().unwrap();
    repo.delete(0).unwrap();
    // single entry:
    location_repo.upsert_one(&mock_location_1()).unwrap();
    let mut result = repo.changelogs(starting_cursor, 10, None).unwrap();
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

    // querying from the first entry should give the same result:
    assert_eq!(
        repo.changelogs(starting_cursor, 10, None).unwrap(),
        repo.changelogs(starting_cursor + 1, 10, None).unwrap()
    );

    // update the entry
    location_repo
        .upsert_one(&{
            let mut u = mock_location_1();
            u.code = "new_code".to_string();
            u
        })
        .unwrap();
    let mut result = repo
        .changelogs((log_entry.cursor + 1) as u64, 10, None)
        .unwrap();
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

    // query the full list from cursor=0
    // because we use the changelog_deduped view, we should only get the latest changelog row for the record_id
    let mut result = repo.changelogs(starting_cursor, 10, None).unwrap();
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

    // add another entry
    location_repo.upsert_one(&mock_location_on_hold()).unwrap();
    let result = repo.changelogs(starting_cursor, 10, None).unwrap();
    assert_eq!(2, result.len());
    assert_eq!(
        result,
        vec![
            ChangelogRow {
                cursor: starting_cursor as i64 + 2,
                table_name: ChangelogTableName::Location,
                record_id: mock_location_1().id,
                row_action: RowActionType::Upsert,
                store_id: Some(mock_location_1().store_id.clone()),
                ..Default::default()
            },
            ChangelogRow {
                cursor: starting_cursor as i64 + 3,
                table_name: ChangelogTableName::Location,
                record_id: mock_location_on_hold().id,
                row_action: RowActionType::Upsert,
                store_id: Some(mock_location_on_hold().store_id.clone()),
                ..Default::default()
            }
        ]
    );

    // delete an entry
    location_repo.delete(&mock_location_on_hold().id).unwrap();
    let result = repo.changelogs(starting_cursor, 10, None).unwrap();
    assert_eq!(2, result.len());
    assert_eq!(
        result,
        vec![
            ChangelogRow {
                cursor: starting_cursor as i64 + 2,
                table_name: ChangelogTableName::Location,
                record_id: mock_location_1().id,
                row_action: RowActionType::Upsert,
                store_id: Some(mock_location_1().store_id.clone()),
                ..Default::default()
            },
            ChangelogRow {
                cursor: starting_cursor as i64 + 4,
                table_name: ChangelogTableName::Location,
                record_id: mock_location_on_hold().id,
                row_action: RowActionType::Delete,
                store_id: Some(mock_location_on_hold().store_id.clone()),
                ..Default::default()
            }
        ]
    );
}

#[actix_rt::test]
async fn test_changelog_iteration() {
    let (_, connection, _, _) =
        test_db::setup_all("test_changelog_2", MockDataInserts::none().names().stores()).await;

    // use names entries to populate the changelog
    let location_repo = LocationRowRepository::new(&connection);
    let repo = ChangelogRepository::new(&connection);
    // Clear change log and get starting cursor
    let starting_cursor = repo.latest_cursor().unwrap();
    repo.delete(0).unwrap();

    location_repo.upsert_one(&mock_location_1()).unwrap();
    location_repo.upsert_one(&mock_location_on_hold()).unwrap();
    location_repo
        .upsert_one(&mock_location_in_another_store())
        .unwrap();
    location_repo.upsert_one(&mock_location_2()).unwrap();
    location_repo.delete(&mock_location_on_hold().id).unwrap();
    location_repo
        .upsert_one(&mock_location_in_another_store())
        .unwrap();
    location_repo.upsert_one(&mock_location_1()).unwrap();
    location_repo
        .upsert_one(&mock_location_in_another_store())
        .unwrap();
    location_repo
        .delete(&mock_location_in_another_store().id)
        .unwrap();

    // test iterating through the change log
    let changelogs = repo.changelogs(starting_cursor, 3, None).unwrap();
    let latest_id: u64 = changelogs.last().map(|r| r.cursor).unwrap() as u64;
    assert_eq!(
        changelogs
            .into_iter()
            .map(|it| it.record_id)
            .collect::<Vec<String>>(),
        vec![
            mock_location_2().id,
            mock_location_on_hold().id,
            mock_location_1().id
        ]
    );

    let changelogs = repo.changelogs(latest_id + 1, 3, None).unwrap();
    let latest_id: u64 = changelogs.last().map(|r| r.cursor).unwrap() as u64;

    assert_eq!(
        changelogs
            .into_iter()
            .map(|it| it.record_id)
            .collect::<Vec<String>>(),
        vec![mock_location_in_another_store().id]
    );

    let changelogs = repo.changelogs(latest_id + 1, 3, None).unwrap();
    assert_eq!(changelogs.len(), 0);
}

#[actix_rt::test]
async fn test_changelog_filter() {
    // changelog repository gets changelog.name_id from the related name_link
    // name_link.name_id so we need to add names and name_links into the DB.
    let (_, connection, _, _) =
        setup_all("test_changelog_filter", MockDataInserts::none().names()).await;

    // But remove any names and name_links from change log so
    // the cursors below don't conflict.
    let changelog_repo = ChangelogRepository::new(&connection);
    changelog_repo.delete(0).unwrap();

    let log1 = ChangelogRow {
        cursor: 1,
        table_name: ChangelogTableName::Invoice,
        record_id: "invoice1".to_string(),
        row_action: RowActionType::Upsert,
        name_id: Some("name1".to_string()),
        store_id: Some("store1".to_string()),
        is_sync_update: false,
        source_site_id: None,
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
    };

    for log in [&log1, &log2, &log3, &log4] {
        diesel::insert_into(changelog::table)
            .values(log)
            .execute(connection.lock().connection())
            .unwrap();
    }

    // Filter by table name
    assert_eq!(
        changelog_repo
            .changelogs(
                0,
                20,
                Some(ChangelogFilter::new().table_name(ChangelogTableName::Requisition.equal_to()))
            )
            .unwrap(),
        vec![log2.clone()]
    );

    // Filter by name_id in
    assert_eq!(
        changelog_repo
            .changelogs(
                0,
                20,
                Some(ChangelogFilter::new().name_id(EqualFilter::equal_any(vec![
                    "name1".to_string(),
                    "name3".to_string()
                ])))
            )
            .unwrap(),
        vec![log1.clone(), log3.clone()]
    );

    // Filter by store_id in or null
    assert_eq!(
        changelog_repo
            .changelogs(
                0,
                20,
                Some(
                    ChangelogFilter::new().store_id(EqualFilter::equal_any_or_null(vec![
                        "store1".to_string(),
                        "store2".to_string()
                    ]))
                )
            )
            .unwrap(),
        vec![log1.clone(), log2.clone(), log4.clone()]
    );
}

struct TestRecord<T> {
    record: T,
    record_id: String,
    name_id: String,
    store_id: String,
}

/// Helper method to test name and store id
/// Does db operation passed in as a function and then queries changelog to confirm name_id and store_id are set correctly
fn test_changelog_name_and_store_id<T, F>(
    connection: &StorageConnection,
    record: TestRecord<T>,
    row_action: RowActionType,
    db_op: F,
) where
    F: Fn(&StorageConnection, &T),
{
    let repo = ChangelogRepository::new(connection);

    db_op(connection, &record.record);

    let change_logs = repo
        .changelogs(
            0,
            20,
            Some(ChangelogFilter::new().record_id(EqualFilter::equal_to(record.record_id.to_string()))),
        )
        .unwrap();

    assert_eq!(change_logs[0], {
        let mut r = change_logs[0].clone();
        r.name_id = Some(record.name_id);
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
            name_link_id: name().id,
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
            name_link_id: name().id,
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
            name_link_id: name().id,
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

    let repo = ChangelogRepository::new(&connection);

    let outgoing_results = repo
        .outgoing_sync_records_from_central(0, 10, 1, true)
        .unwrap();
    assert_eq!(outgoing_results.len(), 0); // Nothing to send to the remote site yet...

    let site1_id = mock_store_a().site_id; // Site 1 is used in mock_store_a
    let site1_store_id = mock_store_a().id;

    let site2_id = mock_store_b().site_id; // Site 2 is used in mock_store_b

    assert_ne!(site1_id, site2_id);

    // Insert an asset_class variant (which should trigger a changelog record for Central Sync)
    let asset_class_id = "asset_class_id".to_string();
    let row = AssetClassRow {
        id: asset_class_id.clone(),
        ..Default::default()
    };
    let _result = row.upsert(&connection).unwrap();

    let outgoing_results = repo
        .outgoing_sync_records_from_central(0, 1000, 1, true)
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

    let cursor_id = row.upsert(&connection).unwrap().unwrap();

    // Set the source_site_id (usually this happens during integration step in sync)
    repo.set_source_site_id_and_is_sync_update(cursor_id, Some(site1_id))
        .unwrap();

    // Now we should have two records to send to site 1 the remote site on initialisation
    // The asset class and the asset

    let outgoing_results = repo
        .outgoing_sync_records_from_central(0, 1000, site1_id, false)
        .unwrap();
    assert_eq!(outgoing_results.len(), 2);
    assert_eq!(outgoing_results[0].record_id, asset_class_id);
    assert_eq!(outgoing_results[1].record_id, asset_id);

    // If not during initialisation, we should only get the asset_class as the asset was synced from the site already
    let outgoing_results = repo
        .outgoing_sync_records_from_central(0, 1000, site1_id, true)
        .unwrap();
    assert_eq!(outgoing_results.len(), 1);
    assert_eq!(outgoing_results[0].record_id, asset_class_id);

    // Site 2 should only get the asset_class
    let outgoing_results = repo
        .outgoing_sync_records_from_central(0, 1000, site2_id, true)
        .unwrap();
    assert_eq!(outgoing_results.len(), 1);
    assert_eq!(outgoing_results[0].record_id, asset_class_id);
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
        patient_link_id: "patient2".to_string(),
        store_id: "store_b".to_string(),
        vaccine_course_dose_id: "vaccine_course_a_dose_a".to_string(),
        user_id: "user_account_a".to_string(),
        ..Default::default()
    };

    let cursor = vaccination.upsert(&connection).unwrap().unwrap();

    // store A (on site1) has name_store_join for patient2

    // Site 1 sync should get the vaccination changelog via name_store_join
    let outgoing_results = repo
        .outgoing_sync_records_from_central(cursor as u64, 1000, site1_id, true)
        .unwrap();
    assert_eq!(outgoing_results.len(), 1);
    assert_eq!(outgoing_results[0].record_id, vaccination.id);

    // Site 1 patient_pull
    let outgoing_results = repo
        .outgoing_patient_sync_records_from_central(
            // Definitely a higher cursor than the vaccination changelog (+500)
            (cursor) as u64,
            1000,
            site1_id,
            "patient2".to_string(),
        )
        .unwrap();
    assert_eq!(outgoing_results.len(), 1);
    assert_eq!(outgoing_results[0].record_id, vaccination.id);

    // Ensure site without name_store_join for the patient does not get the vaccination changelog
    // on patient_pull
    let outgoing_results = repo
        .outgoing_patient_sync_records_from_central(
            (cursor + 500) as u64,
            1000,
            5,
            "patient2".to_string(),
        )
        .unwrap();
    assert_eq!(outgoing_results.len(), 0);
}

use super::changelog::changelog::dsl as changelog_dsl;
use diesel::prelude::*;
use util::{inline_edit, inline_init};

use crate::{
    mock::{
        mock_item_a, mock_location_1, mock_location_2, mock_location_in_another_store,
        mock_location_on_hold, MockData, MockDataInserts,
    },
    test_db::{self, setup_all, setup_all_with_data},
    ChangelogAction, ChangelogFilter, ChangelogRepository, ChangelogRow, ChangelogTableName,
    EqualFilter, InvoiceLineRow, InvoiceLineRowRepository, InvoiceRow, InvoiceRowRepository,
    LocationRowRepository, NameRow, RequisitionLineRow, RequisitionLineRowRepository,
    RequisitionRow, RequisitionRowRepository, StorageConnection, StoreRow,
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
        inline_init(|r: &mut ChangelogRow| {
            r.cursor = starting_cursor as i64 + 1;
            r.table_name = ChangelogTableName::Location;
            r.record_id = mock_location_1().id.clone();
            r.row_action = ChangelogAction::Upsert;
        })
    );

    // querying from the first entry should give the same result:
    assert_eq!(
        repo.changelogs(starting_cursor, 10, None).unwrap(),
        repo.changelogs(starting_cursor + 1, 10, None).unwrap()
    );

    // update the entry
    location_repo
        .upsert_one(&inline_edit(&mock_location_1(), |mut u| {
            u.code = "new_code".to_string();
            u
        }))
        .unwrap();
    let mut result = repo
        .changelogs((log_entry.cursor + 1) as u64, 10, None)
        .unwrap();
    assert_eq!(1, result.len());
    let log_entry = result.pop().unwrap();
    assert_eq!(
        log_entry,
        inline_init(|r: &mut ChangelogRow| {
            r.cursor = starting_cursor as i64 + 2;
            r.table_name = ChangelogTableName::Location;
            r.record_id = mock_location_1().id.clone();
            r.row_action = ChangelogAction::Upsert;
        })
    );

    // query the full list from cursor=0
    // because we use the changelog_deduped view, we should only get the latest changelog row for the record_id
    let mut result = repo.changelogs(starting_cursor, 10, None).unwrap();
    assert_eq!(1, result.len());
    let log_entry = result.pop().unwrap();
    assert_eq!(
        log_entry,
        inline_init(|r: &mut ChangelogRow| {
            r.cursor = starting_cursor as i64 + 2;
            r.table_name = ChangelogTableName::Location;
            r.record_id = mock_location_1().id.clone();
            r.row_action = ChangelogAction::Upsert;
        })
    );

    // add another entry
    location_repo.upsert_one(&mock_location_on_hold()).unwrap();
    let result = repo.changelogs(starting_cursor, 10, None).unwrap();
    assert_eq!(2, result.len());
    assert_eq!(
        result,
        vec![
            inline_init(|r: &mut ChangelogRow| {
                r.cursor = starting_cursor as i64 + 2;
                r.table_name = ChangelogTableName::Location;
                r.record_id = mock_location_1().id.clone();
                r.row_action = ChangelogAction::Upsert;
            }),
            inline_init(|r: &mut ChangelogRow| {
                r.cursor = starting_cursor as i64 + 3;
                r.table_name = ChangelogTableName::Location;
                r.record_id = mock_location_on_hold().id.clone();
                r.row_action = ChangelogAction::Upsert;
            })
        ]
    );

    // delete an entry
    location_repo.delete(&mock_location_on_hold().id).unwrap();
    let result = repo.changelogs(starting_cursor, 10, None).unwrap();
    assert_eq!(2, result.len());
    assert_eq!(
        result,
        vec![
            inline_init(|r: &mut ChangelogRow| {
                r.cursor = starting_cursor as i64 + 2;
                r.table_name = ChangelogTableName::Location;
                r.record_id = mock_location_1().id.clone();
                r.row_action = ChangelogAction::Upsert;
            }),
            inline_init(|r: &mut ChangelogRow| {
                r.cursor = starting_cursor as i64 + 4;
                r.table_name = ChangelogTableName::Location;
                r.record_id = mock_location_on_hold().id.clone();
                r.row_action = ChangelogAction::Delete;
            })
        ]
    );
}

#[actix_rt::test]
async fn test_changelog_iteration() {
    let (_, connection, _, _) =
        test_db::setup_all("test_changelog_2", MockDataInserts::none().names().stores()).await;

    // use names entries to populate the changelog (via the trigger)
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
        row_action: ChangelogAction::Upsert,
        name_id: Some("name1".to_string()),
        store_id: Some("store1".to_string()),
        is_sync_update: false,
    };

    let log2 = ChangelogRow {
        cursor: 2,
        table_name: ChangelogTableName::Requisition,
        record_id: "requisition1".to_string(),
        row_action: ChangelogAction::Upsert,
        name_id: Some("name2".to_string()),
        store_id: Some("store2".to_string()),
        is_sync_update: false,
    };

    let log3 = ChangelogRow {
        cursor: 3,
        table_name: ChangelogTableName::Invoice,
        record_id: "invoice2".to_string(),
        row_action: ChangelogAction::Upsert,
        name_id: Some("name3".to_string()),
        store_id: Some("store3".to_string()),
        is_sync_update: false,
    };

    let log4 = ChangelogRow {
        cursor: 4,
        table_name: ChangelogTableName::StocktakeLine,
        record_id: "stocktake_line1".to_string(),
        row_action: ChangelogAction::Upsert,
        name_id: None,
        store_id: None,
        is_sync_update: false,
    };

    for log in [&log1, &log2, &log3, &log4] {
        diesel::insert_into(changelog_dsl::changelog)
            .values(log)
            .execute(&connection.connection)
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
    row_action: ChangelogAction,
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
            Some(ChangelogFilter::new().record_id(EqualFilter::equal_to(&record.record_id))),
        )
        .unwrap();

    assert_eq!(
        change_logs[0],
        inline_edit(&change_logs[0], |mut r| {
            r.name_id = Some(record.name_id);
            r.store_id = Some(record.store_id);
            r.record_id = record.record_id;
            r.row_action = row_action.clone();
            r
        })
    );
}

#[actix_rt::test]
async fn test_changelog_name_and_store_id_in_trigger() {
    // This test checks that the database triggers that should create change log records are working correctly
    // For each record type we create an example record, then check that the associated changelog record has automatically been created.
    fn name() -> NameRow {
        inline_init(|r: &mut NameRow| {
            r.id = "name_id".to_string();
            r.name = "name".to_string()
        })
    }

    fn store() -> StoreRow {
        inline_init(|r: &mut StoreRow| {
            r.id = "store".to_string();
            r.name_id = name().id
        })
    }

    fn invoice() -> InvoiceRow {
        inline_init(|r: &mut InvoiceRow| {
            r.id = "invoice".to_string();
            r.name_link_id = name().id;
            r.store_id = store().id;
        })
    }

    fn invoice_line() -> InvoiceLineRow {
        inline_init(|r: &mut InvoiceLineRow| {
            r.id = "invoice_line".to_string();
            r.invoice_id = invoice().id;
            r.item_link_id = mock_item_a().id;
        })
    }

    fn requisition() -> RequisitionRow {
        inline_init(|r: &mut RequisitionRow| {
            r.id = "requisition".to_string();
            r.name_link_id = name().id;
            r.store_id = store().id;
        })
    }

    fn requisition_line() -> RequisitionLineRow {
        inline_init(|r: &mut RequisitionLineRow| {
            r.id = "requisition_line".to_string();
            r.requisition_id = requisition().id;
            r.item_link_id = mock_item_a().id;
        })
    }

    let (_, connection, _, _) = setup_all_with_data(
        "test_changelog_name_and_store_id_insert",
        MockDataInserts::none().units().items(),
        inline_init(|r: &mut MockData| {
            r.names = vec![name()];
            r.stores = vec![store()];
            r.invoices = vec![invoice()];
            r.invoice_lines = vec![invoice_line()];
            r.requisitions = vec![requisition()];
            r.requisition_lines = vec![requisition_line()];
        }),
    )
    .await;

    // Invoice Line Insert

    test_changelog_name_and_store_id(
        &connection,
        TestRecord {
            record: invoice_line(),
            record_id: invoice_line().id,
            name_id: invoice().name_link_id,
            store_id: invoice().store_id,
        },
        ChangelogAction::Upsert,
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
            name_id: invoice().name_link_id,
            store_id: invoice().store_id,
        },
        ChangelogAction::Upsert,
        |connection, r| {
            InvoiceLineRowRepository::new(connection)
                .upsert_one(r)
                .unwrap()
        },
    );

    // Invoice Line Delete

    test_changelog_name_and_store_id(
        &connection,
        TestRecord {
            record: invoice_line(),
            record_id: invoice_line().id,
            name_id: invoice().name_link_id,
            store_id: invoice().store_id,
        },
        ChangelogAction::Delete,
        |connection, r| {
            InvoiceLineRowRepository::new(connection)
                .delete(&r.id)
                .unwrap()
        },
    );

    // Invoice Insert

    test_changelog_name_and_store_id(
        &connection,
        TestRecord {
            record: invoice(),
            record_id: invoice().id,
            name_id: invoice().name_link_id,
            store_id: invoice().store_id,
        },
        ChangelogAction::Upsert,
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
            name_id: invoice().name_link_id,
            store_id: invoice().store_id,
        },
        ChangelogAction::Upsert,
        |connection, r| InvoiceRowRepository::new(connection).upsert_one(r).unwrap(),
    );

    // Invoice Delete

    test_changelog_name_and_store_id(
        &connection,
        TestRecord {
            record: invoice(),
            record_id: invoice().id,
            name_id: invoice().name_link_id,
            store_id: invoice().store_id,
        },
        ChangelogAction::Delete,
        |connection, r| InvoiceRowRepository::new(connection).delete(&r.id).unwrap(),
    );

    // Requisition Line Insert

    test_changelog_name_and_store_id(
        &connection,
        TestRecord {
            record: requisition_line(),
            record_id: requisition_line().id,
            name_id: requisition().name_link_id,
            store_id: requisition().store_id,
        },
        ChangelogAction::Upsert,
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
            name_id: requisition().name_link_id,
            store_id: requisition().store_id,
        },
        ChangelogAction::Upsert,
        |connection, r| {
            RequisitionLineRowRepository::new(connection)
                .upsert_one(r)
                .unwrap()
        },
    );

    // Requisition Line Deletes

    test_changelog_name_and_store_id(
        &connection,
        TestRecord {
            record: requisition_line(),
            record_id: requisition_line().id,
            name_id: requisition().name_link_id,
            store_id: requisition().store_id,
        },
        ChangelogAction::Delete,
        |connection, r| {
            RequisitionLineRowRepository::new(connection)
                .delete(&r.id)
                .unwrap()
        },
    );

    // Requisition Insert

    test_changelog_name_and_store_id(
        &connection,
        TestRecord {
            record: requisition(),
            record_id: requisition().id,
            name_id: requisition().name_link_id,
            store_id: requisition().store_id,
        },
        ChangelogAction::Upsert,
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
            name_id: requisition().name_link_id,
            store_id: requisition().store_id,
        },
        ChangelogAction::Upsert,
        |connection, r| {
            RequisitionRowRepository::new(connection)
                .upsert_one(r)
                .unwrap()
        },
    );

    // Requisition Deletes

    test_changelog_name_and_store_id(
        &connection,
        TestRecord {
            record: requisition(),
            record_id: requisition().id,
            name_id: requisition().name_link_id,
            store_id: requisition().store_id,
        },
        ChangelogAction::Delete,
        |connection, r| {
            RequisitionRowRepository::new(connection)
                .delete(&r.id)
                .unwrap()
        },
    );
}

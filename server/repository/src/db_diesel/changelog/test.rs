use super::changelog::changelog::dsl as changelog_dsl;
use diesel::prelude::*;
use util::{inline_edit, inline_init};

use crate::{
    mock::{
        mock_item_a, mock_name_a, mock_name_b, mock_name_store_a, mock_name_store_b, MockData,
        MockDataInserts,
    },
    test_db::{self, setup_all, setup_all_with_data},
    ChangelogAction, ChangelogFilter, ChangelogRepository, ChangelogRow, ChangelogTableName,
    EqualFilter, InvoiceLineRow, InvoiceLineRowRepository, InvoiceRow, InvoiceRowRepository,
    NameRow, NameRowRepository, RequisitionLineRow, RequisitionLineRowRepository, RequisitionRow,
    RequisitionRowRepository, StorageConnection, StoreRow,
};

#[actix_rt::test]
async fn test_changelog() {
    let (_, connection, _, _) = test_db::setup_all("test_changelog", MockDataInserts::none()).await;

    // use name entries to populate the changelog (via the trigger)
    let name_repo = NameRowRepository::new(&connection);
    let repo = ChangelogRepository::new(&connection);

    // single entry:
    let name_a = mock_name_a();
    name_repo.upsert_one(&name_a).unwrap();
    let mut result = repo.changelogs(0, 10, None).unwrap();
    assert_eq!(1, result.len());
    let log_entry = result.pop().unwrap();
    assert_eq!(
        log_entry,
        inline_init(|r: &mut ChangelogRow| {
            r.cursor = 1;
            r.table_name = ChangelogTableName::Name;
            r.record_id = name_a.id.clone();
            r.row_action = ChangelogAction::Upsert;
        })
    );

    // querying from the first entry should give the same result:
    assert_eq!(
        repo.changelogs(0, 10, None).unwrap(),
        repo.changelogs(1, 10, None).unwrap()
    );

    // update the entry
    let mut name_a_update = mock_name_a();
    name_a_update.comment = Some("updated".to_string());
    name_repo.upsert_one(&name_a_update).unwrap();
    let mut result = repo
        .changelogs((log_entry.cursor + 1) as u64, 10, None)
        .unwrap();
    assert_eq!(1, result.len());
    let log_entry = result.pop().unwrap();
    assert_eq!(
        log_entry,
        inline_init(|r: &mut ChangelogRow| {
            r.cursor = 2;
            r.table_name = ChangelogTableName::Name;
            r.record_id = name_a.id.clone();
            r.row_action = ChangelogAction::Upsert;
        })
    );

    // query the full list from cursor=0
    let mut result = repo.changelogs(0, 10, None).unwrap();
    assert_eq!(1, result.len());
    let log_entry = result.pop().unwrap();
    assert_eq!(
        log_entry,
        inline_init(|r: &mut ChangelogRow| {
            r.cursor = 2;
            r.table_name = ChangelogTableName::Name;
            r.record_id = name_a.id.clone();
            r.row_action = ChangelogAction::Upsert;
        })
    );

    // add another entry
    let name_b = mock_name_b();
    name_repo.upsert_one(&name_b).unwrap();
    let result = repo.changelogs(0, 10, None).unwrap();
    assert_eq!(2, result.len());
    assert_eq!(
        result,
        vec![
            inline_init(|r: &mut ChangelogRow| {
                r.cursor = 2;
                r.table_name = ChangelogTableName::Name;
                r.record_id = name_a.id.clone();
                r.row_action = ChangelogAction::Upsert;
            }),
            inline_init(|r: &mut ChangelogRow| {
                r.cursor = 3;
                r.table_name = ChangelogTableName::Name;
                r.record_id = name_b.id.clone();
                r.row_action = ChangelogAction::Upsert;
            })
        ]
    );

    // delete an entry
    name_repo.delete(&name_b.id).unwrap();
    let result = repo.changelogs(0, 10, None).unwrap();
    assert_eq!(2, result.len());
    assert_eq!(
        result,
        vec![
            inline_init(|r: &mut ChangelogRow| {
                r.cursor = 2;
                r.table_name = ChangelogTableName::Name;
                r.record_id = name_a.id.clone();
                r.row_action = ChangelogAction::Upsert;
            }),
            inline_init(|r: &mut ChangelogRow| {
                r.cursor = 4;
                r.table_name = ChangelogTableName::Name;
                r.record_id = name_b.id.clone();
                r.row_action = ChangelogAction::Delete;
            })
        ]
    );
}

#[actix_rt::test]
async fn test_changelog_iteration() {
    let (_, connection, _, _) =
        test_db::setup_all("test_changelog_2", MockDataInserts::none()).await;

    // use names entries to populate the changelog (via the trigger)
    let name_repo = NameRowRepository::new(&connection);
    let repo = ChangelogRepository::new(&connection);

    let name_a = mock_name_a();
    let name_b = mock_name_store_a();
    let name_c = mock_name_store_b();
    let name_d = mock_name_b();

    name_repo.upsert_one(&name_a).unwrap();
    name_repo.upsert_one(&name_b).unwrap();
    name_repo.upsert_one(&name_c).unwrap();
    name_repo.upsert_one(&name_d).unwrap();
    name_repo.delete(&name_b.id).unwrap();
    name_repo.upsert_one(&name_c).unwrap();
    name_repo.upsert_one(&name_a).unwrap();
    name_repo.upsert_one(&name_c).unwrap();
    name_repo.delete(&name_c.id).unwrap();

    // test iterating through the change log
    let changelogs = repo.changelogs(0, 3, None).unwrap();
    let latest_id: u64 = changelogs.last().map(|r| r.cursor).unwrap() as u64;
    assert_eq!(
        changelogs
            .into_iter()
            .map(|it| it.record_id)
            .collect::<Vec<String>>(),
        vec![name_d.id, name_b.id, name_a.id]
    );

    let changelogs = repo.changelogs(latest_id + 1, 3, None).unwrap();
    let latest_id: u64 = changelogs.last().map(|r| r.cursor).unwrap() as u64;

    assert_eq!(
        changelogs
            .into_iter()
            .map(|it| it.record_id)
            .collect::<Vec<String>>(),
        vec![name_c.id]
    );

    let changelogs = repo.changelogs(latest_id + 1, 3, None).unwrap();
    assert_eq!(changelogs.len(), 0);
}

#[actix_rt::test]
async fn test_changelog_filter() {
    let (_, connection, _, _) = setup_all("test_changelog_filter", MockDataInserts::none()).await;

    let log1 = ChangelogRow {
        cursor: 1,
        table_name: ChangelogTableName::Invoice,
        record_id: "invoice1".to_string(),
        row_action: ChangelogAction::Upsert,
        name_id: Some("name1".to_string()),
        store_id: Some("store1".to_string()),
    };

    let log2 = ChangelogRow {
        cursor: 2,
        table_name: ChangelogTableName::Requisition,
        record_id: "requisition1".to_string(),
        row_action: ChangelogAction::Upsert,
        name_id: Some("name2".to_string()),
        store_id: Some("store2".to_string()),
    };

    let log3 = ChangelogRow {
        cursor: 3,
        table_name: ChangelogTableName::Invoice,
        record_id: "invoice2".to_string(),
        row_action: ChangelogAction::Upsert,
        name_id: Some("name3".to_string()),
        store_id: Some("store3".to_string()),
    };

    let log4 = ChangelogRow {
        cursor: 4,
        table_name: ChangelogTableName::StocktakeLine,
        record_id: "stocktake_line1".to_string(),
        row_action: ChangelogAction::Upsert,
        name_id: None,
        store_id: None,
    };

    for log in vec![&log1, &log2, &log3, &log4] {
        diesel::insert_into(changelog_dsl::changelog)
            .values(log)
            .execute(&connection.connection)
            .unwrap();
    }

    let repo = ChangelogRepository::new(&connection);

    // Filter by table name

    assert_eq!(
        repo.changelogs(
            0,
            20,
            Some(ChangelogFilter::new().table_name(ChangelogTableName::Requisition.equal_to()))
        )
        .unwrap(),
        vec![log2.clone()]
    );

    // Filter by name_id in

    assert_eq!(
        repo.changelogs(
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
        repo.changelogs(
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
    let repo = ChangelogRepository::new(&connection);

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
            r.name_id = name().id;
            r.store_id = store().id;
        })
    }

    fn invoice_line() -> InvoiceLineRow {
        inline_init(|r: &mut InvoiceLineRow| {
            r.id = "invoice_line".to_string();
            r.invoice_id = invoice().id;
            r.item_id = mock_item_a().id;
        })
    }

    fn requisition() -> RequisitionRow {
        inline_init(|r: &mut RequisitionRow| {
            r.id = "requisition".to_string();
            r.name_id = name().id;
            r.store_id = store().id;
        })
    }

    fn requisition_line() -> RequisitionLineRow {
        inline_init(|r: &mut RequisitionLineRow| {
            r.id = "requisition_line".to_string();
            r.requisition_id = requisition().id;
            r.item_id = mock_item_a().id;
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
            name_id: invoice().name_id,
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
            name_id: invoice().name_id,
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
            name_id: invoice().name_id,
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
            name_id: invoice().name_id,
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
            name_id: invoice().name_id,
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
            name_id: invoice().name_id,
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
            name_id: requisition().name_id,
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
            name_id: requisition().name_id,
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
            name_id: requisition().name_id,
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
            name_id: requisition().name_id,
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
            name_id: requisition().name_id,
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
            name_id: requisition().name_id,
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

use super::*;
use crate::service_provider::ServiceProvider;
use repository::{
    ChangelogRepository,
    mock::{
        MockDataInserts, mock_item_a, mock_item_b, mock_item_c, mock_item_service_item,
        mock_store_a, mock_store_b,
    },
    test_db::setup_all,
};

fn medicine(item_id: &str, amounts: &[f64]) -> CommonMedicine {
    CommonMedicine {
        item_id: item_id.to_string(),
        amounts: amounts.to_vec(),
    }
}

async fn context(db_name: &str) -> ServiceContext {
    let (_, _, connection_manager, _) = setup_all(db_name, MockDataInserts::all()).await;
    ServiceProvider::new(connection_manager)
        .basic_context()
        .unwrap()
}

// OMS-REG-DIS-12.20
#[actix_rt::test]
async fn common_medicines_are_kept_per_store_in_order() {
    let ctx = context("common_medicines_per_store").await;
    let store_a = mock_store_a().id;
    let store_b = mock_store_b().id;

    // Nothing saved: no cards.
    assert_eq!(get_common_medicines(&ctx.connection, &store_a), Ok(vec![]));

    // The order given is the order kept, and an empty amount list is
    // allowed (the card asks for the amount instead).
    let list = vec![
        medicine(&mock_item_b().id, &[10.0, 20.0, 30.0]),
        medicine(&mock_item_a().id, &[]),
    ];
    upsert_common_medicines(&ctx, &store_a, list.clone()).unwrap();
    assert_eq!(get_common_medicines(&ctx.connection, &store_a), Ok(list));

    // Another store's list is its own.
    assert_eq!(get_common_medicines(&ctx.connection, &store_b), Ok(vec![]));
}

// OMS-REG-DIS-12.16-.19, .130, .131
#[actix_rt::test]
async fn common_medicines_reject_invalid_lists() {
    let ctx = context("common_medicines_invalid").await;
    let store_a = mock_store_a().id;
    let item_a = mock_item_a().id;
    let item_b = mock_item_b().id;

    // The store already has a list, which no refused save may change.
    let saved = vec![medicine(&item_a, &[5.0])];
    upsert_common_medicines(&ctx, &store_a, saved.clone()).unwrap();

    let is_invalid = |list: Vec<CommonMedicine>| {
        matches!(
            upsert_common_medicines(&ctx, &store_a, list),
            Err(UpsertCommonMedicinesError::InvalidValue(_))
        )
    };

    // The same medicine twice
    assert!(is_invalid(vec![
        medicine(&item_a, &[10.0]),
        medicine(&item_a, &[20.0]),
    ]));
    // More amounts than a card has buttons for
    assert!(is_invalid(vec![medicine(&item_a, &[1.0, 2.0, 3.0, 4.0])]));
    // Zero, negative and not-a-number amounts
    assert!(is_invalid(vec![medicine(&item_a, &[0.0])]));
    assert!(is_invalid(vec![medicine(&item_b, &[-5.0])]));
    assert!(is_invalid(vec![medicine(&item_b, &[f64::NAN])]));
    // The same amount twice for one medicine
    assert!(is_invalid(vec![medicine(&item_a, &[10.0, 20.0, 10.0])]));
    // An item that doesn't exist
    assert!(is_invalid(vec![medicine("no_such_item", &[10.0])]));
    // A service item: the cards only show stock items
    assert!(is_invalid(vec![medicine(
        &mock_item_service_item().id,
        &[1.0]
    )]));
    // A deleted item, which is kept but marked inactive
    ItemRowRepository::new(&ctx.connection)
        .mark_deleted(&item_b)
        .unwrap();
    assert!(is_invalid(vec![
        medicine(&item_a, &[1.0]),
        medicine(&item_b, &[1.0]),
    ]));

    // None of the refused lists changed the saved one.
    assert_eq!(get_common_medicines(&ctx.connection, &store_a), Ok(saved));
}

// OMS-REG-DIS-12.133, .134
#[actix_rt::test]
async fn common_medicines_follow_an_item_merge() {
    let ctx = context("common_medicines_item_merge").await;
    let store_a = mock_store_a().id;
    let store_b = mock_store_b().id;
    let item_a = mock_item_a().id;
    let item_b = mock_item_b().id;
    let item_c = mock_item_c().id;

    // Store B's list is saved before any merge.
    upsert_common_medicines(
        &ctx,
        &store_b,
        vec![
            medicine(&item_a, &[1.0]),
            medicine(&item_c, &[]),
            medicine(&item_b, &[2.0]),
        ],
    )
    .unwrap();

    // Item A is merged into item B: A's link now points at B.
    ItemLinkRowRepository::new(&ctx.connection)
        .upsert_one(&ItemLinkRow {
            id: item_a.clone(),
            item_id: item_b.clone(),
        })
        .unwrap();

    // Read after the merge, A shows as B, in A's place and with A's
    // amounts, and the later B is dropped.
    assert_eq!(
        get_common_medicines(&ctx.connection, &store_b),
        Ok(vec![medicine(&item_b, &[1.0]), medicine(&item_c, &[])])
    );

    // A list naming the merged-away item is saved as the kept one.
    upsert_common_medicines(&ctx, &store_a, vec![medicine(&item_a, &[5.0])]).unwrap();
    assert_eq!(
        get_common_medicines(&ctx.connection, &store_a),
        Ok(vec![medicine(&item_b, &[5.0])])
    );
}

// OMS-REG-DIS-12.135
#[actix_rt::test]
async fn common_medicines_that_cant_be_read_are_left_out() {
    let ctx = context("common_medicines_cant_be_read").await;
    let store_a = mock_store_a().id;
    let repo = CommonMedicineRowRepository::new(&ctx.connection);
    let row = |id: &str, item_id: &str, sort_order: i32, amounts: &str| CommonMedicineRow {
        id: id.to_string(),
        store_id: store_a.clone(),
        sort_order,
        amounts: amounts.to_string(),
        item_id: item_id.to_string(),
    };
    repo.upsert_one(&row("a", &mock_item_a().id, 0, "[1]"))
        .unwrap();
    repo.upsert_one(&row("b", &mock_item_b().id, 1, "not json"))
        .unwrap();
    repo.upsert_one(&row("c", &mock_item_c().id, 2, "[]"))
        .unwrap();

    // The row that can't be read gives no card; the others still show.
    assert_eq!(
        get_common_medicines(&ctx.connection, &store_a),
        Ok(vec![
            medicine(&mock_item_a().id, &[1.0]),
            medicine(&mock_item_c().id, &[]),
        ])
    );
}

// OMS-REG-DIS-12.236: an edit changes the medicine's row rather than adding one,
// a medicine taken off the list loses its row, and a save that changes nothing
// writes nothing to sync
#[actix_rt::test]
async fn saving_again_changes_only_what_changed() {
    let ctx = context("common_medicines_save_again").await;
    let store_a = mock_store_a().id;
    let item_a = mock_item_a().id;
    let item_b = mock_item_b().id;
    let repo = CommonMedicineRowRepository::new(&ctx.connection);
    let row_ids = || {
        repo.find_many_by_store(&store_a)
            .unwrap()
            .into_iter()
            .map(|row| (row.item_id, row.id))
            .collect::<HashMap<_, _>>()
    };

    let list = vec![medicine(&item_a, &[10.0]), medicine(&item_b, &[20.0])];
    upsert_common_medicines(&ctx, &store_a, list.clone()).unwrap();
    let first_ids = row_ids();

    // The same list again writes nothing.
    let cursor = ChangelogRepository::new(&ctx.connection)
        .max_cursor()
        .unwrap();
    upsert_common_medicines(&ctx, &store_a, list).unwrap();
    assert_eq!(
        ChangelogRepository::new(&ctx.connection).max_cursor(),
        Ok(cursor)
    );

    // Reordered, with A's amount changed: the same rows.
    let reordered = vec![medicine(&item_b, &[20.0]), medicine(&item_a, &[5.0])];
    upsert_common_medicines(&ctx, &store_a, reordered.clone()).unwrap();
    assert_eq!(row_ids(), first_ids);
    assert_eq!(
        get_common_medicines(&ctx.connection, &store_a),
        Ok(reordered)
    );

    // B taken off the list: its row goes, A keeps its own.
    upsert_common_medicines(&ctx, &store_a, vec![medicine(&item_a, &[5.0])]).unwrap();
    assert_eq!(
        row_ids(),
        HashMap::from([(item_a.clone(), first_ids[&item_a].clone())])
    );

    // An empty list clears the store's cards.
    upsert_common_medicines(&ctx, &store_a, vec![]).unwrap();
    assert_eq!(get_common_medicines(&ctx.connection, &store_a), Ok(vec![]));
}

#[actix_rt::test]
async fn common_medicines_report_a_database_error_as_one() {
    let ctx = context("common_medicines_database_error").await;

    // Shadow the tables the check reads with temporary ones that lack
    // their columns, so its query fails (on this connection only).
    ctx.connection
        .batch_execute(
            "CREATE TEMPORARY TABLE item (unrelated TEXT); \
             CREATE TEMPORARY TABLE item_link (unrelated TEXT);",
        )
        .unwrap();

    assert!(matches!(
        upsert_common_medicines(
            &ctx,
            &mock_store_a().id,
            vec![medicine(&mock_item_a().id, &[10.0])],
        ),
        Err(UpsertCommonMedicinesError::DatabaseError(_))
    ));
}

/// The store's `common_medicine` changelog rows after `cursor`.
fn changelog_after(ctx: &ServiceContext, cursor: u64) -> Vec<repository::ChangelogRow> {
    use repository::{ChangelogCondition, ChangelogTableName, CursorAndLimit, FilterBuilder};
    ChangelogRepository::new(&ctx.connection)
        .query(
            ChangelogCondition::table_name::equal(ChangelogTableName::CommonMedicine),
            CursorAndLimit {
                cursor: cursor as i64,
                limit: 100,
            },
        )
        .unwrap()
        .rows
}

// OMS-REG-DIS-12.236: a medicine taken off the list leaves a delete for the
// store's site to push, so central drops it too
#[actix_rt::test]
async fn taking_a_medicine_off_the_list_syncs_its_removal() {
    use repository::RowActionType;

    let ctx = context("common_medicines_removal_syncs").await;
    let store_a = mock_store_a().id;
    let item_a = mock_item_a().id;
    let item_b = mock_item_b().id;
    upsert_common_medicines(
        &ctx,
        &store_a,
        vec![medicine(&item_a, &[10.0]), medicine(&item_b, &[20.0])],
    )
    .unwrap();
    let b_row = CommonMedicineRowRepository::new(&ctx.connection)
        .find_many_by_store(&store_a)
        .unwrap()
        .into_iter()
        .find(|row| row.item_id == item_b)
        .unwrap();
    let cursor = ChangelogRepository::new(&ctx.connection)
        .max_cursor()
        .unwrap();

    upsert_common_medicines(&ctx, &store_a, vec![medicine(&item_a, &[10.0])]).unwrap();

    // One change only: B's row deleted, under the store, so it routes to the
    // store's site and central as the upsert did.
    let changes: Vec<_> = changelog_after(&ctx, cursor)
        .into_iter()
        .map(|row| (row.record_id, row.row_action, row.store_id))
        .collect();
    assert_eq!(
        changes,
        vec![(b_row.id, RowActionType::Delete, Some(store_a.clone()))]
    );
}

// OMS-REG-DIS-12.133, .236: when a merge has left two rows for one item, saving
// the list keeps the first row for that item and deletes the other
#[actix_rt::test]
async fn saving_after_a_merge_keeps_one_row_for_the_merged_item() {
    let ctx = context("common_medicines_save_after_merge").await;
    let store_a = mock_store_a().id;
    let item_a = mock_item_a().id;
    let item_b = mock_item_b().id;
    let repo = CommonMedicineRowRepository::new(&ctx.connection);
    upsert_common_medicines(
        &ctx,
        &store_a,
        vec![medicine(&item_a, &[1.0]), medicine(&item_b, &[2.0])],
    )
    .unwrap();
    let a_row_id = repo
        .find_many_by_store(&store_a)
        .unwrap()
        .into_iter()
        .find(|row| row.item_id == item_a)
        .unwrap()
        .id;

    // Item A is merged into item B: both rows now read as B, A's first.
    ItemLinkRowRepository::new(&ctx.connection)
        .upsert_one(&ItemLinkRow {
            id: item_a.clone(),
            item_id: item_b.clone(),
        })
        .unwrap();
    assert_eq!(repo.find_many_by_store(&store_a).unwrap().len(), 2);

    upsert_common_medicines(&ctx, &store_a, vec![medicine(&item_b, &[3.0])]).unwrap();

    let rows = repo.find_many_by_store(&store_a).unwrap();
    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].id, a_row_id);
    assert_eq!(
        get_common_medicines(&ctx.connection, &store_a),
        Ok(vec![medicine(&item_b, &[3.0])])
    );
}

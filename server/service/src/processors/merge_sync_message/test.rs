use chrono::Utc;
use repository::{
    mock::{MockData, MockDataInserts},
    ChangelogCondition, ChangelogRepository, ChangelogTableName, CursorAndLimit, FilterBuilder,
    NameLinkRow, NameLinkRowRepository, SyncMessageRow, SyncMessageRowRepository,
    SyncMessageRowStatus, SyncMessageRowType,
};
use serde_json::json;
use util::uuid::uuid;

use crate::{
    processors::ProcessorType,
    test_helpers::{setup_all_with_data_and_service_provider, ServiceTestContext},
};

/// A NameMerge sync_message row produced by central must be replayed by the
/// processor on the receiving site: name_link rows for the deleted name now
/// point at the kept name.
#[tokio::test]
async fn name_merge_sync_message_rewrites_name_links() {
    let ServiceTestContext {
        service_provider,
        service_context: ctx,
        ..
    } = setup_all_with_data_and_service_provider(
        "name_merge_sync_message_rewrites_name_links",
        MockDataInserts::none().units().names(),
        MockData::default(),
    )
    .await;

    let body = json!({
        "mergeIdToKeep": "name_b",
        "mergeIdToDelete": "name_a"
    })
    .to_string();

    let message = SyncMessageRow {
        id: uuid(),
        to_store_id: None,
        from_store_id: None,
        body,
        created_datetime: Utc::now().naive_utc(),
        status: SyncMessageRowStatus::New,
        r#type: SyncMessageRowType::NameMerge,
        error_message: None,
    };
    SyncMessageRowRepository::new(&ctx.connection)
        .upsert_one(&message)
        .unwrap();

    ctx.processors_trigger
        .trigger_processor(ProcessorType::MergeSyncMessage);
    ctx.processors_trigger.await_events_processed().await;

    // name_link for name_a now points at name_b
    let link = NameLinkRowRepository::new(&ctx.connection)
        .find_one_by_id("name_a")
        .unwrap()
        .unwrap();
    assert_eq!(
        link,
        NameLinkRow {
            id: "name_a".to_string(),
            name_id: "name_b".to_string(),
        }
    );

    // Message is marked Processed
    let processed = SyncMessageRowRepository::new(&ctx.connection)
        .find_one_by_id(&message.id)
        .unwrap()
        .unwrap();
    assert_eq!(processed.status, SyncMessageRowStatus::Processed);

    // Re-running the processor is idempotent
    ctx.processors_trigger
        .trigger_processor(ProcessorType::MergeSyncMessage);
    ctx.processors_trigger.await_events_processed().await;

    let link2 = NameLinkRowRepository::new(&ctx.connection)
        .find_one_by_id("name_a")
        .unwrap()
        .unwrap();
    assert_eq!(link2, link);

    let _ = service_provider; // keep alive
}

/// `to_store_id` should be copied to `changelog.store_id` so that the central
/// outgoing-sync filter routes the row Remote (owning site only) when set,
/// or Central (all sites) when not.
#[tokio::test]
async fn sync_message_changelog_carries_to_store_id() {
    let ServiceTestContext {
        service_context: ctx,
        ..
    } = setup_all_with_data_and_service_provider(
        "sync_message_changelog_carries_to_store_id",
        MockDataInserts::none().names().stores(),
        MockData::default(),
    )
    .await;

    let with_store = SyncMessageRow {
        id: uuid(),
        to_store_id: Some("store_a".to_string()),
        body: "{}".to_string(),
        created_datetime: Utc::now().naive_utc(),
        status: SyncMessageRowStatus::New,
        r#type: SyncMessageRowType::Other("WithStore".to_string()),
        ..Default::default()
    };
    let without_store = SyncMessageRow {
        id: uuid(),
        to_store_id: None,
        body: "{}".to_string(),
        created_datetime: Utc::now().naive_utc(),
        status: SyncMessageRowStatus::New,
        r#type: SyncMessageRowType::Other("WithoutStore".to_string()),
        ..Default::default()
    };

    let repo = SyncMessageRowRepository::new(&ctx.connection);
    repo.upsert_one(&with_store).unwrap();
    repo.upsert_one(&without_store).unwrap();

    let changelog_repo = ChangelogRepository::new(&ctx.connection);
    let entries = changelog_repo
        .query(
            ChangelogCondition::table_name::equal(ChangelogTableName::SyncMessage),
            CursorAndLimit {
                cursor: 0,
                limit: 1000,
            },
        )
        .unwrap();

    let with_store_entry = entries
        .rows
        .iter()
        .find(|c| c.record_id == with_store.id)
        .expect("changelog for with_store");
    let without_store_entry = entries
        .rows
        .iter()
        .find(|c| c.record_id == without_store.id)
        .expect("changelog for without_store");

    assert_eq!(with_store_entry.store_id.as_deref(), Some("store_a"));
    assert_eq!(without_store_entry.store_id, None);
}

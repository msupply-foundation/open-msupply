use crate::sync::{
    api::SyncAction,
    synchroniser::integrate_and_translate_sync_buffer,
    test::{
        check_test_records_against_database, extract_sync_buffer_rows,
        test_data::{get_all_push_test_records, get_all_sync_v6_records},
        TestSyncOutgoingRecord,
    },
    translations::{
        translate_changelogs_to_sync_records, PushSyncRecord, ToSyncRecordTranslationType,
    },
};
use repository::{
    mock::{mock_store_b, MockData, MockDataInserts},
    test_db, ChangelogRepository, KeyType, KeyValueStoreRow, SyncBufferRow,
    SyncBufferRowRepository,
};
use util::inline_init;

use super::{
    insert_all_extra_data,
    test_data::{
        get_all_pull_delete_central_test_records, get_all_pull_delete_remote_test_records,
        get_all_pull_upsert_central_test_records, get_all_pull_upsert_remote_test_records,
    },
};

#[actix_rt::test]
async fn test_sync_pull_and_push() {
    // Uncomment to see logs such as Foreign key constraint failed in test
    // util::init_logger(util::LogLevel::Warn);

    let (_, connection, _, _) = test_db::setup_all_with_data(
        "test_sync_pull_and_push",
        MockDataInserts::all(),
        inline_init(|r: &mut MockData| {
            r.key_value_store_rows = vec![inline_init(|r: &mut KeyValueStoreRow| {
                r.id = KeyType::SettingsSyncSiteId;
                // This is needed for invoice line, since we check if it belongs to current site in translator
                r.value_int = Some(mock_store_b().site_id);
            })]
        }),
    )
    .await;

    // Get push cursor before inserting pull data (so that we can test push, excluding inserted mock data)
    let push_cursor = ChangelogRepository::new(&connection)
        .latest_cursor()
        .unwrap()
        + 1;

    // PULL UPSERT
    let test_records = vec![
        get_all_pull_upsert_central_test_records(),
        get_all_pull_upsert_remote_test_records(),
    ]
    .into_iter()
    .flatten()
    .collect();

    insert_all_extra_data(&test_records, &connection).await;
    let sync_records: Vec<SyncBufferRow> = extract_sync_buffer_rows(&test_records);

    SyncBufferRowRepository::new(&connection)
        .upsert_many(&sync_records)
        .unwrap();

    integrate_and_translate_sync_buffer(&connection, None, None).unwrap();

    check_test_records_against_database(&connection, test_records).await;

    // PUSH UPSERT
    let mut test_records = vec![get_all_push_test_records(), get_all_sync_v6_records()]
        .into_iter()
        .flatten()
        .collect::<Vec<TestSyncOutgoingRecord>>();

    // Not using get_sync_push_changelogs_filter, since this test uses record integrated via sync as push records
    // which are usually filtered out via is_sync_updated flag
    // let change_log_filter = get_sync_push_changelogs_filter(&connection).unwrap();

    // Records would have been inserted in test Pull Upsert and trigger should have inserted changelogs
    let changelogs = ChangelogRepository::new(&connection)
        .changelogs(push_cursor, 100000, None /*change_log_filter*/)
        .unwrap();
    // Translate
    let mut translated = vec![
        translate_changelogs_to_sync_records(
            &connection,
            changelogs.clone(),
            ToSyncRecordTranslationType::PushToLegacyCentral,
        )
        .unwrap(),
        translate_changelogs_to_sync_records(
            &connection,
            changelogs.clone(),
            ToSyncRecordTranslationType::PullFromOmSupplyCentral,
        )
        .unwrap(),
    ]
    .into_iter()
    .flatten()
    .collect::<Vec<PushSyncRecord>>();

    // Combine and sort
    translated.sort_by(|a, b| match a.record.table_name.cmp(&b.record.table_name) {
        std::cmp::Ordering::Equal => a.record.record_id.cmp(&b.record.record_id),
        other => other,
    });
    test_records.sort_by(|a, b| match a.table_name.cmp(&b.table_name) {
        std::cmp::Ordering::Equal => a.record_id.cmp(&b.record_id),
        other => other,
    });

    // Test ids and table names
    assert_eq!(
        translated
            .iter()
            .map(|r| (r.record.record_id.clone(), r.record.table_name.clone()))
            .collect::<Vec<(String, String)>>(),
        test_records
            .iter()
            .map(|r| (r.record_id.clone(), r.table_name.clone()))
            .collect::<Vec<(String, String)>>()
    );
    // Test data
    for (index, test_record) in test_records.iter().enumerate() {
        assert_eq!(test_record.push_data, translated[index].record.record_data);
        assert_eq!(translated[index].record.action, SyncAction::Update)
    }

    // PULL DELETE
    let test_records = vec![
        get_all_pull_delete_central_test_records(),
        get_all_pull_delete_remote_test_records(),
    ]
    .into_iter()
    .flatten()
    .collect();
    insert_all_extra_data(&test_records, &connection).await;
    let sync_records: Vec<SyncBufferRow> = extract_sync_buffer_rows(&test_records);

    SyncBufferRowRepository::new(&connection)
        .upsert_many(&sync_records)
        .unwrap();

    integrate_and_translate_sync_buffer(&connection, None, None).unwrap();

    check_test_records_against_database(&connection, test_records).await;

    // PUSH DELETE
    // TODO
}

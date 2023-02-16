use crate::sync::{
    api::SyncActionV5,
    get_active_records_on_site_filter,
    synchroniser::integrate_and_translate_sync_buffer,
    test::{
        check_test_records_against_database, extract_sync_buffer_rows,
        test_data::get_all_push_test_records,
    },
    translations::translate_changelogs_to_push_records,
};
use repository::{
    mock::{mock_store_b, MockData, MockDataInserts},
    test_db, ChangelogRepository, KeyValueStoreRow, KeyValueType, SyncBufferRow,
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
    // util::init_logger(util::LogLevel::Warn);

    let (_, connection, _, _) = test_db::setup_all_with_data(
        "test_sync_pull_and_push",
        MockDataInserts::all(),
        inline_init(|r: &mut MockData| {
            r.key_value_store_rows = vec![inline_init(|r: &mut KeyValueStoreRow| {
                r.id = KeyValueType::SettingsSyncSiteId;
                // This is needed for invoice line, since we check if it belongs to current site in translator
                r.value_int = Some(mock_store_b().site_id);
            })]
        }),
    )
    .await;

    // Get push cursor before inserting pull data (so that we can test push)
    let push_cursor = ChangelogRepository::new(&connection)
        .latest_cursor()
        .unwrap()
        + 1;

    // PULL UPSERT
    let test_records = vec![
        get_all_pull_upsert_central_test_records(),
        get_all_pull_upsert_remote_test_records(),
    ]
    .concat();
    insert_all_extra_data(&test_records, &connection).await;
    let sync_records: Vec<SyncBufferRow> = extract_sync_buffer_rows(&test_records);

    SyncBufferRowRepository::new(&connection)
        .upsert_many(&sync_records)
        .unwrap();

    integrate_and_translate_sync_buffer(&connection, true).unwrap();

    check_test_records_against_database(&connection, test_records).await;

    // PUSH UPSERT
    let mut test_records = get_all_push_test_records();
    let change_log_filter = get_active_records_on_site_filter(&connection).unwrap();
    // Records would have been inserted in test Pull Upsert and trigger should have inserted changelogs
    let changelogs = ChangelogRepository::new(&connection)
        .changelogs(push_cursor, 100000, change_log_filter)
        .unwrap();
    // Translate and sort
    let mut translated =
        translate_changelogs_to_push_records(&connection, changelogs.clone()).unwrap();
    translated.sort_by(|a, b| a.record.record_id.cmp(&b.record.record_id));
    test_records.sort_by(|a, b| a.record_id.cmp(&b.record_id));
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
        assert_eq!(test_record.push_data, translated[index].record.data);
        assert_eq!(translated[index].record.action, SyncActionV5::Update)
    }

    // PULL DELETE
    let test_records = vec![
        get_all_pull_delete_central_test_records(),
        get_all_pull_delete_remote_test_records(),
    ]
    .concat();
    insert_all_extra_data(&test_records, &connection).await;
    let sync_reords: Vec<SyncBufferRow> = extract_sync_buffer_rows(&test_records);

    SyncBufferRowRepository::new(&connection)
        .upsert_many(&sync_reords)
        .unwrap();

    integrate_and_translate_sync_buffer(&connection, true).unwrap();

    check_test_records_against_database(&connection, test_records).await;

    // PUSH DELETE
    // TODO
}

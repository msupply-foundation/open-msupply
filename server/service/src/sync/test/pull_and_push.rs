use crate::sync::{
    remote_data_synchroniser::translate_changelogs_to_push_records,
    synchroniser::integrate_and_translate_sync_buffer,
    test::{
        check_test_records_against_database, extract_sync_buffer_rows,
        test_data::get_all_push_test_records,
    },
    translations::table_name_to_central,
};
use repository::{
    mock::{mock_store_b, MockData, MockDataInserts},
    test_db, KeyValueStoreRow, KeyValueType, SyncBufferRow, SyncBufferRowRepository,
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

    // Test Pull Upsert
    let test_records = vec![
        get_all_pull_upsert_central_test_records(),
        get_all_pull_upsert_remote_test_records(),
    ]
    .concat();
    insert_all_extra_data(&test_records, &connection).await;
    let sync_reords: Vec<SyncBufferRow> = extract_sync_buffer_rows(&test_records);

    SyncBufferRowRepository::new(&connection)
        .upsert_many(&sync_reords)
        .unwrap();

    integrate_and_translate_sync_buffer(&connection).unwrap();

    check_test_records_against_database(&connection, test_records).await;

    // Test Push
    let test_records = get_all_push_test_records();
    for test_record in test_records {
        let expected_record_id = test_record.change_log.record_id.to_string();
        let expected_table_name = table_name_to_central(&test_record.change_log.table_name);
        let mut result =
            translate_changelogs_to_push_records(&connection, vec![test_record.change_log.clone()])
                .unwrap();
        // we currently only have one entry in the data_list
        let result = result
            .pop()
            .expect(&format!("Could not translate {:#?}", test_record));
        let record = result.record;

        assert_eq!(record.record_id, expected_record_id);
        assert_eq!(record.table_name, expected_table_name);
        assert_eq!(record.data, test_record.push_data);
    }

    // Test Pull Delete
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

    integrate_and_translate_sync_buffer(&connection).unwrap();

    check_test_records_against_database(&connection, test_records).await;
}

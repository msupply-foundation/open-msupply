use crate::sync::{
    remote_data_synchroniser::translate_changelogs_to_push_records,
    synchroniser::integrate_and_translate_sync_buffer,
    test::{
        check_records_against_database, extract_sync_buffer_rows,
        test_data::{get_all_pull_test_records, get_all_push_test_records},
    },
    translations::table_name_to_central,
};
use repository::{mock::MockDataInserts, test_db, SyncBufferRow, SyncBufferRowRepository};
use util::{init_logger, LogLevel};

#[actix_rt::test]
async fn test_sync_pull_and_push() {
    init_logger(LogLevel::Warn);

    let (_, connection, _, _) =
        test_db::setup_all("test_sync_pull_and_push", MockDataInserts::all()).await;

    let test_records = get_all_pull_test_records();
    let sync_reords: Vec<SyncBufferRow> = extract_sync_buffer_rows(&test_records);

    // Test Pull
    SyncBufferRowRepository::new(&connection)
        .upsert_many(&sync_reords)
        .unwrap();

    integrate_and_translate_sync_buffer(&connection).unwrap();

    check_records_against_database(&connection, test_records).await;

    // Test Push
    let test_records = get_all_push_test_records();
    for record in test_records {
        let expected_row_id = record.change_log.row_id.to_string();
        let expected_table_name = table_name_to_central(&record.change_log.table_name);
        let mut result =
            translate_changelogs_to_push_records(&connection, vec![record.change_log.clone()])
                .unwrap();
        // we currently only have one entry in the data_list
        let result = result
            .pop()
            .expect(&format!("Could not translate {:#?}", record));
        // tests only do upsert right now, so there must be Some data:
        let data = result.data.unwrap();

        assert_eq!(result.record_id, expected_row_id);
        assert_eq!(result.record_type, expected_table_name);
        assert_eq!(data, record.push_data);
    }
}

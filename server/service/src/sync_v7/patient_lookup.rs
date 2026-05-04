use repository::{
    syncv7::SyncError, KeyType, KeyValueStoreRepository, SyncBufferRepository, SyncBufferRowInsert,
};

use crate::{
    service_provider::ServiceProvider,
    sync_v7::{
        api::{patient_data_for_site, Common, SyncApiV7},
        sync::sync_record_to_buffer_row,
        validate_translate_integrate::{validate_translate_integrate, SyncContext},
    },
};

/// Pulls all data for a single patient from central, writes it to sync_buffer
/// with `reference = "patient_<id>"`, then integrates only those rows.
pub async fn pull_and_integrate_patient_data(
    service_provider: &ServiceProvider,
    patient_id: &str,
    store_id: &str,
    name_store_join_id: &str,
) -> Result<String, SyncError> {
    let ctx = service_provider
        .basic_context()
        .map_err(|e| SyncError::Other(e.to_string()))?;
    let connection = &ctx.connection;

    let settings = service_provider
        .settings
        .sync_settings(&ctx)?
        .ok_or_else(|| SyncError::Other("Sync settings not configured".to_string()))?;

    let common = Common::load(service_provider)?;
    let auth_headers = common.to_auth_headers()?;
    let api = SyncApiV7 {
        url: settings
            .url
            .parse()
            .map_err(|e: url::ParseError| SyncError::ConnectionError {
                url: settings.url.clone(),
                e: format!("Failed to parse central server url: {e}"),
            })?,
        auth_headers,
    };

    let reference = format!("patient_{patient_id}");
    let batch_size = settings.batch_size.remote_pull;

    let mut nsj_id: Option<String> = None;
    let mut cursor: i64 = 0;
    loop {
        let response = api
            .patient_data_for_site(patient_data_for_site::Input {
                cursor,
                batch_size,
                patient_id: patient_id.to_string(),
                store_id: store_id.to_string(),
                name_store_join_id: name_store_join_id.to_string(),
            })
            .await?;

        if cursor == 0 {
            nsj_id = response.name_store_join_id.clone();
        }

        let batch = response.batch;
        let central_site_id = batch.site_id;
        let record_count = batch.records.len();

        let Some(batch_max_cursor) = batch.records.last().map(|r| r.cursor) else {
            break;
        };

        let rows: Vec<SyncBufferRowInsert> = batch
            .records
            .into_iter()
            .map(|r| {
                let mut row = sync_record_to_buffer_row(r, central_site_id, None);
                row.reference = Some(reference.clone());
                row
            })
            .collect();

        connection
            .transaction_sync(|con| SyncBufferRepository::new(con).insert_many(&rows))
            .map_err(|e| e.to_inner_error())?;

        cursor = batch_max_cursor;

        if record_count < batch_size as usize {
            break;
        }
    }

    let central_site_id = KeyValueStoreRepository::new(connection)
        .get_i32(KeyType::SettingsSyncCentralServerSiteId)?
        .ok_or_else(|| SyncError::Other("Central server site id not configured".to_string()))?;

    validate_translate_integrate(
        connection,
        None,
        central_site_id,
        Some(&reference),
        SyncContext::PatientLookup,
    )?;

    nsj_id
        .ok_or_else(|| SyncError::Other("Central did not return a name_store_join_id".to_string()))
}

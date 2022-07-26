mod central;
mod central_server_configurations;
mod errors;
mod remote;
mod site_info;

use std::{error::Error, future::Future};

use self::central_server_configurations::NewSiteProperties;
use crate::{
    service_provider::ServiceProvider,
    sync::{
        settings::SyncSettings,
        synchroniser::Synchroniser,
        translations::{IntegrationRecords, PullDeleteRecord},
    },
};
use actix_web::web::Data;
use repository::{mock::MockDataInserts, test_db::setup_all, StorageConnection};

async fn init_db(sync_settings: &SyncSettings, step: &str) -> (StorageConnection, Synchroniser) {
    let (_, connection, connection_manager, _) = setup_all(
        &format!("sync_integration_{}_tests", step),
        MockDataInserts::none(),
    )
    .await;

    let service_provider = Data::new(ServiceProvider::new(connection_manager.clone(), "app_data"));
    let synchroniser = Synchroniser::new(sync_settings.clone(), service_provider).unwrap();

    (connection, synchroniser)
}

struct TestStepData {
    central_upsert: serde_json::Value,
    central_delete: serde_json::Value,
    integration_records: IntegrationRecords,
}

impl IntegrationRecords {
    fn from_deletes(rows: Vec<PullDeleteRecord>) -> IntegrationRecords {
        IntegrationRecords {
            upserts: Vec::new(),
            deletes: rows,
        }
    }
}

trait SyncRecordTester {
    /// Get central data upsert and integration records
    fn test_step_data(&self, new_site_properties: &NewSiteProperties) -> Vec<TestStepData>;
}

// Sometime central server returns unexpected errors
// this seems to happen when it's `overloaded` (when multiple requests are fired up at once)
// ingore these errors in integration tests
const NUMBER_OF_RETRIES: u32 = 5;
async fn with_retry<T, E, F, Fut>(f: F) -> Result<T, E>
where
    F: Fn() -> Fut,
    Fut: Future<Output = Result<T, E>>,
    E: Error,
{
    let mut retries = 0;
    loop {
        let error = match f().await {
            Ok(result) => return Ok(result),
            Err(error) => error,
        };

        let error_string = format!("{}", error);

        if error_string.contains("Site record locked preventing authentication update")
            || error_string.contains("connection closed before message completed")
            || error_string.contains("os error 54")
        {
            retries += 1;

            if retries >= NUMBER_OF_RETRIES {
                return Err(error);
            }
        } else {
            return Err(error);
        }
    }
}

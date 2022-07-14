mod central;
mod central_server_configurations;
mod errors;
mod remote;

use std::time::Duration;

use crate::{
    service_provider::ServiceProvider,
    sync::{
        settings::SyncSettings,
        synchroniser::Synchroniser,
        translations::{IntegrationRecords, PullDeleteRecord},
    },
};
use actix_web::web::Data;
use rand::{thread_rng, Rng};
use repository::{mock::MockDataInserts, test_db::setup_all, StorageConnection};

use self::central_server_configurations::NewSiteProperties;

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

async fn random_timeout() {
    let duration = Duration::from_millis(thread_rng().gen_range(10..1000));
    tokio::time::sleep(duration).await;
}

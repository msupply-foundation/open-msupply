mod central;
mod central_server_configurations;
mod errors;
mod omsupply_central;
mod remote;
mod site_info;
mod transfer;

use self::central_server_configurations::NewSiteProperties;
use crate::{
    service_provider::ServiceProvider,
    sync::{
        settings::SyncSettings, synchroniser::Synchroniser, translations::IntegrationOperation,
    },
    test_helpers::{setup_all_and_service_provider, ServiceTestContext},
};
use repository::{mock::MockDataInserts, StorageConnection};
use serde::Serialize;
use serde_json::json;
use std::{error::Error, future::Future, sync::Arc};
use tokio::task::JoinHandle;

struct SyncIntegrationContext {
    connection: StorageConnection,
    synchroniser: Synchroniser,
    service_provider: Arc<ServiceProvider>,
    processors_task: JoinHandle<()>,
}

async fn init_test_context(
    sync_settings: &SyncSettings,
    identifier: &str,
) -> SyncIntegrationContext {
    let ServiceTestContext {
        connection,
        service_provider,
        processors_task,
        service_context,
        ..
    } = setup_all_and_service_provider(
        &format!("sync_integration_{}_tests", identifier),
        MockDataInserts::none(),
    )
    .await;

    service_provider
        .site_info_service
        .request_and_set_site_info(&service_provider, &sync_settings)
        .await
        .unwrap();
    service_provider
        .settings
        .update_sync_settings(&service_context, sync_settings)
        .unwrap();

    let synchroniser =
        Synchroniser::new(sync_settings.clone(), service_provider.clone().into()).unwrap();

    SyncIntegrationContext {
        connection,
        synchroniser,
        service_provider,
        processors_task,
    }
}

#[derive(Default, Serialize)]
pub(crate) struct GraphqlRequest {
    query: String,
    variables: serde_json::Value,
}
struct TestStepData {
    central_upsert: serde_json::Value,
    central_delete: serde_json::Value,
    integration_records: Vec<IntegrationOperation>,
    om_supply_central_graphql_operations: Vec<GraphqlRequest>,
}

impl Default for TestStepData {
    fn default() -> Self {
        Self {
            central_upsert: json!({}),
            central_delete: json!({}),
            integration_records: Default::default(),
            om_supply_central_graphql_operations: Default::default(),
        }
    }
}

trait SyncRecordTester {
    /// Get central data upsert and integration records
    fn test_step_data(&self, new_site_properties: &NewSiteProperties) -> Vec<TestStepData>;
}

// Sometime central server returns unexpected errors
// this seems to happen when it's `overloaded` (when multiple requests are fired up at once)
// ignore these errors in integration tests
const NUMBER_OF_RETRIES: u32 = 5;
async fn with_retry<T, E, F, Fut>(f: F) -> Result<T, E>
where
    F: Fn() -> Fut,
    Fut: Future<Output = Result<T, E>>,
    E: Error,
{
    let mut retries = 0;
    loop {
        // Reduce chance concurrent operations running at the same time (when tests all start at once)
        random_delay(10, 50).await;
        let error = match f().await {
            Ok(result) => return Ok(result),
            Err(error) => error,
        };
        let error_string = format!("{}", error);

        if error_string.contains("Site record locked preventing authentication update")
            || error_string.contains("connection closed before message completed")
            || error_string.contains("os error 54")
            || error_string.contains("site_name_not_found")
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

async fn random_delay(min_millisecond: u64, max_millisecond: u64) {
    use rand::prelude::*;
    let diff = max_millisecond - min_millisecond;
    // .gen::<f64>() generates a float between 0 and 1
    let delay_millisecond =
        (rand::thread_rng().gen::<f64>() * diff as f64) as u64 + min_millisecond;
    tokio::time::sleep(std::time::Duration::from_millis(delay_millisecond)).await;
}

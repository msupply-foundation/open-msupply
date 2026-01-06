mod central;
mod central_server_configurations;
mod errors;
mod omsupply_central;
mod remote;
mod site_info;
mod transfer;

use self::central_server_configurations::NewSiteProperties;
use crate::{
    sync::{
        synchroniser::Synchroniser, translation_and_integration::integrate,
        translations::IntegrationOperation,
    },
    test_helpers::{setup_all_and_service_provider, ServiceTestContext},
};
use central_server_configurations::{ConfigureCentralServer, SiteConfiguration};
use repository::{mock::MockDataInserts, ChangelogRepository, StorageConnection};
use serde::Serialize;
use serde_json::json;
use std::{error::Error, future::Future};

pub(super) struct FullSiteConfig {
    config: SiteConfiguration,
    context: ServiceTestContext,
    synchroniser: Synchroniser,
}

pub(super) async fn init_test_context(
    config: SiteConfiguration,
    identifier: &str,
) -> FullSiteConfig {
    let context = setup_all_and_service_provider(
        &format!("sync_integration_{}_tests", identifier),
        MockDataInserts::none(),
    )
    .await;

    let ServiceTestContext {
        service_provider,
        service_context,
        ..
    } = &context;

    let SiteConfiguration { sync_settings, .. } = &config;

    service_provider
        .site_info_service
        .request_and_set_site_info(service_provider, sync_settings)
        .await
        .unwrap();
    service_provider
        .settings
        .update_sync_settings(&service_context, sync_settings)
        .unwrap();

    let synchroniser =
        Synchroniser::new(sync_settings.clone(), service_provider.clone().into()).unwrap();

    FullSiteConfig {
        config,
        context,
        synchroniser,
    }
}

pub(super) async fn create_site(identifier: &str, visible_name_ids: Vec<String>) -> FullSiteConfig {
    let config = ConfigureCentralServer::from_env()
        .create_sync_site(visible_name_ids)
        .await
        .expect("Problem creating sync site");

    init_test_context(config, identifier).await
}

#[derive(Default, Serialize)]
pub(crate) struct GraphqlRequest {
    query: String,
    variables: serde_json::Value,
}
#[derive(Default)]
struct TestStepData {
    central_upsert: serde_json::Value,
    central_delete: serde_json::Value,
    integration_records: Vec<IntegrationOperation>,
    om_supply_central_graphql_operations: Vec<GraphqlRequest>,
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

pub(crate) fn integrate_with_is_sync_reset(
    connection: &StorageConnection,
    integrations: Vec<IntegrationOperation>,
) -> Vec<IntegrationOperation> {
    let changelog_repo = ChangelogRepository::new(&connection);
    let cursor = changelog_repo.latest_cursor().unwrap();
    // Need to reset is_sync_update since we've inserted test data with sync methods
    // they need to sync to central (if is_sync_update is set to true they will not sync to central)
    let integrations: Vec<(Option<_>, IntegrationOperation)> =
        integrations.into_iter().map(|i| (None, i)).collect();
    integrate(&connection, &integrations).unwrap();
    changelog_repo.reset_is_sync_update(cursor).unwrap();

    integrations.into_iter().map(|(_, i)| i).collect()
}

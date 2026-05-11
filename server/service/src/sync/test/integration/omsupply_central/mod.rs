mod asset;
mod plugin_data;
mod test;
mod vaccine_card;

use std::time::Duration;

use reqwest::Client;
use url::Url;
use util::assert_variant;

use crate::sync::{
    test::{
        check_integrated,
        integration::{
            central_server_configurations::ConfigureCentralServer, create_site, init_test_context,
            integrate_with_is_sync_reset,
        },
    },
    CentralServerConfig,
};

use super::{GraphqlRequest, SyncRecordTester};

/// For each test step:
/// Upsert data to omSupply central via graphql
/// Synchronise remote site
/// Check integrated records exit
async fn test_omsupply_central_records(identifier: &str, tester: &dyn SyncRecordTester) {
    // util::init_logger(util::LogLevel::Info);
    // Without re-initialisation
    println!("test_omsupply_central_records{}_init", identifier);

    let central_server_configurations = ConfigureCentralServer::from_env();
    let site_config = create_site(identifier, vec![]).await;

    let steps_data = tester.test_step_data(&site_config.config.new_site_properties);
    // First sync is required to get central server URL (before graphql queries are called)
    site_config.synchroniser.sync(None).await.unwrap();

    let CentralServerConfig::CentralServerUrl(central_server_url) = CentralServerConfig::get()
    else {
        panic!("Not a remote site or central server not configured in legacy mSupply");
    };

    for (index, step_data) in steps_data.into_iter().enumerate() {
        println!(
            "test_omsupply_central_records_{}_step{}",
            identifier,
            index + 1
        );

        central_server_configurations
            .upsert_records(step_data.central_upsert)
            .await
            .expect("Problem inserting central data");

        // Sync omSupply central server first
        sync_omsupply_central(&central_server_url).await;
        // Integrate omSupply central server records via graphql
        for graphql_operation in step_data.om_supply_central_graphql_operations {
            graphql(&central_server_url, graphql_operation).await;
        }

        site_config.synchroniser.sync(None).await.unwrap();
        check_integrated(
            &site_config.context.connection,
            &step_data.integration_records,
        )
    }
}

/// For each test step:
/// Upsert data to database
/// Push changes to central server
/// Reinitialises from central server with a fresh database
/// Check that pulled data matches previously upserted data
async fn test_omsupply_central_remote_records(identifier: &str, tester: &dyn SyncRecordTester) {
    // util::init_logger(util::LogLevel::Info);
    // Without re-initialisation
    println!("test_omsupply_central_remote_records{}_init", identifier);

    let central_server_configurations = ConfigureCentralServer::from_env();
    let mut site_config = create_site(identifier, vec![]).await;

    let steps_data = tester.test_step_data(&site_config.config.new_site_properties);
    // First sync is required to get central server URL (before graphql queries are called)
    site_config.synchroniser.sync(None).await.unwrap();

    let central_server_url = assert_variant!(CentralServerConfig::get(), CentralServerConfig::CentralServerUrl(url) => url);

    let mut previous_connection = site_config.context.connection;
    let mut previous_synchroniser = site_config.synchroniser;

    for (index, step_data) in steps_data.into_iter().enumerate() {
        let inner_identifier = format!("{}_step_{}", identifier, index + 1);
        println!("test_omsupply_central_remote_records_{}", inner_identifier);

        central_server_configurations
            .upsert_records(step_data.central_upsert)
            .await
            .expect("Problem inserting central data");

        // Sync omSupply central server first
        sync_omsupply_central(&central_server_url).await;
        // Integrate omSupply central server records via graphql
        for graphql_operation in step_data.om_supply_central_graphql_operations {
            graphql(&central_server_url, graphql_operation).await;
        }

        previous_synchroniser.sync(None).await.unwrap();

        let integration_records = step_data.integration_records;

        // Integrate
        let integration_records =
            integrate_with_is_sync_reset(&previous_connection, integration_records); // Push integrated changes
        previous_synchroniser.sync(None).await.unwrap();
        // Re initialise
        site_config = init_test_context(site_config.config, &inner_identifier).await;
        previous_connection = site_config.context.connection;
        previous_synchroniser = site_config.synchroniser;
        previous_synchroniser.sync(None).await.unwrap();

        // Confirm records have synced back correctly
        check_integrated(&previous_connection, &integration_records)
    }
}

// Helper for graphql queries
async fn graphql(url: &str, graphql: GraphqlRequest) -> serde_json::Value {
    let mut url = Url::parse(url).unwrap();
    url = url.join("graphql").unwrap();

    let result = Client::new()
        .post(url.clone())
        .body(serde_json::to_string(&graphql).unwrap())
        .send()
        .await;

    let response_text = result.unwrap().text().await.unwrap();

    let response_json: serde_json::Value = serde_json::from_str(&response_text).unwrap();

    assert_eq!(
        response_json.get("errors").is_some(),
        false,
        "graphql responded with error {}",
        serde_json::to_string_pretty(&response_json).unwrap()
    );

    response_json.get("data").unwrap().to_owned()
}

// Call manual sync mutation and then wait for synchronisation
pub(crate) async fn sync_omsupply_central(url: &str) {
    graphql(
        url,
        GraphqlRequest {
            query: "mutation { manualSync }".to_string(),
            ..Default::default()
        },
    )
    .await;

    loop {
        // TODO max timeout ? or log output every X seconds
        tokio::time::sleep(Duration::from_secs(1)).await;
        let result = graphql(
            url,
            GraphqlRequest {
                query: r#" 
                    query {
                        latestSyncStatus {
                            isSyncing
                            error {
                                fullError
                            }
                        }
                    }
                "#
                .to_string(),

                ..Default::default()
            },
        )
        .await;

        let status = result.get("latestSyncStatus").unwrap();
        // Make sure there are not errors
        assert_eq!(status.get("error"), Some(&serde_json::Value::Null));

        if let Some(serde_json::Value::Bool(false)) = status.get("isSyncing") {
            break;
        }
    }
}

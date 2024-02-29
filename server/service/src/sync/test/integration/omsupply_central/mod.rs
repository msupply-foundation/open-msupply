mod pack_variant;
mod test;

use std::time::Duration;

use reqwest::Client;

use crate::sync::{
    api_v6::get_omsupply_central_url,
    settings::SyncSettings,
    test::{
        check_integrated,
        integration::{
            central_server_configurations::{ConfigureCentralServer, SiteConfiguration},
            init_test_context, SyncIntegrationContext,
        },
    },
};

use super::{GraphqlRequest, SyncRecordTester};

async fn test_omsupply_central_records(identifier: &str, tester: &dyn SyncRecordTester) {
    // util::init_logger(util::LogLevel::Info);
    // Without re-initialisation
    println!("test_omsupply_central_records{}_init", identifier);

    let central_server_configurations = ConfigureCentralServer::from_env();
    let SiteConfiguration {
        new_site_properties,
        sync_settings,
    } = central_server_configurations
        .create_sync_site(vec![])
        .await
        .expect("Problem creating sync site");

    let SyncIntegrationContext {
        connection,
        synchroniser,
        ..
    } = init_test_context(&sync_settings, &identifier).await;

    let steps_data = tester.test_step_data(&new_site_properties);

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
        sync_omsupply_central(&sync_settings).await;
        // Integrate omSupply central server records via graphql
        for graphql_operation in step_data.om_supply_central_graphql_operations {
            graphql(&sync_settings, graphql_operation).await;
        }

        synchroniser.sync().await.unwrap();
        check_integrated(&connection, step_data.integration_records)
    }
}

// Helper for graphql queries
async fn graphql(sync_settings: &SyncSettings, graphql: GraphqlRequest) -> serde_json::Value {
    let mut url = get_omsupply_central_url(&sync_settings.url).unwrap();
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
async fn sync_omsupply_central(sync_settings: &SyncSettings) {
    graphql(
        sync_settings,
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
            sync_settings,
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

mod inventory_adjustment_reason;
mod master_list;
mod name_and_store_and_name_store_join;
mod report;
mod test;
mod unit_and_item;
mod user_permission;

use std::sync::{Arc, RwLock};

use super::{central_server_configurations::ConfigureCentralServer, SyncRecordTester};
use crate::{
    auth_data::AuthData,
    login::{LoginInput, LoginService},
    service_provider::ServiceProvider,
    sync::test::{
        check_records_against_database,
        integration::{
            central_server_configurations::SiteConfiguration, init_test_context,
            SyncIntegrationContext,
        },
    },
    token_bucket::TokenBucket,
};

/// Updates central server with data specified from each step of tester
/// Synchronises after each step and checks against step data
///
/// Do update for each step and re-initialise and check against the step data

async fn test_central_sync_record(identifier: &str, tester: &dyn SyncRecordTester) {
    // util::init_logger(util::LogLevel::Info);
    // Without re-initialisation
    println!("test_central_sync_record_{}_init", identifier);

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
        service_provider,
        ..
    } = init_test_context(&sync_settings, &identifier).await;

    let steps_data = tester.test_step_data(&new_site_properties);

    for (index, step_data) in steps_data.into_iter().enumerate() {
        println!("test_central_sync_record_{}_step{}", identifier, index + 1);

        central_server_configurations
            .upsert_records(step_data.central_upsert)
            .await
            .expect("Problem inserting central data");

        central_server_configurations
            .delete_records(step_data.central_delete)
            .await
            .expect("Problem deleting central data");

        login_user(&sync_settings.url, &service_provider).await;
        synchroniser.sync().await.unwrap();
        check_records_against_database(&connection, step_data.integration_records).await;
    }

    // With re-initialisation
    let identifier = format!("with_reinit_{}", identifier);
    println!("test_central_sync_record_{}_init", identifier);

    let central_server_configurations = ConfigureCentralServer::from_env();
    let SiteConfiguration {
        new_site_properties,
        sync_settings,
    } = central_server_configurations
        .create_sync_site(vec![])
        .await
        .expect("Problem creating sync site");

    let steps_data = tester.test_step_data(&new_site_properties);
    for (index, step_data) in steps_data.into_iter().enumerate() {
        let inner_identifier = format!("{}_step_{}", identifier, index + 1);
        println!("test_central_sync_record_{}", inner_identifier);

        central_server_configurations
            .upsert_records(step_data.central_upsert)
            .await
            .expect("Problem inserting central data");

        central_server_configurations
            .delete_records(step_data.central_delete)
            .await
            .expect("Problem deleting central data");

        let SyncIntegrationContext {
            connection,
            synchroniser,
            service_provider,
            ..
        } = init_test_context(&sync_settings, &inner_identifier).await;
        login_user(&sync_settings.url, &service_provider).await;

        synchroniser.sync().await.unwrap();
        check_records_against_database(&connection, step_data.integration_records).await;
    }
}

async fn login_user(url: &str, service_provider: &ServiceProvider) {
    let input = LoginInput {
        username: "test_user".to_string(),
        password: "pass".to_string(),
        central_server_url: url.to_string(),
    };
    let auth_data = AuthData {
        auth_token_secret: "secret".to_string(),
        token_bucket: Arc::new(RwLock::new(TokenBucket::new())),
        no_ssl: true,
        debug_no_access_control: false,
    };
    LoginService::login(service_provider, &auth_data, input, 100)
        .await
        .expect("Problem logging in user");
}

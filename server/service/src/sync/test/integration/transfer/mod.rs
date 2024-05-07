mod requisition;
mod returns;
mod shipments;
use super::{
    central_server_configurations::{ConfigureCentralServer, SiteConfiguration},
    SyncIntegrationContext,
};
use crate::{
    service_provider::ServiceProvider,
    sync::{synchroniser::Synchroniser, test::integration::init_test_context},
};
use repository::{StorageConnection, StoreRow, StoreRowRepository};
use serde_json::json;
use std::{sync::Arc, time::Duration};
use tokio::task::JoinHandle;
use util::uuid::uuid;

struct SiteContext {
    connection: StorageConnection,
    service_provider: Arc<ServiceProvider>,
    store: StoreRow,
    config: SiteConfiguration,
    synchroniser: Synchroniser,
}

struct SyncIntegrationTransferContext {
    site_1: SiteContext,
    site_1_processors_task: JoinHandle<()>,
    site_2: SiteContext,
    site_2_processors_task: JoinHandle<()>,
}

async fn initialise_transfer_sites(
    central_data: serde_json::Value,
    identifier: &str,
) -> SyncIntegrationTransferContext {
    let central_server_configurations = ConfigureCentralServer::from_env();

    let site_1_config = central_server_configurations
        .create_sync_site(vec![])
        .await
        .expect("Problem creating sync site");

    let site_2_config = central_server_configurations
        .create_sync_site(vec![site_1_config.new_site_properties.name_id.clone()])
        .await
        .expect("Problem creating sync site");

    let site_1_context = init_test_context(
        &site_1_config.sync_settings,
        &format!("{}_site1", identifier),
    )
    .await;
    let site_2_context = init_test_context(
        &site_2_config.sync_settings,
        &format!("{}_site2", identifier),
    )
    .await;

    let name_store_join1 = json!({
        "ID": uuid(),
        "name_ID": site_2_config.new_site_properties.name_id,
        "store_ID": site_1_config.new_site_properties.store_id
    });

    let name_store_join2 = json!({
        "ID": uuid(),
        "name_ID": site_1_config.new_site_properties.name_id,
        "store_ID": site_2_config.new_site_properties.store_id
    });

    central_server_configurations
        .upsert_records(json!({
            "name_store_join": [name_store_join1, name_store_join2]
        }))
        .await
        .expect("Problem inserting central data");

    central_server_configurations
        .upsert_records(central_data)
        .await
        .expect("Problem inserting central data");

    site_1_context.synchroniser.sync().await.unwrap();
    site_2_context.synchroniser.sync().await.unwrap();

    let site_1_store = StoreRowRepository::new(&site_1_context.connection)
        .find_one_by_id(&site_1_config.new_site_properties.store_id)
        .unwrap()
        .unwrap();

    let site_2_store = StoreRowRepository::new(&site_1_context.connection)
        .find_one_by_id(&site_2_config.new_site_properties.store_id)
        .unwrap()
        .unwrap();

    let (site_1, site_1_processors_task) =
        to_site_context_and_processors_task(site_1_context, site_1_config, site_1_store);
    let (site_2, site_2_processors_task) =
        to_site_context_and_processors_task(site_2_context, site_2_config, site_2_store);

    SyncIntegrationTransferContext {
        site_1,
        site_1_processors_task,
        site_2,
        site_2_processors_task,
    }
}

fn to_site_context_and_processors_task(
    sync_context: SyncIntegrationContext,
    site_config: SiteConfiguration,
    store: StoreRow,
) -> (SiteContext, JoinHandle<()>) {
    (
        SiteContext {
            connection: sync_context.connection,
            service_provider: sync_context.service_provider,
            store,
            config: site_config,
            synchroniser: sync_context.synchroniser,
        },
        sync_context.processors_task,
    )
}

async fn new_instance_of_existing_site(
    existing_site: SiteContext,
    identifier: &str,
) -> (SiteContext, JoinHandle<()>) {
    let sync_context = init_test_context(
        &existing_site.config.sync_settings,
        &format!("{}_site2_2", identifier),
    )
    .await;

    to_site_context_and_processors_task(sync_context, existing_site.config, existing_site.store)
}

async fn sync_and_delay(site_1: &SiteContext, site_2: &SiteContext) {
    log::info!("syncing site {:?}", site_1.config);
    site_1.synchroniser.sync().await.unwrap();

    tokio::time::sleep(Duration::from_secs(1)).await;

    log::info!("syncing site {:?}", site_2.config);
    site_2.synchroniser.sync().await.unwrap();

    tokio::time::sleep(Duration::from_secs(1)).await;
}

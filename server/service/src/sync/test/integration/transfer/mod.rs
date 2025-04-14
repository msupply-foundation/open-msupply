mod requisition;
mod returns;
mod shipments;
use super::{
    central_server_configurations::{ConfigureCentralServer, SiteConfiguration},
    create_site, init_test_context, FullSiteConfig,
};
use crate::{service_provider::ServiceProvider, sync::synchroniser::Synchroniser};
use repository::{CurrencyRow, ItemRow, ItemType, StorageConnection, StoreRow, StoreRowRepository};
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
    item1: ItemRow,
    item2: ItemRow,
    service_item: ItemRow,
}

async fn initialise_transfer_sites(identifier: &str) -> SyncIntegrationTransferContext {
    let central_server_configurations = ConfigureCentralServer::from_env();

    let site1 = create_site(&format!("{}_site1", identifier), vec![]).await;

    let site2 = create_site(
        &format!("{}_site2", identifier,),
        vec![site1.config.new_site_properties.name_id.clone()],
    )
    .await;

    let name_store_join1 = json!({
        "ID": uuid(),
        "name_ID": site2.config.new_site_properties.name_id,
        "store_ID": site1.config.new_site_properties.store_id
    });

    let name_store_join2 = json!({
        "ID": uuid(),
        "name_ID": site1.config.new_site_properties.name_id,
        "store_ID": site2.config.new_site_properties.store_id
    });

    central_server_configurations
        .upsert_records(json!({
            "name_store_join": [name_store_join1, name_store_join2]
        }))
        .await
        .expect("Problem inserting central data");

    let (item1, item2, service_item, _currency, central_data) = items_and_currency();
    central_server_configurations
        .upsert_records(central_data)
        .await
        .expect("Problem inserting central data");

    site1.synchroniser.sync(None).await.unwrap();
    site2.synchroniser.sync(None).await.unwrap();

    let (site_1, site_1_processors_task) = to_site_context_and_processors_task(site1);
    let (site_2, site_2_processors_task) = to_site_context_and_processors_task(site2);

    SyncIntegrationTransferContext {
        site_1,
        site_1_processors_task,
        site_2,
        site_2_processors_task,
        item1,
        item2,
        service_item,
    }
}

fn to_site_context_and_processors_task(config: FullSiteConfig) -> (SiteContext, JoinHandle<()>) {
    let store = StoreRowRepository::new(&config.context.connection)
        .find_one_by_id(&config.config.new_site_properties.store_id)
        .unwrap()
        .unwrap();

    (
        SiteContext {
            connection: config.context.connection,
            service_provider: config.context.service_provider,
            store,
            config: config.config,
            synchroniser: config.synchroniser,
        },
        config.context.processors_task,
    )
}

fn items_and_currency() -> (ItemRow, ItemRow, ItemRow, CurrencyRow, serde_json::Value) {
    let item1 = ItemRow {
        id: uuid(),
        code: uuid(),
        ..Default::default()
    };

    let item2 = ItemRow {
        id: uuid(),
        code: uuid(),
        ..Default::default()
    };

    let service_item = ItemRow {
        id: uuid(),
        code: uuid(),
        r#type: ItemType::Service,
        ..Default::default()
    };

    let currency = CurrencyRow {
        id: String::from("currency_a"),
        code: String::from("USD"),
        rate: 1.0,
        is_home_currency: true,
        is_active: true,
        ..Default::default()
    };

    let json = json!({
        "item": [
            {"ID": item1.id, "type_of": "general", "code": item1.code},
            {"ID": item2.id, "type_of": "general", "code": item2.code},
            {"ID": service_item.id, "type_of": "service", "code": service_item.code},
        ],
        "currency": [
            {"ID": currency.id, "currency": currency.code, "rate": currency.rate, "is_home_currency": currency.is_home_currency}
        ]
    });

    (item1, item2, service_item, currency, json)
}

async fn new_instance_of_existing_site(
    config: SiteConfiguration,
    identifier: &str,
) -> (SiteContext, JoinHandle<()>) {
    let sync_context = init_test_context(config, &format!("{}_site2_2", identifier)).await;
    sync_context.synchroniser.sync(None).await.unwrap();
    to_site_context_and_processors_task(sync_context)
}

async fn sync_and_delay(site_1: &SiteContext, site_2: &SiteContext) {
    log::info!("syncing site {:?}", site_1.config);
    site_1.synchroniser.sync(None).await.unwrap();

    tokio::time::sleep(Duration::from_secs(1)).await;

    log::info!("syncing site {:?}", site_2.config);
    site_2.synchroniser.sync(None).await.unwrap();

    tokio::time::sleep(Duration::from_secs(1)).await;
}

use std::sync::Arc;

use actix_rt::task::JoinHandle;
use repository::{
    mock::{MockData, MockDataInserts},
    test_db::setup_all_with_data,
    StorageConnection, StorageConnectionManager,
};

use crate::{
    processors::Processors,
    service_provider::{ServiceContext, ServiceProvider},
    settings::{ServerSettings, Settings},
    sync::{
        file_sync_driver::FileSyncDriver,
        synchroniser_driver::{SiteIsInitialisedCallback, SynchroniserDriver},
    },
};

pub(crate) struct ServiceTestContext {
    #[allow(dead_code)]
    pub(crate) connection: StorageConnection,
    pub(crate) service_provider: Arc<ServiceProvider>,
    #[allow(dead_code)]
    pub(crate) processors_task: JoinHandle<()>,
    pub(crate) connection_manager: StorageConnectionManager,
    #[allow(dead_code)]
    pub(crate) service_context: ServiceContext,
}

// TODO use this method in service tests
pub(crate) async fn setup_all_with_data_and_service_provider(
    db_name: &str,
    inserts: MockDataInserts,
    extra_mock_data: MockData,
) -> ServiceTestContext {
    let (_, connection, connection_manager, db_settings) =
        setup_all_with_data(db_name, inserts, extra_mock_data).await;

    let (processors_trigger, processors) = Processors::init();
    let (file_sync_trigger, _) = FileSyncDriver::init(&Settings {
        server: ServerSettings {
            port: 0,
            danger_allow_http: false,
            debug_no_access_control: false,
            cors_origins: vec![],
            base_dir: None,
            machine_uid: None,
        },
        database: db_settings,
        sync: None,
        logging: None,
        backup: None,
    });
    let (sync_trigger, _) = SynchroniserDriver::init(file_sync_trigger);
    let (site_is_initialise_trigger, _) = SiteIsInitialisedCallback::init();

    let service_provider = Arc::new(ServiceProvider::new_with_triggers(
        connection_manager.clone(),
        "../app_data",
        processors_trigger,
        sync_trigger,
        site_is_initialise_trigger,
    ));

    let processors_task = processors.spawn(service_provider.clone());

    let service_context = service_provider.basic_context().unwrap();

    ServiceTestContext {
        connection,
        service_provider,
        processors_task,
        connection_manager,
        service_context,
    }
}

// TODO use this method in service tests
#[allow(dead_code)]
#[cfg(test)]
pub(crate) async fn setup_all_and_service_provider(
    db_name: &str,
    inserts: MockDataInserts,
) -> ServiceTestContext {
    setup_all_with_data_and_service_provider(db_name, inserts, MockData::default()).await
}

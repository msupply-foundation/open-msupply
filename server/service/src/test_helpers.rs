use std::sync::Arc;

use actix_rt::task::JoinHandle;
use repository::{
    mock::{MockData, MockDataInserts},
    test_db::setup_all_with_data,
    StorageConnection, StorageConnectionManager,
};

use crate::{processors::Processors, service_provider::ServiceProvider};

pub(crate) struct ServiceTestContext {
    #[allow(dead_code)]
    pub(crate) connection: StorageConnection,
    pub(crate) service_provider: Arc<ServiceProvider>,
    pub(crate) processors_task: JoinHandle<()>,
    pub(crate) connection_manager: StorageConnectionManager,
}

// TODO use this method in service tests
pub(crate) async fn setup_all_with_data_and_service_provider(
    db_name: &str,
    inserts: MockDataInserts,
    extra_mock_data: MockData,
) -> ServiceTestContext {
    let (_, connection, connection_manager, _) =
        setup_all_with_data(db_name, inserts, extra_mock_data).await;

    let (processors_trigger, processors) = Processors::init();
    let service_provider = Arc::new(ServiceProvider::new_with_processors(
        connection_manager.clone(),
        "",
        processors_trigger,
    ));

    let processors_task = processors.spawn(service_provider.clone());

    ServiceTestContext {
        connection,
        service_provider,
        processors_task,
        connection_manager,
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

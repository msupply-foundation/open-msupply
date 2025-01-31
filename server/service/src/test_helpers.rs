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
    settings::{DiscoveryMode, MailSettings, ServerSettings, Settings},
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
    pub(crate) settings: Settings,
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
    let settings = Settings {
        server: ServerSettings {
            port: 0,
            discovery: DiscoveryMode::Disabled,
            danger_allow_http: false,
            debug_no_access_control: false,
            cors_origins: vec![],
            base_dir: Some("test_output".to_string()),
            machine_uid: None,
        },
        database: db_settings,
        sync: None,
        logging: None,
        backup: None,
        mail: Some(MailSettings {
            port: 1025,
            host: "localhost".to_string(),
            starttls: false,
            username: "".to_string(),
            password: "".to_string(),
            from: "no-reply@msupply.foundation".to_string(),
            interval: 1,
        }),
    };
    let (file_sync_trigger, _) = FileSyncDriver::init(&settings);
    let (sync_trigger, _) = SynchroniserDriver::init(file_sync_trigger);
    let (site_is_initialise_trigger, _) = SiteIsInitialisedCallback::init();

    let service_provider = Arc::new(ServiceProvider::new_with_triggers(
        connection_manager.clone(),
        processors_trigger,
        sync_trigger,
        site_is_initialise_trigger,
        settings.mail.clone(),
    ));

    let processors_task = processors.spawn(service_provider.clone());

    let service_context = service_provider.basic_context().unwrap();

    ServiceTestContext {
        connection,
        service_provider,
        processors_task,
        connection_manager,
        service_context,
        settings,
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

pub mod email_test {
    use crate::service_provider::ServiceProvider;

    #[cfg(feature = "email-tests")]
    pub fn send_test_emails(service_provider: &ServiceProvider) {
        service_provider
            .email_service
            .send_queued_emails(&service_provider.basic_context().unwrap())
            .unwrap();
    }

    #[allow(dead_code)]
    #[cfg(not(feature = "email-tests"))]
    pub fn send_test_emails(_service_provider: &ServiceProvider) {
        println!("Skipping email sending");
    }
}

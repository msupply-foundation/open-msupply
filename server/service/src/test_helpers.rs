use std::sync::Arc;

use actix_rt::task::JoinHandle;
use repository::{
    mock::{MockData, MockDataInserts},
    test_db::setup_all_with_data,
    StorageConnection, StorageConnectionManager,
};

use crate::{
    ledger_fix::ledger_check::LedgerCheck,
    processors::Processors,
    service_provider::{ServiceContext, ServiceProvider},
    settings::{DiscoveryMode, MailSettings, ServerSettings, Settings},
    subscription::SubscriptionTriggerHandle,
    sync::{
        file_sync_driver::FileSyncDriver,
        settings::BatchSize,
        synchroniser_driver::{SiteIsInitialisedCallback, SynchroniserDriver},
    },
};

pub(crate) struct ServiceTestContext {
    pub(crate) connection: StorageConnection,
    pub(crate) service_provider: Arc<ServiceProvider>,
    pub(crate) processors_task: JoinHandle<()>,
    pub(crate) connection_manager: StorageConnectionManager,
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
            base_dir: "test_output".to_string(),
            machine_uid: None,
            override_is_central_server: false,
            standalone_store_name: None,
            standalone_admin_username: None,
            standalone_admin_password: None,
            workers: None,
            inactivity_timeout_seconds: crate::settings::DEFAULT_INACTIVITY_TIMEOUT_SECONDS,
            token_refresh_interval_seconds: crate::settings::DEFAULT_TOKEN_REFRESH_INTERVAL_SECONDS,
            frontend_dir: "frontend".to_string(),
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
        features: None,
        changelog_partition: None,
        changelog_dedup: None,
        ledger_check: None,
    };
    let (file_sync_trigger, _) = FileSyncDriver::init(&settings);
    let (sync_trigger, _) = SynchroniserDriver::init(file_sync_trigger);
    let (ledger_check_trigger, _) = LedgerCheck::init(Default::default());
    let (site_is_initialise_trigger, _) = SiteIsInitialisedCallback::init();

    let service_provider = Arc::new(ServiceProvider::new_with_triggers(
        connection_manager.clone(),
        processors_trigger,
        sync_trigger,
        ledger_check_trigger,
        site_is_initialise_trigger,
        settings.mail.clone(),
        Some(settings.clone()),
        SubscriptionTriggerHandle::new_void(),
        BatchSize::default(),
        false,
        false,
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

#[cfg(test)]
pub(crate) async fn setup_all_and_service_provider(
    db_name: &str,
    inserts: MockDataInserts,
) -> ServiceTestContext {
    setup_all_with_data_and_service_provider(db_name, inserts, MockData::default()).await
}

/// Assert that one stock line's ledger adds up: no negative running balance at any point in its
/// history, and a final balance matching `total_number_of_packs`, with `available` plus any stock
/// allocated but not yet picked accounting for the rest.
///
/// Use this in tests that move stock around. It is the same rule the dev-build ledger check
/// enforces at runtime (`crate::ledger_fix::ledger_check`), so a test that asserts it catches the
/// problem where it's cheap to diagnose instead of hours later on someone's dev server.
///
/// Deliberately per stock line rather than a blanket check: the shared mock data has stock lines
/// with `total_number_of_packs` set and only stock-out movements, so most of it is "broken" by
/// this definition and always has been.
#[cfg(test)]
pub(crate) fn assert_stock_line_ledger_consistent(
    connection: &StorageConnection,
    stock_line_id: &str,
) {
    use crate::ledger_fix::find_ledger_discrepancies::find_stock_line_ledger_discrepancies;

    let discrepancies = find_stock_line_ledger_discrepancies(connection, Some(stock_line_id))
        .expect("Failed to check stock line ledger");

    assert!(
        discrepancies.is_empty(),
        "Stock line {} has a ledger discrepancy: its stock movements don't add up to its pack \
         counts, or its running balance goes negative. See \
         server/repository/src/migrations/views/stock_line_ledger_discrepancy.rs for the rules.",
        stock_line_id
    );
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

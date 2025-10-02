use std::sync::Arc;

use actix_rt::task::JoinHandle;
use chrono::Utc;
use repository::{
    mock::mock_name_a, InvoiceLineRow, InvoiceLineType, InvoiceRow, InvoiceStatus, InvoiceType,
    StockLineRow,
};
use repository::{
    mock::{MockData, MockDataInserts},
    test_db::setup_all_with_data,
    StorageConnection, StorageConnectionManager,
};

use crate::{
    ledger_fix::ledger_fix_driver::LedgerFixDriver,
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
            override_is_central_server: false,
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
    };
    let (file_sync_trigger, _) = FileSyncDriver::init(&settings);
    let (sync_trigger, _) = SynchroniserDriver::init(file_sync_trigger);
    let (ledger_fix_trigger, _) = LedgerFixDriver::init();
    let (site_is_initialise_trigger, _) = SiteIsInitialisedCallback::init();

    let service_provider = Arc::new(ServiceProvider::new_with_triggers(
        connection_manager.clone(),
        processors_trigger,
        sync_trigger,
        ledger_fix_trigger,
        site_is_initialise_trigger,
        settings.mail.clone(),
        Some(settings.clone()),
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

pub(crate) fn make_movements(stock_line: StockLineRow, date_quantity: Vec<(i64, i64)>) -> MockData {
    let (invoices, invoice_lines) = date_quantity
        .into_iter()
        .map(|(date, quantity)| {
            let invoice_id = format!("invoice_{}_{}_{}", stock_line.id, date, quantity);
            let date = Utc::now().naive_utc() + chrono::Duration::days(date - 30);

            (
                InvoiceRow {
                    id: invoice_id.clone(),
                    store_id: stock_line.store_id.clone(),
                    name_link_id: mock_name_a().id.clone(),
                    r#type: if quantity > 0 {
                        InvoiceType::InboundShipment
                    } else {
                        InvoiceType::OutboundShipment
                    },
                    status: if quantity > 0 {
                        InvoiceStatus::Verified
                    } else {
                        InvoiceStatus::Shipped
                    },
                    created_datetime: date,
                    allocated_datetime: Some(date),
                    picked_datetime: Some(date),
                    shipped_datetime: Some(date),
                    delivered_datetime: Some(date),
                    received_datetime: Some(date),
                    verified_datetime: Some(date),
                    ..Default::default()
                },
                InvoiceLineRow {
                    id: format!("line_{invoice_id}"),
                    invoice_id,
                    item_link_id: stock_line.item_link_id.clone(),
                    stock_line_id: Some(stock_line.id.clone()),
                    pack_size: stock_line.pack_size,
                    number_of_packs: quantity.abs() as f64,
                    r#type: if quantity > 0 {
                        use repository::InvoiceLineType;

                        InvoiceLineType::StockIn
                    } else {
                        InvoiceLineType::StockOut
                    },
                    ..Default::default()
                },
            )
        })
        .unzip();

    MockData {
        invoices,
        invoice_lines,

        ..Default::default()
    }
}

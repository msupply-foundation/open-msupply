#![cfg(test)]
use std::sync::Arc;

use actix_rt::task::JoinHandle;
use chrono::{Timelike, Utc};
use repository::{
    mock::mock_name_a, InvoiceLineRow, InvoiceLineType, InvoiceRow, InvoiceStatus, InvoiceType,
    StockLineRow,
};
use repository::{
    mock::{MockData, MockDataInserts},
    test_db::setup_all_with_data,
    StorageConnection, StorageConnectionManager,
};
use repository::{ActivityLogRow, ActivityLogType};

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

            // Assuming external parties, non-transfers. So some dates are None
            let invoice = if quantity > 0 {
                InvoiceRow {
                    id: invoice_id.clone(),
                    store_id: stock_line.store_id.clone(),
                    name_link_id: mock_name_a().id.clone(),
                    r#type: InvoiceType::InboundShipment,
                    status: InvoiceStatus::Verified,
                    created_datetime: date.with_hour(1).unwrap(),
                    allocated_datetime: None,
                    picked_datetime: None,
                    shipped_datetime: None,
                    delivered_datetime: date.with_hour(2),
                    received_datetime: date.with_hour(3),
                    verified_datetime: date.with_hour(4),
                    ..Default::default()
                }
            } else {
                InvoiceRow {
                    id: invoice_id.clone(),
                    store_id: stock_line.store_id.clone(),
                    name_link_id: mock_name_a().id.clone(),
                    r#type: InvoiceType::OutboundShipment,
                    status: InvoiceStatus::Shipped,
                    created_datetime: date.with_hour(1).unwrap(),
                    allocated_datetime: date.with_hour(2),
                    picked_datetime: date.with_hour(3),
                    shipped_datetime: date.with_hour(4),
                    delivered_datetime: None,
                    received_datetime: None,
                    verified_datetime: None,
                    ..Default::default()
                }
            };

            (
                invoice,
                InvoiceLineRow {
                    id: format!("line_{}", invoice_id),
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

pub fn invoice_generate_logs(invoice: &InvoiceRow) -> Vec<ActivityLogRow> {
    let mut logs = Vec::new();

    let created_log = ActivityLogRow {
        id: format!("{}_created", invoice.id),
        r#type: ActivityLogType::InvoiceCreated,
        user_id: Some("user_account_a".to_string()),
        store_id: Some(invoice.store_id.clone()),
        record_id: Some(invoice.id.clone()),
        datetime: invoice.created_datetime.clone(),
        changed_to: None,
        changed_from: None,
    };

    logs.push(created_log.clone());

    if let Some(allocated_datetime) = invoice.allocated_datetime {
        logs.push(ActivityLogRow {
            id: format!("{}_allocated", invoice.id),
            r#type: ActivityLogType::InvoiceStatusAllocated,
            datetime: allocated_datetime.clone(),
            ..created_log.clone()
        });
    }

    if let Some(picked_datetime) = invoice.picked_datetime {
        logs.push(ActivityLogRow {
            id: format!("{}_picked", invoice.id),
            r#type: ActivityLogType::InvoiceStatusPicked,
            datetime: picked_datetime.clone(),
            ..created_log.clone()
        });
    }

    if let Some(shipped_datetime) = invoice.shipped_datetime {
        logs.push(ActivityLogRow {
            id: format!("{}_shipped", invoice.id),
            r#type: ActivityLogType::InvoiceStatusShipped,
            datetime: shipped_datetime.clone(),
            ..created_log.clone()
        });
    }

    if let Some(delivered_datetime) = invoice.delivered_datetime {
        logs.push(ActivityLogRow {
            id: format!("{}_delivered", invoice.id),
            r#type: ActivityLogType::InvoiceStatusDelivered,
            datetime: delivered_datetime.clone(),
            ..created_log.clone()
        });
    }

    if let Some(received_datetime) = invoice.received_datetime {
        logs.push(ActivityLogRow {
            id: format!("{}_received", invoice.id),
            r#type: ActivityLogType::InvoiceStatusReceived,
            datetime: received_datetime.clone(),
            ..created_log.clone()
        });
    }

    if let Some(verified_datetime) = invoice.verified_datetime {
        logs.push(ActivityLogRow {
            id: format!("{}_verified", invoice.id),
            r#type: ActivityLogType::InvoiceStatusVerified,
            datetime: verified_datetime.clone(),
            ..created_log.clone()
        });
    }

    if let Some(cancelled_datetime) = invoice.cancelled_datetime {
        logs.push(ActivityLogRow {
            id: format!("{}_cancelled", invoice.id),
            r#type: ActivityLogType::InvoiceStatusCancelled,
            datetime: cancelled_datetime.clone(),
            ..created_log.clone()
        });
    }

    logs
}

use crate::{invoice_line::query::get_invoice_line, service_provider::ServiceContext, WithDBError};
use chrono::NaiveDate;
use repository::{InvoiceLine, InvoiceLineRowRepository, RepositoryError, StockLineRowRepository};

mod generate;
use generate::generate;
mod validate;
use validate::validate;

use super::StockOutType;

#[derive(Clone, Debug, PartialEq, Default)]
pub struct InsertStockOutLine {
    pub id: String,
    pub r#type: StockOutType,
    pub invoice_id: String,
    pub stock_line_id: String,
    pub number_of_packs: f64,
    pub total_before_tax: Option<f64>,
    pub tax_percentage: Option<f64>,
    pub note: Option<String>,
    pub location_id: Option<String>,
    pub batch: Option<String>,
    pub pack_size: Option<f64>,
    pub expiry_date: Option<NaiveDate>,
    pub cost_price_per_pack: Option<f64>,
    pub sell_price_per_pack: Option<f64>,
}

#[derive(Clone, Debug, PartialEq)]
pub enum InsertStockOutLineError {
    LineAlreadyExists,
    DatabaseError(RepositoryError),
    InvoiceDoesNotExist,
    InvoiceTypeDoesNotMatch,
    NotThisStoreInvoice,
    CannotEditFinalised,
    StockLineNotFound,
    NumberOfPacksBelowZero,
    LocationIsOnHold,
    LocationNotFound,
    StockLineAlreadyExistsInInvoice(String),
    NewlyCreatedLineDoesNotExist,
    BatchIsOnHold,
    ReductionBelowZero { stock_line_id: String },
}

impl From<RepositoryError> for InsertStockOutLineError {
    fn from(error: RepositoryError) -> Self {
        InsertStockOutLineError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for InsertStockOutLineError
where
    ERR: Into<InsertStockOutLineError>,
{
    fn from(result: WithDBError<ERR>) -> Self {
        match result {
            WithDBError::DatabaseError(error) => error.into(),
            WithDBError::Error(error) => error.into(),
        }
    }
}

type OutError = InsertStockOutLineError;

pub fn insert_stock_out_line(
    ctx: &ServiceContext,
    input: InsertStockOutLine,
) -> Result<InvoiceLine, OutError> {
    let new_line = ctx
        .connection
        .transaction_sync(|connection| {
            let (item, invoice, batch) = validate(&connection, &input, &ctx.store_id)?;
            let (new_line, update_batch) = generate(connection, input, item, batch, invoice)?;
            InvoiceLineRowRepository::new(connection).upsert_one(&new_line)?;
            StockLineRowRepository::new(connection).upsert_one(&update_batch)?;
            get_invoice_line(ctx, &new_line.id)
                .map_err(OutError::DatabaseError)?
                .ok_or(OutError::NewlyCreatedLineDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(new_line)
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_item_a, mock_item_b_lines, mock_name_store_a,
            mock_outbound_shipment_a_invoice_lines, mock_outbound_shipment_c,
            mock_outbound_shipment_c_invoice_lines, mock_patient, mock_prescription_a,
            mock_stock_line_a, mock_stock_line_location_is_on_hold, mock_stock_line_on_hold,
            mock_stock_line_si_d, mock_store_a, mock_store_b, mock_store_c, MockDataInserts,
        },
        test_db::setup_all,
        InvoiceLineRow, InvoiceLineRowRepository, InvoiceLineType, InvoiceRow, InvoiceStatus,
        InvoiceType, StockLineRowRepository,
    };
    use repository::{StockLineRow, Upsert};
    use util::{inline_edit, inline_init};

    use crate::{
        invoice::outbound_shipment::update::{
            UpdateOutboundShipment, UpdateOutboundShipmentStatus,
        },
        invoice_line::{
            stock_out_line::InsertStockOutLine,
            stock_out_line::{InsertStockOutLineError as ServiceError, StockOutType},
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn insert_stock_out_errors() {
        let (_, _, connection_manager, _) =
            setup_all("insert_stock_out_line_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let mut context = service_provider
            .context(mock_store_b().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_line_service;

        // LineAlreadyExists
        assert_eq!(
            service.insert_stock_out_line(
                &context,
                inline_init(|r: &mut InsertStockOutLine| {
                    r.id.clone_from(&mock_outbound_shipment_a_invoice_lines()[0].id);
                    r.r#type = StockOutType::OutboundShipment;
                    r.invoice_id
                        .clone_from(&mock_outbound_shipment_a_invoice_lines()[0].invoice_id);
                }),
            ),
            Err(ServiceError::LineAlreadyExists)
        );

        // InvoiceDoesNotExist
        assert_eq!(
            service.insert_stock_out_line(
                &context,
                inline_init(|r: &mut InsertStockOutLine| {
                    r.id = "new outbound shipment line id".to_string();
                    r.r#type = StockOutType::OutboundShipment;
                    r.invoice_id = "new invoice id".to_string();
                    r.number_of_packs = 1.0;
                    r.stock_line_id.clone_from(&mock_item_b_lines()[0].id);
                }),
            ),
            Err(ServiceError::InvoiceDoesNotExist)
        );

        // StockLineNotFound
        assert_eq!(
            service.insert_stock_out_line(
                &context,
                inline_init(|r: &mut InsertStockOutLine| {
                    r.id = "new outbound line id".to_string();
                    r.r#type = StockOutType::OutboundShipment;
                    r.invoice_id = "invalid".to_string();
                    r.number_of_packs = 1.0;
                }),
            ),
            Err(ServiceError::StockLineNotFound)
        );

        // NumberOfPacksBelowZero
        // invoice `mock_outbound_shipment_a` has status `Picked`
        assert_eq!(
            service.insert_stock_out_line(
                &context,
                inline_init(|r: &mut InsertStockOutLine| {
                    r.id = "new outbound line id".to_string();
                    r.r#type = StockOutType::OutboundShipment;
                    r.stock_line_id = "item_b_line_a".to_string();
                    r.invoice_id
                        .clone_from(&mock_outbound_shipment_a_invoice_lines()[0].invoice_id);
                    r.number_of_packs = -1.0;
                }),
            ),
            Err(ServiceError::NumberOfPacksBelowZero)
        );

        // LocationIsOnHold
        assert_eq!(
            service.insert_stock_out_line(
                &context,
                inline_init(|r: &mut InsertStockOutLine| {
                    r.id = "new outbound line id".to_string();
                    r.r#type = StockOutType::OutboundShipment;
                    r.invoice_id
                        .clone_from(&mock_outbound_shipment_a_invoice_lines()[0].invoice_id);
                    r.number_of_packs = 1.0;
                    r.stock_line_id
                        .clone_from(&mock_stock_line_location_is_on_hold()[0].id);
                }),
            ),
            Err(ServiceError::LocationIsOnHold)
        );

        // BatchIsOnHold
        assert_eq!(
            service.insert_stock_out_line(
                &context,
                inline_init(|r: &mut InsertStockOutLine| {
                    r.id = "new outbound line id".to_string();
                    r.r#type = StockOutType::OutboundShipment;
                    r.invoice_id
                        .clone_from(&mock_outbound_shipment_a_invoice_lines()[0].invoice_id);
                    r.number_of_packs = 1.0;
                    r.stock_line_id.clone_from(&mock_stock_line_on_hold()[0].id);
                }),
            ),
            Err(ServiceError::BatchIsOnHold)
        );

        //StockLineAlreadyExistsInInvoice
        assert_eq!(
            service.insert_stock_out_line(
                &context,
                inline_init(|r: &mut InsertStockOutLine| {
                    r.id = "new outbound line id".to_string();
                    r.r#type = StockOutType::OutboundShipment;
                    r.invoice_id
                        .clone_from(&mock_outbound_shipment_a_invoice_lines()[0].invoice_id);
                    r.number_of_packs = 40.0;
                    r.stock_line_id.clone_from(&mock_stock_line_a().id);
                }),
            ),
            Err(ServiceError::StockLineAlreadyExistsInInvoice(
                mock_outbound_shipment_a_invoice_lines()[0].id.clone()
            ))
        );

        // ReductionBelowZero
        assert_eq!(
            service.insert_stock_out_line(
                &context,
                inline_init(|r: &mut InsertStockOutLine| {
                    r.id = "new outbound line id".to_string();
                    r.r#type = StockOutType::OutboundShipment;
                    r.invoice_id
                        .clone_from(&mock_outbound_shipment_a_invoice_lines()[0].invoice_id);
                    r.number_of_packs = 8.0;
                    r.stock_line_id.clone_from(&mock_stock_line_si_d()[0].id);
                }),
            ),
            Err(ServiceError::ReductionBelowZero {
                stock_line_id: mock_stock_line_si_d()[0].id.clone(),
            })
        );

        // NotThisStoreInvoice
        context.store_id = mock_store_c().id;
        assert_eq!(
            service.insert_stock_out_line(
                &context,
                inline_init(|r: &mut InsertStockOutLine| {
                    r.id = "new outbound line id".to_string();
                    r.r#type = StockOutType::OutboundShipment;
                    r.invoice_id
                        .clone_from(&mock_outbound_shipment_a_invoice_lines()[0].invoice_id);
                    r.number_of_packs = 1.0;
                    r.stock_line_id.clone_from(&mock_stock_line_si_d()[0].id);
                }),
            ),
            Err(ServiceError::NotThisStoreInvoice)
        );
    }

    #[actix_rt::test]
    async fn insert_stock_out_line_success() {
        let (_, connection, connection_manager, _) =
            setup_all("insert_stock_out_line_success", MockDataInserts::all()).await;

        // helpers to compare total
        let stock_line_for_invoice_line = |invoice_line: &InvoiceLineRow| {
            let stock_line_id = invoice_line.stock_line_id.clone().unwrap();
            StockLineRowRepository::new(&connection)
                .find_one_by_id(&stock_line_id)
                .unwrap()
                .unwrap()
        };

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let mut context = service_provider
            .context(mock_store_c().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_line_service;
        let invoice_service = service_provider.invoice_service;

        // New line on New Outbound invoice
        let available_number_of_packs = StockLineRowRepository::new(&connection)
            .find_one_by_id(&mock_stock_line_si_d()[0].id.clone())
            .unwrap()
            .unwrap()
            .available_number_of_packs;

        service
            .insert_stock_out_line(
                &context,
                inline_init(|r: &mut InsertStockOutLine| {
                    r.id = "new outbound line id".to_string();
                    r.r#type = StockOutType::OutboundShipment;
                    r.invoice_id
                        .clone_from(&mock_outbound_shipment_c_invoice_lines()[0].invoice_id);
                    r.stock_line_id.clone_from(&mock_stock_line_si_d()[0].id);
                    r.number_of_packs = 1.0;
                    r.total_before_tax = Some(1.0);
                }),
            )
            .unwrap();
        let new_outbound_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id("new outbound line id")
            .unwrap()
            .unwrap();
        let expected_available_stock =
            available_number_of_packs - new_outbound_line.number_of_packs;

        assert_eq!(
            new_outbound_line,
            inline_edit(&new_outbound_line, |mut u| {
                u.id = "new outbound line id".to_string();
                u.item_link_id.clone_from(&mock_item_a().id);
                u.pack_size = 1.0;
                u.number_of_packs = 1.0;
                u
            })
        );
        assert_eq!(
            expected_available_stock,
            stock_line_for_invoice_line(&new_outbound_line).available_number_of_packs
        );

        // New line on Allocated Invoice
        let available_number_of_packs = StockLineRowRepository::new(&connection)
            .find_one_by_id(&mock_stock_line_a().id.clone())
            .unwrap()
            .unwrap()
            .available_number_of_packs;

        invoice_service
            .update_outbound_shipment(
                &context,
                inline_init(|r: &mut UpdateOutboundShipment| {
                    r.id = mock_outbound_shipment_c().id;
                    r.status = Some(UpdateOutboundShipmentStatus::Allocated)
                }),
            )
            .unwrap();
        service
            .insert_stock_out_line(
                &context,
                inline_init(|r: &mut InsertStockOutLine| {
                    r.id = "new allocated invoice line".to_string();
                    r.r#type = StockOutType::OutboundShipment;
                    r.invoice_id
                        .clone_from(&mock_outbound_shipment_c_invoice_lines()[0].invoice_id);
                    r.stock_line_id.clone_from(&mock_stock_line_a().id);
                    r.number_of_packs = 2.0;
                    r.total_before_tax = Some(1.0);
                }),
            )
            .unwrap();
        let allocated_outbound_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id("new allocated invoice line")
            .unwrap()
            .unwrap();
        let expected_available_stock =
            available_number_of_packs - allocated_outbound_line.number_of_packs;

        assert_eq!(
            expected_available_stock,
            stock_line_for_invoice_line(&allocated_outbound_line).available_number_of_packs
        );

        // New line on Picked invoice
        let stock_line = StockLineRowRepository::new(&connection)
            .find_one_by_id(&mock_item_b_lines()[0].id.clone())
            .unwrap()
            .unwrap();

        invoice_service
            .update_outbound_shipment(
                &context,
                inline_init(|r: &mut UpdateOutboundShipment| {
                    r.id = mock_outbound_shipment_c().id;
                    r.status = Some(UpdateOutboundShipmentStatus::Picked)
                }),
            )
            .unwrap();
        service
            .insert_stock_out_line(
                &context,
                inline_init(|r: &mut InsertStockOutLine| {
                    r.id = "new picked invoice line".to_string();
                    r.r#type = StockOutType::OutboundShipment;
                    r.invoice_id
                        .clone_from(&mock_outbound_shipment_c_invoice_lines()[0].invoice_id);
                    r.stock_line_id.clone_from(&mock_item_b_lines()[0].id);
                    r.number_of_packs = 2.0;
                    r.total_before_tax = Some(1.0);
                }),
            )
            .unwrap();
        let picked_outbound_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id("new picked invoice line")
            .unwrap()
            .unwrap();
        let expected_available_stock =
            stock_line.available_number_of_packs - picked_outbound_line.number_of_packs;
        let expected_total_stock =
            stock_line.total_number_of_packs - picked_outbound_line.number_of_packs;

        assert_eq!(
            expected_available_stock,
            stock_line_for_invoice_line(&picked_outbound_line).available_number_of_packs
        );
        assert_eq!(
            expected_total_stock,
            stock_line_for_invoice_line(&picked_outbound_line).total_number_of_packs
        );

        // Prescription
        context.store_id = mock_store_a().id;
        let available_number_of_packs = StockLineRowRepository::new(&connection)
            .find_one_by_id(&mock_stock_line_a().id.clone())
            .unwrap()
            .unwrap()
            .available_number_of_packs;

        service
            .insert_stock_out_line(
                &context,
                inline_init(|r: &mut InsertStockOutLine| {
                    r.id = "new prescription line id".to_string();
                    r.r#type = StockOutType::Prescription;
                    r.invoice_id = mock_prescription_a().id;
                    r.stock_line_id.clone_from(&mock_stock_line_a().id);
                    r.number_of_packs = 1.0;
                    r.total_before_tax = Some(1.0);
                }),
            )
            .unwrap();
        let new_prescription_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id("new prescription line id")
            .unwrap()
            .unwrap();
        let expected_available_stock =
            available_number_of_packs - new_prescription_line.number_of_packs;

        assert_eq!(
            new_prescription_line,
            inline_edit(&new_prescription_line, |mut u| {
                u.id = "new prescription line id".to_string();
                u.item_link_id.clone_from(&mock_item_a().id);
                u.pack_size = 1.0;
                u.number_of_packs = 1.0;
                u
            })
        );
        assert_eq!(
            expected_available_stock,
            stock_line_for_invoice_line(&new_prescription_line).available_number_of_packs
        );
    }

    #[actix_rt::test]
    async fn insert_stock_out_line_back_dated() {
        let (_, connection, connection_manager, _) =
            setup_all("insert_stock_out_line_back_dated", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_b().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_line_service;

        // Create two invoices, one backdated and one current for the same stock line

        // Invoice from 7 days ago
        let datetime = chrono::Utc::now().naive_utc() - chrono::Duration::days(7);
        let earlier_invoice_id = "stock_in_invoice_id-7".to_string();
        let earlier_stock_in_invoice = InvoiceRow {
            id: earlier_invoice_id.clone(),
            invoice_number: -7,
            name_link_id: mock_name_store_a().id,
            r#type: InvoiceType::InboundShipment,
            store_id: context.store_id.clone(),
            created_datetime: datetime.clone(),
            picked_datetime: Some(datetime.clone()),
            delivered_datetime: Some(datetime.clone()),
            verified_datetime: Some(datetime.clone()),
            status: InvoiceStatus::Verified,
            ..Default::default()
        };

        earlier_stock_in_invoice.upsert(&connection).unwrap();

        // Current invoice (1 minute ago)
        let datetime = chrono::Utc::now().naive_utc() - chrono::Duration::minutes(1);
        let current_invoice = InvoiceRow {
            id: "stock_in_invoice_id-0".to_string(),
            invoice_number: 0,
            name_link_id: mock_name_store_a().id,
            r#type: InvoiceType::InboundShipment,
            store_id: context.store_id.clone(),
            created_datetime: datetime.clone(),
            picked_datetime: Some(datetime.clone()),
            delivered_datetime: Some(datetime.clone()),
            verified_datetime: Some(datetime.clone()),
            status: InvoiceStatus::Verified,
            ..Default::default()
        };

        current_invoice.upsert(&context.connection).unwrap();

        // Create a stock line for the item
        let stock_line_id = "stock_line_id".to_string();
        let stock_line = StockLineRow {
            id: stock_line_id.clone(),
            item_link_id: mock_item_a().id,
            pack_size: 10.0,
            available_number_of_packs: 20.0,
            total_number_of_packs: 20.0,
            store_id: context.store_id.clone(),
            batch: Some("batch".to_string()),
            ..Default::default()
        };

        stock_line.upsert(&context.connection).unwrap();

        // Add the invoice lines (each invoice introduces 10 packs)

        // Earlier invoice
        let invoice_line = InvoiceLineRow {
            id: "invoice_line-7".to_string(),
            invoice_id: earlier_invoice_id,
            item_link_id: mock_item_a().id,
            stock_line_id: Some(stock_line_id.clone()),
            pack_size: 10.0,
            number_of_packs: 10.0,
            batch: Some("batch".to_string()),
            r#type: InvoiceLineType::StockIn,
            ..Default::default()
        };

        invoice_line.upsert(&context.connection).unwrap();

        // Current invoice
        let invoice_line = InvoiceLineRow {
            id: "invoice_line-0".to_string(),
            invoice_id: current_invoice.id,
            item_link_id: mock_item_a().id,
            stock_line_id: Some(stock_line_id.clone()),
            pack_size: 10.0,
            number_of_packs: 10.0,
            batch: Some("batch".to_string()),
            r#type: InvoiceLineType::StockIn,
            ..Default::default()
        };

        invoice_line.upsert(&context.connection).unwrap();

        // Check we can't assign all 20 stock to a backdated prescription (2 days ago)
        let prescription_id = "prescription_id".to_string();
        let datetime = chrono::Utc::now().naive_utc() - chrono::Duration::days(2);
        let prescription_invoice = InvoiceRow {
            id: prescription_id.clone(),
            invoice_number: 999,
            name_link_id: mock_patient().id,
            r#type: InvoiceType::Prescription,
            store_id: context.store_id.clone(),
            created_datetime: chrono::Utc::now().naive_utc(), // Created now
            allocated_datetime: Some(datetime.clone()),       // Backdated to 2 days ago
            picked_datetime: Some(datetime.clone()),
            delivered_datetime: None,
            verified_datetime: None,
            status: InvoiceStatus::Picked,
            ..Default::default()
        };

        prescription_invoice.upsert(&context.connection).unwrap();

        let result = service.insert_stock_out_line(
            &context,
            inline_init(|r: &mut InsertStockOutLine| {
                r.id = "new prescription line id".to_string();
                r.r#type = StockOutType::Prescription;
                r.invoice_id = prescription_id.clone();
                r.stock_line_id = stock_line_id.clone();
                r.number_of_packs = 20.0;
            }),
        );
        assert_eq!(
            result,
            Err(ServiceError::ReductionBelowZero {
                stock_line_id: "stock_line_id".to_string()
            })
        );

        // Check we can assign 10 stock to the backdated prescription (there are 10 available at that time)
        let result = service.insert_stock_out_line(
            &context,
            inline_init(|r: &mut InsertStockOutLine| {
                r.id = "new prescription line id".to_string();
                r.r#type = StockOutType::Prescription;
                r.invoice_id = prescription_id;
                r.stock_line_id = stock_line_id.clone();
                r.number_of_packs = 10.0;
            }),
        );
        assert!(result.is_ok());
    }
}

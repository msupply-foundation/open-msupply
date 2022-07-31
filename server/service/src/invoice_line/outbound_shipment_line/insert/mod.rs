use crate::{invoice_line::query::get_invoice_line, service_provider::ServiceContext, WithDBError};
use repository::{InvoiceLine, InvoiceLineRowRepository, RepositoryError, StockLineRowRepository};

mod generate;
mod validate;

use generate::generate;
use validate::validate;
#[derive(Clone, Debug, PartialEq, Default)]
pub struct InsertOutboundShipmentLine {
    pub id: String,
    pub invoice_id: String,
    pub item_id: String,
    pub stock_line_id: String,
    pub number_of_packs: u32,
    pub total_before_tax: Option<f64>,
    pub tax: Option<f64>,
}

type OutError = InsertOutboundShipmentLineError;

pub fn insert_outbound_shipment_line(
    ctx: &ServiceContext,
    store_id: &str,
    input: InsertOutboundShipmentLine,
) -> Result<InvoiceLine, OutError> {
    let new_line = ctx
        .connection
        .transaction_sync(|connection| {
            let (item, invoice, batch) = validate(&input, store_id, &connection)?;
            let (new_line, update_batch) = generate(input, item, batch, invoice)?;
            InvoiceLineRowRepository::new(&connection).upsert_one(&new_line)?;
            StockLineRowRepository::new(&connection).upsert_one(&update_batch)?;
            get_invoice_line(ctx, &new_line.id)
                .map_err(|error| OutError::DatabaseError(error))?
                .ok_or(OutError::NewlyCreatedLineDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(new_line)
}

#[derive(Clone, Debug, PartialEq)]
pub enum InsertOutboundShipmentLineError {
    LineAlreadyExists,
    DatabaseError(RepositoryError),
    InvoiceDoesNotExist,
    NotAnOutboundShipment,
    NotThisStoreInvoice,
    CannotEditFinalised,
    ItemNotFound,
    StockLineNotFound,
    NumberOfPacksBelowOne,
    LocationIsOnHold,
    LocationNotFound,
    StockLineAlreadyExistsInInvoice(String),
    ItemDoesNotMatchStockLine,
    NewlyCreatedLineDoesNotExist,
    BatchIsOnHold,
    ReductionBelowZero { stock_line_id: String },
}

impl From<RepositoryError> for InsertOutboundShipmentLineError {
    fn from(error: RepositoryError) -> Self {
        InsertOutboundShipmentLineError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for InsertOutboundShipmentLineError
where
    ERR: Into<InsertOutboundShipmentLineError>,
{
    fn from(result: WithDBError<ERR>) -> Self {
        match result {
            WithDBError::DatabaseError(error) => error.into(),
            WithDBError::Error(error) => error.into(),
        }
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_item_a, mock_item_b, mock_item_b_lines, mock_outbound_shipment_a_invoice_lines,
            mock_outbound_shipment_c, mock_outbound_shipment_c_invoice_lines, mock_stock_line_a,
            mock_stock_line_location_is_on_hold, mock_stock_line_on_hold, mock_stock_line_si_d,
            mock_store_a, mock_store_b, mock_store_c, MockDataInserts,
        },
        test_db::setup_all,
        InvoiceLineRow, InvoiceLineRowRepository, StockLineRowRepository,
    };
    use util::{inline_edit, inline_init};

    use crate::{
        invoice::outbound_shipment::{UpdateOutboundShipment, UpdateOutboundShipmentStatus},
        invoice_line::outbound_shipment_line::{
            insert::InsertOutboundShipmentLine, InsertOutboundShipmentLineError as ServiceError,
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn insert_outbound_shipment_line_errors() {
        let (_, _, connection_manager, _) = setup_all(
            "insert_outbound_shipment_line_errors",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.context().unwrap();
        let service = service_provider.invoice_line_service;

        // LineAlreadyExists
        assert_eq!(
            service.insert_outbound_shipment_line(
                &context,
                &mock_store_b().id,
                inline_init(|r: &mut InsertOutboundShipmentLine| {
                    r.id = mock_outbound_shipment_a_invoice_lines()[0].id.clone();
                    r.invoice_id = mock_outbound_shipment_a_invoice_lines()[0]
                        .invoice_id
                        .clone();
                }),
            ),
            Err(ServiceError::LineAlreadyExists)
        );

        // ItemNotFound
        assert_eq!(
            service.insert_outbound_shipment_line(
                &context,
                &mock_store_b().id,
                inline_init(|r: &mut InsertOutboundShipmentLine| {
                    r.id = "new outbound shipment line id".to_string();
                    r.invoice_id = mock_outbound_shipment_a_invoice_lines()[0]
                        .invoice_id
                        .clone();
                    r.number_of_packs = 1;
                    r.stock_line_id = mock_item_b_lines()[0].id.clone();
                }),
            ),
            Err(ServiceError::ItemNotFound)
        );

        // InvoiceDoesNotExist
        assert_eq!(
            service.insert_outbound_shipment_line(
                &context,
                &mock_store_a().id,
                inline_init(|r: &mut InsertOutboundShipmentLine| {
                    r.id = "new outbound shipment line id".to_string();
                    r.invoice_id = "new invoice id".to_string();
                    r.item_id = mock_item_b_lines()[0].item_id.clone();
                    r.number_of_packs = 1;
                    r.stock_line_id = mock_item_b_lines()[0].id.clone();
                }),
            ),
            Err(ServiceError::InvoiceDoesNotExist)
        );

        // StockLineNotFound
        assert_eq!(
            service.insert_outbound_shipment_line(
                &context,
                &mock_store_a().id,
                inline_init(|r: &mut InsertOutboundShipmentLine| {
                    r.id = "new outbound line id".to_string();
                    r.invoice_id = "invalid".to_string();
                    r.number_of_packs = 1;
                }),
            ),
            Err(ServiceError::StockLineNotFound)
        );

        // NumberOfPacksBelowOne
        assert_eq!(
            service.insert_outbound_shipment_line(
                &context,
                &mock_store_b().id,
                inline_init(|r: &mut InsertOutboundShipmentLine| {
                    r.id = "new outbound line id".to_string();
                    r.invoice_id = mock_outbound_shipment_a_invoice_lines()[0]
                        .invoice_id
                        .clone();
                    r.number_of_packs = 0;
                }),
            ),
            Err(ServiceError::NumberOfPacksBelowOne)
        );

        // LocationIsOnHold
        assert_eq!(
            service.insert_outbound_shipment_line(
                &context,
                &mock_store_b().id,
                inline_init(|r: &mut InsertOutboundShipmentLine| {
                    r.id = "new outbound line id".to_string();
                    r.invoice_id = mock_outbound_shipment_a_invoice_lines()[0]
                        .invoice_id
                        .clone();
                    r.number_of_packs = 1;
                    r.stock_line_id = mock_stock_line_location_is_on_hold()[0].id.clone();
                    r.item_id = mock_stock_line_location_is_on_hold()[0].item_id.clone();
                }),
            ),
            Err(ServiceError::LocationIsOnHold)
        );

        // ItemDoesNotMatchStockLine
        assert_eq!(
            service.insert_outbound_shipment_line(
                &context,
                &mock_store_b().id,
                inline_init(|r: &mut InsertOutboundShipmentLine| {
                    r.id = "new outbound line id".to_string();
                    r.invoice_id = mock_outbound_shipment_a_invoice_lines()[0]
                        .invoice_id
                        .clone();
                    r.number_of_packs = 1;
                    r.stock_line_id = mock_stock_line_a().id.clone();
                    r.item_id = mock_item_b().id.clone();
                }),
            ),
            Err(ServiceError::ItemDoesNotMatchStockLine)
        );

        // BatchIsOnHold
        assert_eq!(
            service.insert_outbound_shipment_line(
                &context,
                &mock_store_b().id,
                inline_init(|r: &mut InsertOutboundShipmentLine| {
                    r.id = "new outbound line id".to_string();
                    r.invoice_id = mock_outbound_shipment_a_invoice_lines()[0]
                        .invoice_id
                        .clone();
                    r.number_of_packs = 1;
                    r.stock_line_id = mock_stock_line_on_hold()[0].id.clone();
                    r.item_id = mock_stock_line_on_hold()[0].item_id.clone();
                }),
            ),
            Err(ServiceError::BatchIsOnHold)
        );

        //StockLineAlreadyExistsInInvoice
        assert_eq!(
            service.insert_outbound_shipment_line(
                &context,
                &mock_store_b().id,
                inline_init(|r: &mut InsertOutboundShipmentLine| {
                    r.id = "new outbound line id".to_string();
                    r.invoice_id = mock_outbound_shipment_a_invoice_lines()[0]
                        .invoice_id
                        .clone();
                    r.number_of_packs = 40;
                    r.stock_line_id = mock_stock_line_a().id.clone();
                    r.item_id = mock_stock_line_a().item_id.clone();
                }),
            ),
            Err(ServiceError::StockLineAlreadyExistsInInvoice(
                mock_outbound_shipment_a_invoice_lines()[0].id.clone()
            ))
        );

        // ReductionBelowZero
        assert_eq!(
            service.insert_outbound_shipment_line(
                &context,
                &mock_store_b().id,
                inline_init(|r: &mut InsertOutboundShipmentLine| {
                    r.id = "new outbound line id".to_string();
                    r.invoice_id = mock_outbound_shipment_a_invoice_lines()[0]
                        .invoice_id
                        .clone();
                    r.number_of_packs = 8;
                    r.stock_line_id = mock_stock_line_si_d()[0].id.clone();
                    r.item_id = mock_stock_line_a().item_id.clone();
                }),
            ),
            Err(ServiceError::ReductionBelowZero {
                stock_line_id: mock_stock_line_si_d()[0].id.clone(),
            })
        );

        // NotThisStoreInvoice
        assert_eq!(
            service.insert_outbound_shipment_line(
                &context,
                &mock_store_a().id,
                inline_init(|r: &mut InsertOutboundShipmentLine| {
                    r.id = "new outbound line id".to_string();
                    r.invoice_id = mock_outbound_shipment_a_invoice_lines()[0]
                        .invoice_id
                        .clone();
                    r.number_of_packs = 1;
                    r.stock_line_id = mock_stock_line_si_d()[0].id.clone();
                    r.item_id = mock_stock_line_a().item_id.clone();
                }),
            ),
            Err(ServiceError::NotThisStoreInvoice)
        );

        //TODO: NewlyCreatedLineDoesNotExist
    }

    #[actix_rt::test]
    async fn insert_outbound_shipment_line_success() {
        let (_, connection, connection_manager, _) = setup_all(
            "insert_outbound_shipment_line_success",
            MockDataInserts::all(),
        )
        .await;

        // helpers to compare total
        let stock_line_for_invoice_line = |invoice_line: &InvoiceLineRow| {
            let stock_line_id = invoice_line.stock_line_id.clone().unwrap();
            StockLineRowRepository::new(&connection)
                .find_one_by_id(&stock_line_id)
                .unwrap()
        };

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.context().unwrap();
        let service = service_provider.invoice_line_service;
        let invoice_service = service_provider.invoice_service;

        // New line on New Outbound invoice
        let available_number_of_packs = StockLineRowRepository::new(&connection)
            .find_one_by_id(&mock_stock_line_si_d()[0].id.clone())
            .unwrap()
            .available_number_of_packs;

        service
            .insert_outbound_shipment_line(
                &context,
                &mock_store_c().id,
                inline_init(|r: &mut InsertOutboundShipmentLine| {
                    r.id = "new outbound line id".to_string();
                    r.invoice_id = mock_outbound_shipment_c_invoice_lines()[0]
                        .invoice_id
                        .clone();
                    r.stock_line_id = mock_stock_line_si_d()[0].id.clone();
                    r.item_id = mock_stock_line_si_d()[0].item_id.clone();
                    r.number_of_packs = 1;
                    r.total_before_tax = 1.0;
                    r.total_after_tax = 2.0;
                }),
            )
            .unwrap();
        let new_outbound_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id("new outbound line id")
            .unwrap();
        let expected_available_stock =
            available_number_of_packs - new_outbound_line.number_of_packs;

        assert_eq!(
            new_outbound_line,
            inline_edit(&new_outbound_line, |mut u| {
                u.id = "new outbound line id".to_string();
                u.item_id = mock_item_a().id.clone();
                u.pack_size = 1;
                u.number_of_packs = 1;
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
            .available_number_of_packs;

        invoice_service
            .update_outbound_shipment(
                &context,
                &mock_store_c().id,
                inline_init(|r: &mut UpdateOutboundShipment| {
                    r.id = mock_outbound_shipment_c().id;
                    r.status = Some(UpdateOutboundShipmentStatus::Allocated)
                }),
            )
            .unwrap();
        service
            .insert_outbound_shipment_line(
                &context,
                &mock_store_c().id,
                inline_init(|r: &mut InsertOutboundShipmentLine| {
                    r.id = "new allocated invoice line".to_string();
                    r.invoice_id = mock_outbound_shipment_c_invoice_lines()[0]
                        .invoice_id
                        .clone();
                    r.stock_line_id = mock_stock_line_a().id.clone();
                    r.item_id = mock_stock_line_a().item_id.clone();
                    r.number_of_packs = 2;
                    r.total_before_tax = 1.0;
                    r.total_after_tax = 2.0;
                }),
            )
            .unwrap();
        let allocated_outbound_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id("new allocated invoice line")
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
            .unwrap();

        invoice_service
            .update_outbound_shipment(
                &context,
                &mock_store_c().id,
                inline_init(|r: &mut UpdateOutboundShipment| {
                    r.id = mock_outbound_shipment_c().id;
                    r.status = Some(UpdateOutboundShipmentStatus::Picked)
                }),
            )
            .unwrap();
        service
            .insert_outbound_shipment_line(
                &context,
                &mock_store_c().id,
                inline_init(|r: &mut InsertOutboundShipmentLine| {
                    r.id = "new picked invoice line".to_string();
                    r.invoice_id = mock_outbound_shipment_c_invoice_lines()[0]
                        .invoice_id
                        .clone();
                    r.stock_line_id = mock_item_b_lines()[0].id.clone();
                    r.item_id = mock_item_b_lines()[0].item_id.clone();
                    r.number_of_packs = 2;
                    r.total_before_tax = 1.0;
                    r.total_after_tax = 2.0;
                }),
            )
            .unwrap();
        let picked_outbound_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id("new picked invoice line")
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
        )
    }
}

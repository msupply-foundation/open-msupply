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
            mock_stock_line_a, mock_stock_line_location_is_on_hold, mock_stock_line_on_hold,
            mock_stock_line_si_d, mock_store_a, mock_store_b, MockDataInserts,
        },
        test_db::setup_all,
        InvoiceLineRowRepository,
    };
    use util::{inline_edit, inline_init};

    use crate::{
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
                &mock_store_a().id,
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
                &mock_store_a().id,
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
                &mock_store_a().id,
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
                &mock_store_a().id,
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

        //TODO: DatabaseError, NotThisStoreInvoice, NewlyCreatedLineDoesNotExist
    }

    #[actix_rt::test]
    async fn insert_outbound_shipment_line_success() {
        let (_, connection, connection_manager, _) = setup_all(
            "insert_outbound_shipment_line_success",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.context().unwrap();
        let service = service_provider.invoice_line_service;

        service
            .insert_outbound_shipment_line(
                &context,
                &mock_store_b().id,
                inline_init(|r: &mut InsertOutboundShipmentLine| {
                    r.id = "new outbound line id".to_string();
                    r.invoice_id = mock_outbound_shipment_a_invoice_lines()[0]
                        .invoice_id
                        .clone();
                    r.stock_line_id = mock_stock_line_si_d()[0].id.clone();
                    r.item_id = mock_stock_line_si_d()[0].item_id.clone();
                    r.number_of_packs = 1;
                    r.total_before_tax = Some(1.0);
                }),
            )
            .unwrap();

        let outbound_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id("new outbound line id")
            .unwrap();

        assert_eq!(
            outbound_line,
            inline_edit(&outbound_line, |mut u| {
                u.id = "new outbound line id".to_string();
                u.item_id = mock_item_a().id.clone();
                u.pack_size = 1;
                u.number_of_packs = 1;
                u
            })
        );
    }
}

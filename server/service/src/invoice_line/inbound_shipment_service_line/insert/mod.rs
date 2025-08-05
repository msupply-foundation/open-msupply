mod generate;
mod validate;

use generate::generate;
use repository::{InvoiceLine, InvoiceLineRowRepository, RepositoryError};
use validate::validate;

use crate::{invoice_line::query::get_invoice_line, service_provider::ServiceContext, WithDBError};

#[derive(Debug, Clone, PartialEq, Default)]
pub struct InsertInboundShipmentServiceLine {
    pub id: String,
    pub invoice_id: String,
    pub item_id: Option<String>,
    pub name: Option<String>,
    pub total_before_tax: f64,
    pub tax_percentage: Option<f64>,
    pub note: Option<String>,
}

type OutError = InsertInboundShipmentServiceLineError;

pub fn insert_inbound_shipment_service_line(
    ctx: &ServiceContext,
    input: InsertInboundShipmentServiceLine,
) -> Result<InvoiceLine, OutError> {
    let new_line = ctx
        .connection
        .transaction_sync(|connection| {
            let (item_row, invoice_row) = validate(&input, &ctx.store_id, connection)?;
            let new_line = generate(
                connection,
                input,
                item_row,
                invoice_row.currency_id,
                &invoice_row.currency_rate,
            )?;
            InvoiceLineRowRepository::new(connection).upsert_one(&new_line)?;
            get_invoice_line(ctx, &new_line.id)
                .map_err(OutError::DatabaseError)?
                .ok_or(OutError::NewlyCreatedLineDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(new_line)
}

#[derive(Debug, PartialEq)]
pub enum InsertInboundShipmentServiceLineError {
    LineAlreadyExists,
    InvoiceDoesNotExist,
    NotAnInboundShipment,
    NotThisStoreInvoice,
    CannotEditInvoice,
    ItemNotFound,
    NotAServiceItem,
    // Internal
    NewlyCreatedLineDoesNotExist,
    CannotFindDefaultServiceItem,
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for InsertInboundShipmentServiceLineError {
    fn from(error: RepositoryError) -> Self {
        InsertInboundShipmentServiceLineError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for InsertInboundShipmentServiceLineError
where
    ERR: Into<InsertInboundShipmentServiceLineError>,
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
            mock_draft_inbound_service_line, mock_draft_inbound_shipment_with_service_lines,
            mock_draft_inbound_verified_with_service_lines, mock_item_a, mock_item_service_item,
            mock_outbound_shipment_c, mock_store_a, mock_store_c, MockDataInserts,
        },
        test_db::setup_all,
        InvoiceLineRowRepository, ItemFilter, ItemRepository, StringFilter,
    };
    use util::constants::DEFAULT_SERVICE_ITEM_CODE;

    use crate::{
        invoice_line::inbound_shipment_service_line::InsertInboundShipmentServiceLine,
        service_provider::ServiceProvider,
    };

    use super::InsertInboundShipmentServiceLineError;

    type ServiceError = InsertInboundShipmentServiceLineError;

    #[actix_rt::test]
    async fn insert_inbound_shipment_service_line_errors() {
        let (_, _, connection_manager, _) = setup_all(
            "insert_inbound_shipment_service_line_errors",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_line_service;

        // LineAlreadyExists
        assert_eq!(
            service.insert_inbound_shipment_service_line(
                &context,
                InsertInboundShipmentServiceLine {
                    id: mock_draft_inbound_service_line().id,
                    ..Default::default()
                },
            ),
            Err(ServiceError::LineAlreadyExists)
        );

        // InvoiceDoesNotExist
        assert_eq!(
            service.insert_inbound_shipment_service_line(
                &context,
                InsertInboundShipmentServiceLine {
                    invoice_id: "invalid".to_string(),
                    ..Default::default()
                },
            ),
            Err(ServiceError::InvoiceDoesNotExist)
        );

        // CannotEditInvoice
        assert_eq!(
            service.insert_inbound_shipment_service_line(
                &context,
                InsertInboundShipmentServiceLine {
                    invoice_id: mock_draft_inbound_verified_with_service_lines().id,
                    ..Default::default()
                },
            ),
            Err(ServiceError::CannotEditInvoice)
        );

        // ItemNotFound
        assert_eq!(
            service.insert_inbound_shipment_service_line(
                &context,
                InsertInboundShipmentServiceLine {
                    invoice_id: mock_draft_inbound_shipment_with_service_lines().id,
                    item_id: Some("invalid".to_string()),
                    ..Default::default()
                },
            ),
            Err(ServiceError::ItemNotFound)
        );

        // NotAServiceItem
        assert_eq!(
            service.insert_inbound_shipment_service_line(
                &context,
                InsertInboundShipmentServiceLine {
                    invoice_id: mock_draft_inbound_shipment_with_service_lines().id,
                    item_id: Some(mock_item_a().id),
                    ..Default::default()
                },
            ),
            Err(ServiceError::NotAServiceItem)
        );

        // NotAnInboundShipment
        context.store_id = mock_store_c().id;
        assert_eq!(
            service.insert_inbound_shipment_service_line(
                &context,
                InsertInboundShipmentServiceLine {
                    invoice_id: mock_outbound_shipment_c().id,
                    ..Default::default()
                },
            ),
            Err(ServiceError::NotAnInboundShipment)
        );

        // NotThisStoreInvoice
        assert_eq!(
            service.insert_inbound_shipment_service_line(
                &context,
                InsertInboundShipmentServiceLine {
                    invoice_id: mock_draft_inbound_shipment_with_service_lines().id,
                    item_id: Some(mock_item_service_item().id),
                    note: Some("abc".to_string()),
                    ..Default::default()
                },
            ),
            Err(ServiceError::NotThisStoreInvoice)
        );
    }

    #[actix_rt::test]
    async fn insert_inbound_shipment_service_line_success() {
        let (_, connection, connection_manager, _) = setup_all(
            "insert_inbound_shipment_service_line_service",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_line_service;

        // Default service line
        service
            .insert_inbound_shipment_service_line(
                &context,
                InsertInboundShipmentServiceLine {
                    id: "new_line_id".to_string(),
                    invoice_id: mock_draft_inbound_shipment_with_service_lines().id,
                    ..Default::default()
                },
            )
            .unwrap();

        let line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id("new_line_id")
            .unwrap()
            .unwrap();

        let default_service_item = ItemRepository::new(&connection)
            .query_one(
                None,
                ItemFilter::new()
                    .code(StringFilter::equal_to(DEFAULT_SERVICE_ITEM_CODE))
                    .is_active(true),
            )
            .unwrap()
            .unwrap();
        assert_eq!(
            line,
            {
                let mut expected_line = line.clone();
                expected_line.item_link_id = default_service_item.item_row.id;
                expected_line.item_name = default_service_item.item_row.name;
                expected_line
            }
        );

        // Specified service line
        service
            .insert_inbound_shipment_service_line(
                &context,
                InsertInboundShipmentServiceLine {
                    id: "new_line2_id".to_string(),
                    invoice_id: mock_draft_inbound_shipment_with_service_lines().id,
                    item_id: Some(mock_item_service_item().id),
                    name: Some("modified name".to_string()),
                    total_before_tax: 0.3,
                    tax_percentage: Some(10.0),
                    note: Some("note".to_string()),
                },
            )
            .unwrap();

        let line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id("new_line2_id")
            .unwrap()
            .unwrap();

        assert_eq!(
            line,
            {
                let mut expected_line = line.clone();
                expected_line.id = "new_line2_id".to_string();
                expected_line.invoice_id = mock_draft_inbound_shipment_with_service_lines().id;
                expected_line.item_link_id = mock_item_service_item().id;
                expected_line.item_name = "modified name".to_string();
                expected_line.total_before_tax = 0.3;
                expected_line.tax_percentage = Some(10.0);
                expected_line.note = Some("note".to_string());
                expected_line
            }
        );
    }
}

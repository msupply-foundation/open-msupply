mod generate;
mod validate;

use generate::generate;
use repository::{InvoiceLine, InvoiceLineRowRepository, RepositoryError};
use validate::validate;

use crate::{invoice_line::query::get_invoice_line, service_provider::ServiceContext, WithDBError};

#[derive(Debug, Clone, PartialEq, Default)]
pub struct InsertOutboundShipmentServiceLine {
    pub id: String,
    pub invoice_id: String,
    pub item_id: Option<String>,
    pub name: Option<String>,
    pub total_before_tax: f64,
    pub tax_rate: Option<f64>,
    pub note: Option<String>,
}

type OutError = InsertOutboundShipmentServiceLineError;

pub fn insert_outbound_shipment_service_line(
    ctx: &ServiceContext,
    input: InsertOutboundShipmentServiceLine,
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
pub enum InsertOutboundShipmentServiceLineError {
    LineAlreadyExists,
    InvoiceDoesNotExist,
    NotAnOutboundShipment,
    NotThisStoreInvoice,
    CannotEditInvoice,
    ItemNotFound,
    NotAServiceItem,
    // Internal
    NewlyCreatedLineDoesNotExist,
    CannotFindDefaultServiceItem,
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for InsertOutboundShipmentServiceLineError {
    fn from(error: RepositoryError) -> Self {
        InsertOutboundShipmentServiceLineError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for InsertOutboundShipmentServiceLineError
where
    ERR: Into<InsertOutboundShipmentServiceLineError>,
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
            mock_full_draft_outbound_shipment_a, mock_inbound_shipment_c, mock_item_a,
            mock_item_service_item, mock_outbound_shipment_shipped, mock_store_a, mock_store_c,
            MockDataInserts,
        },
        test_db::setup_all,
        InvoiceLineRowRepository, ItemFilter, ItemRepository, StringFilter,
    };
    use util::{constants::DEFAULT_SERVICE_ITEM_CODE, inline_edit, inline_init};

    use crate::{
        invoice_line::outbound_shipment_service_line::InsertOutboundShipmentServiceLine,
        service_provider::ServiceProvider,
    };

    use super::InsertOutboundShipmentServiceLineError;

    type ServiceError = InsertOutboundShipmentServiceLineError;

    #[actix_rt::test]
    async fn insert_outbound_shipment_service_line_errors() {
        let (_, _, connection_manager, _) = setup_all(
            "insert_outbound_shipment_service_line_errors",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_line_service;

        let draft_shipment = mock_full_draft_outbound_shipment_a();

        // InvoiceDoesNotExist
        assert_eq!(
            service.insert_outbound_shipment_service_line(
                &context,
                inline_init(|r: &mut InsertOutboundShipmentServiceLine| {
                    r.invoice_id = "invalid".to_string();
                }),
            ),
            Err(ServiceError::InvoiceDoesNotExist)
        );

        // NotAnOutboundShipment
        assert_eq!(
            service.insert_outbound_shipment_service_line(
                &context,
                inline_init(|r: &mut InsertOutboundShipmentServiceLine| {
                    r.invoice_id = mock_inbound_shipment_c().id;
                }),
            ),
            Err(ServiceError::NotAnOutboundShipment)
        );

        // LineAlreadyExists
        context.store_id = mock_store_c().id;
        assert_eq!(
            service.insert_outbound_shipment_service_line(
                &context,
                inline_init(|r: &mut InsertOutboundShipmentServiceLine| {
                    r.id = draft_shipment.lines[0].line.id.clone();
                }),
            ),
            Err(ServiceError::LineAlreadyExists)
        );

        // CannotEditInvoice
        assert_eq!(
            service.insert_outbound_shipment_service_line(
                &context,
                inline_init(|r: &mut InsertOutboundShipmentServiceLine| {
                    r.invoice_id = mock_outbound_shipment_shipped().id;
                }),
            ),
            Err(ServiceError::CannotEditInvoice)
        );

        // ItemNotFound
        assert_eq!(
            service.insert_outbound_shipment_service_line(
                &context,
                inline_init(|r: &mut InsertOutboundShipmentServiceLine| {
                    r.invoice_id = draft_shipment.invoice.id.clone();
                    r.item_id = Some("invalid".to_string())
                }),
            ),
            Err(ServiceError::ItemNotFound)
        );

        // NotAServiceItem
        assert_eq!(
            service.insert_outbound_shipment_service_line(
                &context,
                inline_init(|r: &mut InsertOutboundShipmentServiceLine| {
                    r.invoice_id = draft_shipment.invoice.id.clone();
                    r.item_id = Some(mock_item_a().id)
                }),
            ),
            Err(ServiceError::NotAServiceItem)
        );
    }

    #[actix_rt::test]
    async fn insert_outbound_shipment_service_line_success() {
        let (_, connection, connection_manager, _) = setup_all(
            "insert_outbound_shipment_service_line_service",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_c().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_line_service;

        // Default service line
        service
            .insert_outbound_shipment_service_line(
                &context,
                inline_init(|r: &mut InsertOutboundShipmentServiceLine| {
                    r.id = "new_line_id".to_string();
                    r.invoice_id = mock_full_draft_outbound_shipment_a().invoice.id;
                }),
            )
            .unwrap();

        let line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id_option("new_line_id")
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
            inline_edit(&line, |mut u| {
                u.item_link_id = default_service_item.item_row.id;
                u.item_name = default_service_item.item_row.name;
                u
            })
        );

        // Specified service line

        service
            .insert_outbound_shipment_service_line(
                &context,
                InsertOutboundShipmentServiceLine {
                    id: "new_line2_id".to_string(),
                    invoice_id: mock_full_draft_outbound_shipment_a().invoice.id,
                    item_id: Some(mock_item_service_item().id),
                    name: Some("modified name".to_string()),
                    total_before_tax: 0.3,
                    tax_rate: Some(0.1),
                    note: Some("note".to_string()),
                },
            )
            .unwrap();

        let line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id_option("new_line2_id")
            .unwrap()
            .unwrap();

        assert_eq!(
            line,
            inline_edit(&line, |mut u| {
                u.id = "new_line2_id".to_string();
                u.invoice_id = mock_full_draft_outbound_shipment_a().invoice.id;
                u.item_link_id = mock_item_service_item().id;
                u.item_name = "modified name".to_string();
                u.total_before_tax = 0.3;
                u.tax_rate = Some(0.1);
                u.note = Some("note".to_string());
                u
            })
        );
    }
}

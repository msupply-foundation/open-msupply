mod generate;
mod validate;

use generate::generate;
use repository::{InvoiceLine, InvoiceLineRowRepository, RepositoryError};
use validate::validate;

use crate::{
    invoice_line::{query::get_invoice_line, ShipmentTaxUpdate},
    service_provider::ServiceContext,
    WithDBError,
};

#[derive(Debug, Clone, PartialEq, Default)]
pub struct InsertInboundShipmentServiceLine {
    pub id: String,
    pub invoice_id: String,
    pub item_id: Option<String>,
    pub name: Option<String>,
    pub total_before_tax: f64,
    pub tax: Option<ShipmentTaxUpdate>,
    pub note: Option<String>,
}

type OutError = InsertInboundShipmentServiceLineError;

pub fn insert_inbound_shipment_service_line(
    ctx: &ServiceContext,
    _store_id: &str,
    input: InsertInboundShipmentServiceLine,
) -> Result<InvoiceLine, OutError> {
    let new_line = ctx
        .connection
        .transaction_sync(|connection| {
            let (item_row, _) = validate(&input, &connection)?;
            let new_line = generate(input, item_row)?;
            InvoiceLineRowRepository::new(&connection).upsert_one(&new_line)?;
            get_invoice_line(ctx, &new_line.id)
                .map_err(|error| OutError::DatabaseError(error))?
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
    //NotThisStoreInvoice,
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
            mock_outbound_shipment_c, MockDataInserts,
        },
        test_db::setup_all,
        InvoiceLineRowRepository, ItemFilter, ItemRepository, SimpleStringFilter,
    };
    use util::{constants::DEFAULT_SERVICE_ITEM_CODE, inline_edit, inline_init};

    use crate::{
        invoice_line::{
            inbound_shipment_service_line::InsertInboundShipmentServiceLine, ShipmentTaxUpdate,
        },
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

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.context().unwrap();
        let service = service_provider.invoice_line_service;

        // LineAlreadyExists
        assert_eq!(
            service.insert_inbound_shipment_service_line(
                &context,
                "store_a",
                inline_init(|r: &mut InsertInboundShipmentServiceLine| {
                    r.id = mock_draft_inbound_service_line().id
                }),
            ),
            Err(ServiceError::LineAlreadyExists)
        );

        // InvoiceDoesNotExist
        assert_eq!(
            service.insert_inbound_shipment_service_line(
                &context,
                "store_a",
                inline_init(|r: &mut InsertInboundShipmentServiceLine| {
                    r.invoice_id = "invalid".to_string();
                }),
            ),
            Err(ServiceError::InvoiceDoesNotExist)
        );

        // NotAnInboundShipment
        assert_eq!(
            service.insert_inbound_shipment_service_line(
                &context,
                "store_a",
                inline_init(|r: &mut InsertInboundShipmentServiceLine| {
                    r.invoice_id = mock_outbound_shipment_c().id;
                }),
            ),
            Err(ServiceError::NotAnInboundShipment)
        );

        // CannotEditInvoice
        assert_eq!(
            service.insert_inbound_shipment_service_line(
                &context,
                "store_a",
                inline_init(|r: &mut InsertInboundShipmentServiceLine| {
                    r.invoice_id = mock_draft_inbound_verified_with_service_lines().id;
                }),
            ),
            Err(ServiceError::CannotEditInvoice)
        );

        // ItemNotFound
        assert_eq!(
            service.insert_inbound_shipment_service_line(
                &context,
                "store_a",
                inline_init(|r: &mut InsertInboundShipmentServiceLine| {
                    r.invoice_id = mock_draft_inbound_shipment_with_service_lines().id;
                    r.item_id = Some("invalid".to_string())
                }),
            ),
            Err(ServiceError::ItemNotFound)
        );

        // NotAServiceItem
        assert_eq!(
            service.insert_inbound_shipment_service_line(
                &context,
                "store_a",
                inline_init(|r: &mut InsertInboundShipmentServiceLine| {
                    r.invoice_id = mock_draft_inbound_shipment_with_service_lines().id;
                    r.item_id = Some(mock_item_a().id)
                }),
            ),
            Err(ServiceError::NotAServiceItem)
        );
    }

    #[actix_rt::test]
    async fn insert_inbound_shipment_service_line_success() {
        let (_, connection, connection_manager, _) = setup_all(
            "insert_inbound_shipment_service_line_service",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.context().unwrap();
        let service = service_provider.invoice_line_service;

        // Default service line
        service
            .insert_inbound_shipment_service_line(
                &context,
                "store_a",
                inline_init(|r: &mut InsertInboundShipmentServiceLine| {
                    r.id = "new_line_id".to_string();
                    r.invoice_id = mock_draft_inbound_shipment_with_service_lines().id;
                }),
            )
            .unwrap();

        let line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id_option("new_line_id")
            .unwrap()
            .unwrap();

        let default_service_item = ItemRepository::new(&connection)
            .query_one(
                ItemFilter::new().code(SimpleStringFilter::equal_to(DEFAULT_SERVICE_ITEM_CODE)),
            )
            .unwrap()
            .unwrap();
        assert_eq!(
            line,
            inline_edit(&line, |mut u| {
                u.item_id = default_service_item.item_row.id;
                u.item_name = default_service_item.item_row.name;
                u
            })
        );

        // Specified service line
        service
            .insert_inbound_shipment_service_line(
                &context,
                "store_a",
                InsertInboundShipmentServiceLine {
                    id: "new_line2_id".to_string(),
                    invoice_id: mock_draft_inbound_shipment_with_service_lines().id,
                    item_id: Some(mock_item_service_item().id),
                    name: Some("modified name".to_string()),
                    total_before_tax: 0.3,
                    tax: Some(ShipmentTaxUpdate {
                        percentage: Some(10.0),
                    }),
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
                u.invoice_id = mock_draft_inbound_shipment_with_service_lines().id;
                u.item_id = mock_item_service_item().id;
                u.item_name = "modified name".to_string();
                u.total_before_tax = 0.3;
                u.tax = Some(0.1);
                u.note = Some("note".to_string());
                u
            })
        );
    }
}

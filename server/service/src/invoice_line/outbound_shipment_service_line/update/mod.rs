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
pub struct UpdateOutboundShipmentServiceLine {
    pub id: String,
    pub item_id: Option<String>,
    pub name: Option<String>,
    pub total_before_tax: Option<f64>,
    pub tax: Option<ShipmentTaxUpdate>,
    pub note: Option<String>,
}

type OutError = UpdateOutboundShipmentServiceLineError;

pub fn update_outbound_shipment_service_line(
    ctx: &ServiceContext,
    input: UpdateOutboundShipmentServiceLine,
) -> Result<InvoiceLine, OutError> {
    let updated_line = ctx
        .connection
        .transaction_sync(|connection| {
            let (existing_line, invoice_row, item) = validate(&input, &ctx.store_id, &connection)?;
            let updated_line = generate(input, existing_line, item, invoice_row.currency_rate)?;
            InvoiceLineRowRepository::new(&connection).upsert_one(&updated_line)?;

            get_invoice_line(ctx, &updated_line.id)
                .map_err(|error| OutError::DatabaseError(error))?
                .ok_or(OutError::UpdatedLineDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(updated_line)
}

#[derive(Debug, PartialEq)]
pub enum UpdateOutboundShipmentServiceLineError {
    LineDoesNotExist,
    InvoiceDoesNotExist,
    NotAnOutboundShipment,
    NotThisStoreInvoice,
    NotThisInvoiceLine(String),
    CannotEditInvoice,
    ItemNotFound,
    NotAServiceItem,
    // Internal
    UpdatedLineDoesNotExist,
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for UpdateOutboundShipmentServiceLineError {
    fn from(error: RepositoryError) -> Self {
        UpdateOutboundShipmentServiceLineError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for UpdateOutboundShipmentServiceLineError
where
    ERR: Into<UpdateOutboundShipmentServiceLineError>,
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
            mock_default_service_item, mock_draft_inbound_service_line,
            mock_draft_outbound_service_line, mock_draft_outbound_shipped_service_line,
            mock_item_a, mock_item_service_item, mock_store_a, mock_store_c, MockDataInserts,
        },
        test_db::setup_all,
        InvoiceLineRowRepository,
    };
    use util::{inline_edit, inline_init};

    use crate::{
        invoice_line::{
            outbound_shipment_service_line::UpdateOutboundShipmentServiceLine, ShipmentTaxUpdate,
        },
        service_provider::ServiceProvider,
    };

    use super::UpdateOutboundShipmentServiceLineError;

    type ServiceError = UpdateOutboundShipmentServiceLineError;

    #[actix_rt::test]
    async fn update_outbound_shipment_service_line_errors() {
        let (_, _, connection_manager, _) = setup_all(
            "update_outbound_shipment_service_line_errors",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_line_service;

        // LineDoesNotExist
        assert_eq!(
            service.update_outbound_shipment_service_line(
                &context,
                inline_init(|r: &mut UpdateOutboundShipmentServiceLine| {
                    r.id = "invalid".to_string();
                }),
            ),
            Err(ServiceError::LineDoesNotExist)
        );

        // NotAnOutboundShipment
        assert_eq!(
            service.update_outbound_shipment_service_line(
                &context,
                inline_init(|r: &mut UpdateOutboundShipmentServiceLine| {
                    r.id = mock_draft_inbound_service_line().id;
                }),
            ),
            Err(ServiceError::NotAnOutboundShipment)
        );

        // CannotEditInvoice
        assert_eq!(
            service.update_outbound_shipment_service_line(
                &context,
                inline_init(|r: &mut UpdateOutboundShipmentServiceLine| {
                    r.id = mock_draft_outbound_shipped_service_line().id;
                }),
            ),
            Err(ServiceError::CannotEditInvoice)
        );

        // ItemNotFound
        assert_eq!(
            service.update_outbound_shipment_service_line(
                &context,
                inline_init(|r: &mut UpdateOutboundShipmentServiceLine| {
                    r.id = mock_draft_outbound_service_line().id;
                    r.item_id = Some("invalid".to_string())
                }),
            ),
            Err(ServiceError::ItemNotFound)
        );

        // NotAServiceItem
        assert_eq!(
            service.update_outbound_shipment_service_line(
                &context,
                inline_init(|r: &mut UpdateOutboundShipmentServiceLine| {
                    r.id = mock_draft_outbound_service_line().id;
                    r.item_id = Some(mock_item_a().id)
                }),
            ),
            Err(ServiceError::NotAServiceItem)
        );

        // NotThisStoreInvoice
        context.store_id = mock_store_c().id;
        assert_eq!(
            service.update_outbound_shipment_service_line(
                &context,
                inline_init(|r: &mut UpdateOutboundShipmentServiceLine| {
                    r.id = mock_draft_outbound_service_line().id;
                    r.item_id = Some(mock_item_service_item().id)
                }),
            ),
            Err(ServiceError::NotThisStoreInvoice)
        );
    }

    #[actix_rt::test]
    async fn update_outbound_shipment_service_line_success() {
        let (_, connection, connection_manager, _) = setup_all(
            "update_outbound_shipment_service_line_service",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_line_service;

        // Service Item Changed
        service
            .update_outbound_shipment_service_line(
                &context,
                inline_init(|r: &mut UpdateOutboundShipmentServiceLine| {
                    r.id = mock_draft_outbound_service_line().id;
                    r.item_id = Some(mock_item_service_item().id);
                }),
            )
            .unwrap();

        let line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id_option(&mock_draft_outbound_service_line().id)
            .unwrap()
            .unwrap();

        assert_eq!(line.item_name, mock_item_service_item().name);

        // Service Item Changed And Name updated
        service
            .update_outbound_shipment_service_line(
                &context,
                inline_init(|r: &mut UpdateOutboundShipmentServiceLine| {
                    r.id = mock_draft_outbound_service_line().id;
                    r.item_id = Some(mock_default_service_item().id);
                    r.name = Some("name".to_string());
                }),
            )
            .unwrap();

        let line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id_option(&mock_draft_outbound_service_line().id)
            .unwrap()
            .unwrap();

        assert_eq!(line.item_name, "name");

        // All fields

        service
            .update_outbound_shipment_service_line(
                &context,
                UpdateOutboundShipmentServiceLine {
                    id: mock_draft_outbound_service_line().id,
                    item_id: Some(mock_item_service_item().id),
                    name: Some("modified name".to_string()),
                    total_before_tax: Some(1.0),
                    tax: Some(ShipmentTaxUpdate {
                        percentage: Some(10.0),
                    }),
                    note: Some("note".to_string()),
                },
            )
            .unwrap();

        let line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id_option(&mock_draft_outbound_service_line().id)
            .unwrap()
            .unwrap();

        assert_eq!(
            line,
            inline_edit(&line, |mut u| {
                u.item_link_id = mock_item_service_item().id;
                u.item_name = "modified name".to_string();
                u.total_before_tax = 1.0;
                u.tax = Some(10.0);
                u.note = Some("note".to_string());
                u
            })
        );
    }
}

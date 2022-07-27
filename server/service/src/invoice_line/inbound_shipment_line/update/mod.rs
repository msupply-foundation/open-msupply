use crate::{
    invoice_line::{query::get_invoice_line, ShipmentTaxUpdate},
    service_provider::ServiceContext,
    WithDBError,
};
use chrono::NaiveDate;
use repository::{
    InvoiceLine, InvoiceLineRowRepository, InvoiceRowRepository, RepositoryError,
    StockLineRowRepository,
};

mod generate;
mod validate;

use generate::generate;
use validate::validate;

#[derive(Clone, Debug, Default, PartialEq)]
pub struct UpdateInboundShipmentLine {
    pub id: String,
    pub item_id: Option<String>,
    pub location_id: Option<String>,
    pub pack_size: Option<u32>,
    pub batch: Option<String>,
    pub cost_price_per_pack: Option<f64>,
    pub sell_price_per_pack: Option<f64>,
    pub expiry_date: Option<NaiveDate>,
    pub number_of_packs: Option<u32>,
    pub total_before_tax: Option<f64>,
    pub tax: Option<ShipmentTaxUpdate>,
}

type OutError = UpdateInboundShipmentLineError;

pub fn update_inbound_shipment_line(
    ctx: &ServiceContext,
    store_id: &str,
    user_id: &str,
    input: UpdateInboundShipmentLine,
) -> Result<InvoiceLine, OutError> {
    let updated_line = ctx
        .connection
        .transaction_sync(|connection| {
            let (line, item, invoice) = validate(&input, store_id, &connection)?;

            let (invoice_row_option, updated_line, upsert_batch_option, delete_batch_id_option) =
                generate(user_id, input, line, item, invoice);

            let stock_line_respository = StockLineRowRepository::new(&connection);

            if let Some(upsert_batch) = upsert_batch_option {
                stock_line_respository.upsert_one(&upsert_batch)?;
            }

            InvoiceLineRowRepository::new(&connection).upsert_one(&updated_line)?;

            if let Some(id) = delete_batch_id_option {
                stock_line_respository.delete(&id)?;
            }

            if let Some(invoice_row) = invoice_row_option {
                InvoiceRowRepository::new(&connection).upsert_one(&invoice_row)?;
            }

            get_invoice_line(ctx, &updated_line.id)
                .map_err(|error| OutError::DatabaseError(error))?
                .ok_or(OutError::UpdatedLineDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(updated_line)
}

#[derive(Debug, PartialEq)]
pub enum UpdateInboundShipmentLineError {
    LineDoesNotExist,
    DatabaseError(RepositoryError),
    InvoiceDoesNotExist,
    NotAnInboundShipment,
    NotThisStoreInvoice,
    CannotEditFinalised,
    LocationDoesNotExist,
    ItemNotFound,
    PackSizeBelowOne,
    NumberOfPacksBelowOne,
    BatchIsReserved,
    UpdatedLineDoesNotExist,
    NotThisInvoiceLine(String),
}

impl From<RepositoryError> for UpdateInboundShipmentLineError {
    fn from(error: RepositoryError) -> Self {
        UpdateInboundShipmentLineError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for UpdateInboundShipmentLineError
where
    ERR: Into<UpdateInboundShipmentLineError>,
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
            mock_inbound_shipment_a_invoice_lines, mock_inbound_shipment_b_invoice_lines,
            mock_inbound_shipment_c_invoice_lines, mock_item_a, mock_store_a, mock_store_b,
            mock_user_account_a, MockDataInserts,
        },
        test_db::setup_all,
        InvoiceLineRowRepository,
    };
    use util::{inline_edit, inline_init};

    use crate::{
        invoice_line::inbound_shipment_line::{
            update::UpdateInboundShipmentLine, UpdateInboundShipmentLineError as ServiceError,
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn update_inbound_shipment_line_errors() {
        let (_, _, connection_manager, _) = setup_all(
            "update_inbound_shipment_line_errors",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.context().unwrap();
        let service = service_provider.invoice_line_service;

        // LineDoesNotExist
        assert_eq!(
            service.update_inbound_shipment_line(
                &context,
                &mock_store_a().id,
                &mock_user_account_a().id,
                inline_init(|r: &mut UpdateInboundShipmentLine| {
                    r.id = "invalid".to_string();
                }),
            ),
            Err(ServiceError::LineDoesNotExist)
        );

        // LocationDoesNotExist
        assert_eq!(
            service.update_inbound_shipment_line(
                &context,
                &mock_store_a().id,
                &mock_user_account_a().id,
                inline_init(|r: &mut UpdateInboundShipmentLine| {
                    r.id = mock_inbound_shipment_c_invoice_lines()[0].id.clone();
                    r.location_id = Some("invalid".to_string());
                }),
            ),
            Err(ServiceError::LocationDoesNotExist)
        );

        // ItemNotFound
        assert_eq!(
            service.update_inbound_shipment_line(
                &context,
                &mock_store_a().id,
                &mock_user_account_a().id,
                inline_init(|r: &mut UpdateInboundShipmentLine| {
                    r.id = mock_inbound_shipment_c_invoice_lines()[0].id.clone();
                    r.item_id = Some("invalid".to_string());
                    r.pack_size = Some(1);
                    r.number_of_packs = Some(1);
                }),
            ),
            Err(ServiceError::ItemNotFound)
        );

        // PackSizeBelowOne
        assert_eq!(
            service.update_inbound_shipment_line(
                &context,
                &mock_store_a().id,
                &mock_user_account_a().id,
                inline_init(|r: &mut UpdateInboundShipmentLine| {
                    r.id = mock_inbound_shipment_c_invoice_lines()[0].id.clone();
                    r.item_id = Some(mock_item_a().id.clone());
                    r.pack_size = Some(0);
                    r.number_of_packs = Some(1);
                }),
            ),
            Err(ServiceError::PackSizeBelowOne)
        );

        // NumberOfPacksBelowOne
        assert_eq!(
            service.update_inbound_shipment_line(
                &context,
                &mock_store_a().id,
                &mock_user_account_a().id,
                inline_init(|r: &mut UpdateInboundShipmentLine| {
                    r.id = mock_inbound_shipment_c_invoice_lines()[0].id.clone();
                    r.item_id = Some(mock_item_a().id.clone());
                    r.pack_size = Some(1);
                    r.number_of_packs = Some(0);
                }),
            ),
            Err(ServiceError::NumberOfPacksBelowOne)
        );

        // CannotEditFinalised
        assert_eq!(
            service.update_inbound_shipment_line(
                &context,
                &mock_store_a().id,
                &mock_user_account_a().id,
                inline_init(|r: &mut UpdateInboundShipmentLine| {
                    r.id = mock_inbound_shipment_b_invoice_lines()[0].id.clone();
                    r.item_id = Some(mock_item_a().id.clone());
                    r.pack_size = Some(1);
                    r.number_of_packs = Some(1);
                }),
            ),
            Err(ServiceError::CannotEditFinalised)
        );

        // BatchIsReserved
        assert_eq!(
            service.update_inbound_shipment_line(
                &context,
                &mock_store_a().id,
                &mock_user_account_a().id,
                inline_init(|r: &mut UpdateInboundShipmentLine| {
                    r.id = mock_inbound_shipment_a_invoice_lines()[0].id.clone();
                    r.item_id = Some(mock_item_a().id.clone());
                    r.pack_size = Some(1);
                    r.number_of_packs = Some(1);
                }),
            ),
            Err(ServiceError::BatchIsReserved)
        );

        // NotThisStoreInvoice
        assert_eq!(
            service.update_inbound_shipment_line(
                &context,
                &mock_store_b().id,
                &mock_user_account_a().id,
                inline_init(|r: &mut UpdateInboundShipmentLine| {
                    r.id = mock_inbound_shipment_a_invoice_lines()[0].id.clone();
                    r.item_id = Some(mock_item_a().id.clone());
                    r.pack_size = Some(1);
                    r.number_of_packs = Some(1);
                }),
            ),
            Err(ServiceError::NotThisStoreInvoice)
        );

        //TODO: DatabaseError
    }

    #[actix_rt::test]
    async fn update_inbound_shipment_line_success() {
        let (_, connection, connection_manager, _) = setup_all(
            "update_inbound_shipment_line_success",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.context().unwrap();
        let service = service_provider.invoice_line_service;

        service
            .update_inbound_shipment_line(
                &context,
                &mock_store_a().id,
                &mock_user_account_a().id,
                inline_init(|r: &mut UpdateInboundShipmentLine| {
                    r.id = mock_inbound_shipment_c_invoice_lines()[0].id.clone();
                    r.item_id = Some(mock_item_a().id.clone());
                    r.pack_size = Some(2);
                    r.number_of_packs = Some(3);
                }),
            )
            .unwrap();

        let inbound_line_update = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&mock_inbound_shipment_c_invoice_lines()[0].id.clone())
            .unwrap();

        assert_eq!(
            inbound_line_update,
            inline_edit(&inbound_line_update, |mut u| {
                u.id = mock_inbound_shipment_c_invoice_lines()[0].id.clone();
                u.item_id = mock_item_a().id.clone();
                u.pack_size = 2;
                u.number_of_packs = 3;
                u
            })
        );
    }
}

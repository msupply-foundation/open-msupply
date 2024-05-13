use crate::{
    activity_log::activity_log_entry,
    invoice_line::{query::get_invoice_line, ShipmentTaxUpdate},
    service_provider::ServiceContext,
    NullableUpdate, WithDBError,
};
use chrono::NaiveDate;
use repository::{
    ActivityLogType, InvoiceLine, InvoiceLineRowRepository, InvoiceRowRepository, RepositoryError,
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
    pub location: Option<NullableUpdate<String>>,
    pub pack_size: Option<f64>,
    pub batch: Option<String>,
    pub cost_price_per_pack: Option<f64>,
    pub sell_price_per_pack: Option<f64>,
    pub expiry_date: Option<NaiveDate>,
    pub number_of_packs: Option<f64>,
    pub total_before_tax: Option<f64>,
    pub tax: Option<ShipmentTaxUpdate>,
}

type OutError = UpdateInboundShipmentLineError;

pub fn update_inbound_shipment_line(
    ctx: &ServiceContext,
    input: UpdateInboundShipmentLine,
) -> Result<InvoiceLine, OutError> {
    let updated_line = ctx
        .connection
        .transaction_sync(|connection| {
            let (line, item, invoice) = validate(&input, &ctx.store_id, connection)?;

            let (invoice_row_option, updated_line, upsert_batch_option, delete_batch_id_option) =
                generate(
                    connection,
                    &ctx.user_id,
                    input.clone(),
                    line.clone(),
                    item,
                    invoice.clone(),
                )?;

            let stock_line_repository = StockLineRowRepository::new(connection);

            if let Some(upsert_batch) = upsert_batch_option {
                stock_line_repository.upsert_one(&upsert_batch)?;
            }

            InvoiceLineRowRepository::new(connection).upsert_one(&updated_line)?;

            if let Some(id) = delete_batch_id_option {
                stock_line_repository.delete(&id)?;
            }

            if let Some(invoice_row) = invoice_row_option {
                InvoiceRowRepository::new(connection).upsert_one(&invoice_row)?;
            }

            if let Some(number_of_packs) = input.number_of_packs {
                if number_of_packs == 0.0 {
                    activity_log_entry(
                        ctx,
                        ActivityLogType::QuantityForLineHasBeenSetToZero,
                        Some(invoice.id),
                        Some(updated_line.batch.unwrap_or_default() + " " + &updated_line.id),
                        None,
                    )?;
                }
            }

            get_invoice_line(ctx, &updated_line.id)
                .map_err(OutError::DatabaseError)?
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
    NumberOfPacksBelowZero,
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
        InvoiceLineRowRepository, StorePreferenceRow, StorePreferenceRowRepository,
    };
    use util::{inline_edit, inline_init};

    use crate::{
        invoice_line::inbound_shipment_line::{
            update::UpdateInboundShipmentLine, UpdateInboundShipmentLineError as ServiceError,
        },
        service_provider::ServiceProvider,
        NullableUpdate,
    };

    #[actix_rt::test]
    async fn update_inbound_shipment_line_errors() {
        let (_, _, connection_manager, _) = setup_all(
            "update_inbound_shipment_line_errors",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let mut context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.invoice_line_service;

        // LineDoesNotExist
        assert_eq!(
            service.update_inbound_shipment_line(
                &context,
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
                inline_init(|r: &mut UpdateInboundShipmentLine| {
                    r.id = mock_inbound_shipment_c_invoice_lines()[0].id.clone();
                    r.location = Some(NullableUpdate {
                        value: Some("invalid".to_string()),
                    });
                }),
            ),
            Err(ServiceError::LocationDoesNotExist)
        );

        // ItemNotFound
        assert_eq!(
            service.update_inbound_shipment_line(
                &context,
                inline_init(|r: &mut UpdateInboundShipmentLine| {
                    r.id = mock_inbound_shipment_c_invoice_lines()[0].id.clone();
                    r.item_id = Some("invalid".to_string());
                    r.pack_size = Some(1.0);
                    r.number_of_packs = Some(1.0);
                }),
            ),
            Err(ServiceError::ItemNotFound)
        );

        // PackSizeBelowOne
        assert_eq!(
            service.update_inbound_shipment_line(
                &context,
                inline_init(|r: &mut UpdateInboundShipmentLine| {
                    r.id = mock_inbound_shipment_c_invoice_lines()[0].id.clone();
                    r.item_id = Some(mock_item_a().id.clone());
                    r.pack_size = Some(0.0);
                    r.number_of_packs = Some(1.0);
                }),
            ),
            Err(ServiceError::PackSizeBelowOne)
        );

        // NumberOfPacksBelowOne
        assert_eq!(
            service.update_inbound_shipment_line(
                &context,
                inline_init(|r: &mut UpdateInboundShipmentLine| {
                    r.id = mock_inbound_shipment_c_invoice_lines()[0].id.clone();
                    r.item_id = Some(mock_item_a().id.clone());
                    r.pack_size = Some(1.0);
                    r.number_of_packs = Some(-1.0);
                }),
            ),
            Err(ServiceError::NumberOfPacksBelowZero)
        );

        // CannotEditFinalised
        assert_eq!(
            service.update_inbound_shipment_line(
                &context,
                inline_init(|r: &mut UpdateInboundShipmentLine| {
                    r.id = mock_inbound_shipment_b_invoice_lines()[0].id.clone();
                    r.item_id = Some(mock_item_a().id.clone());
                    r.pack_size = Some(1.0);
                    r.number_of_packs = Some(1.0);
                }),
            ),
            Err(ServiceError::CannotEditFinalised)
        );

        // BatchIsReserved
        assert_eq!(
            service.update_inbound_shipment_line(
                &context,
                inline_init(|r: &mut UpdateInboundShipmentLine| {
                    r.id = mock_inbound_shipment_a_invoice_lines()[0].id.clone();
                    r.item_id = Some(mock_item_a().id.clone());
                    r.pack_size = Some(1.0);
                    r.number_of_packs = Some(1.0);
                }),
            ),
            Err(ServiceError::BatchIsReserved)
        );

        // NotThisStoreInvoice
        context.store_id = mock_store_b().id;
        assert_eq!(
            service.update_inbound_shipment_line(
                &context,
                inline_init(|r: &mut UpdateInboundShipmentLine| {
                    r.id = mock_inbound_shipment_a_invoice_lines()[0].id.clone();
                    r.item_id = Some(mock_item_a().id.clone());
                    r.pack_size = Some(1.0);
                    r.number_of_packs = Some(1.0);
                }),
            ),
            Err(ServiceError::NotThisStoreInvoice)
        );
    }

    #[actix_rt::test]
    async fn update_inbound_shipment_line_success() {
        let (_, connection, connection_manager, _) = setup_all(
            "update_inbound_shipment_line_success",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.invoice_line_service;

        service
            .update_inbound_shipment_line(
                &context,
                inline_init(|r: &mut UpdateInboundShipmentLine| {
                    r.id = mock_inbound_shipment_c_invoice_lines()[0].id.clone();
                    r.item_id = Some(mock_item_a().id.clone());
                    r.pack_size = Some(2.0);
                    r.number_of_packs = Some(3.0);
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
                u.item_link_id = mock_item_a().id.clone();
                u.pack_size = 2.0;
                u.number_of_packs = 3.0;
                u
            })
        );

        // pack to one preference is set
        let pack_to_one = StorePreferenceRow {
            id: mock_store_a().id.clone(),
            pack_to_one: true,
            ..StorePreferenceRow::default()
        };
        StorePreferenceRowRepository::new(&connection)
            .upsert_one(&pack_to_one)
            .unwrap();

        service
            .update_inbound_shipment_line(
                &context,
                inline_init(|r: &mut UpdateInboundShipmentLine| {
                    r.id = mock_inbound_shipment_c_invoice_lines()[0].id.clone();
                    r.pack_size = Some(20.0);
                    r.number_of_packs = Some(20.0);
                    r.sell_price_per_pack = Some(100.0);
                    r.cost_price_per_pack = Some(60.0);
                }),
            )
            .unwrap();

        let inbound_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&mock_inbound_shipment_c_invoice_lines()[0].id.clone())
            .unwrap();

        assert_eq!(
            inbound_line,
            inline_edit(&inbound_line, |mut u| {
                u.id = mock_inbound_shipment_c_invoice_lines()[0].id.clone();
                u.pack_size = 1.0;
                u.number_of_packs = 400.0;
                u.sell_price_per_pack = 5.0;
                u.cost_price_per_pack = 3.0;
                u
            })
        );
    }
}

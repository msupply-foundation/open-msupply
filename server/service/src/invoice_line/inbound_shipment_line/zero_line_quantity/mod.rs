use crate::{
    activity_log::activity_log_entry, invoice_line::get_invoice_line,
    service_provider::ServiceContext,
};
use repository::{
    ActivityLogType, InvoiceLine, InvoiceLineRowRepository, InvoiceRowRepository, RepositoryError,
    StockLineRowRepository,
};

mod generate;
mod validate;

use generate::generate;
use validate::validate;

use self::generate::GenerateResult;

/// For invoices that were created before store.
#[derive(Clone, Debug, PartialEq, Default)]
pub struct ZeroInboundShipmentLineQuantity {
    pub id: String,
}

#[derive(Debug, PartialEq)]
pub enum ZeroInboundShipmentLineQuantityError {
    LineDoesNotExist,
    DatabaseError(RepositoryError),
    InvoiceDoesNotExist,
    NotAnInboundShipment,
    NotThisStoreInvoice,
    CannotEditFinalised,
    BatchIsReserved,
    InvoiceWasCreatedAfterStore,
    NotThisInvoiceLine(String),
}

pub fn zero_inbound_shipment_line_quantity(
    ctx: &ServiceContext,
    input: ZeroInboundShipmentLineQuantity,
) -> Result<InvoiceLine, ZeroInboundShipmentLineQuantityError> {
    let new_line = ctx
        .connection
        .transaction_sync(|connection| {
            let (invoice_row, line) = validate(&input, &ctx.store_id, connection)?;

            let GenerateResult {
                invoice_row,
                new_line,
                stock_line_id,
            } = generate(&ctx.user_id, invoice_row, line);

            InvoiceLineRowRepository::new(connection).upsert_one(&new_line)?;
            InvoiceRowRepository::new(connection).upsert_one(&invoice_row)?;

            if let Some(id) = stock_line_id {
                StockLineRowRepository::new(connection).delete(&id)?;
            }

            activity_log_entry(
                ctx,
                ActivityLogType::ZeroQuantitiesForInvoiceCreatedBeforeStore,
                Some(invoice_row.id.to_string()),
                None,
                None,
            )?;

            get_invoice_line(ctx, &new_line.id)
                .map_err(ZeroInboundShipmentLineQuantityError::DatabaseError)?
                .ok_or(ZeroInboundShipmentLineQuantityError::LineDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(new_line)
}

impl From<RepositoryError> for ZeroInboundShipmentLineQuantityError {
    fn from(error: RepositoryError) -> Self {
        ZeroInboundShipmentLineQuantityError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use chrono::NaiveDate;
    use repository::{
        mock::{mock_name_a, mock_store_a, mock_user_account_a, MockData, MockDataInserts},
        test_db::setup_all_with_data,
        InvoiceLineRow, InvoiceLineRowRepository, InvoiceLineRowType, InvoiceRow,
        InvoiceRowRepository, InvoiceRowStatus, InvoiceRowType,
    };
    use util::{inline_edit, inline_init};

    use crate::{
        invoice_line::{
            inbound_shipment_line::ZeroInboundShipmentLineQuantityError as ServiceError,
            ZeroInboundShipmentLineQuantity,
        },
        service_provider::ServiceProvider,
    };

    fn inbound_created_after_store() -> InvoiceRow {
        inline_init(|r: &mut InvoiceRow| {
            r.id = "inbound_created_after_store".to_string();
            r.name_link_id = mock_name_a().id;
            r.store_id = mock_store_a().id;
            r.invoice_number = 100;
            r.r#type = InvoiceRowType::InboundShipment;
            r.status = InvoiceRowStatus::New;
            r.user_id = Some(mock_user_account_a().id);
            r.created_datetime = NaiveDate::from_ymd_opt(2024, 1, 1)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap();
        })
    }

    fn inbound_created_after_store_line_a() -> InvoiceLineRow {
        inline_init(|r: &mut InvoiceLineRow| {
            r.id = "inbound_created_after_store_line_a".to_string();
            r.invoice_id = "inbound_created_after_store".to_string();
            r.item_link_id = "item_a".to_string();
            r.item_name = "Item A".to_string();
            r.item_code = "item_a_code".to_string();
            r.pack_size = 1;
            r.total_before_tax = 0.87;
            r.total_after_tax = 1.0;
            r.r#type = InvoiceLineRowType::StockIn;
            r.number_of_packs = 10.0;
        })
    }

    fn inbound_created_before_store() -> InvoiceRow {
        inline_init(|r: &mut InvoiceRow| {
            r.id = "inbound_created_before_store".to_string();
            r.name_link_id = mock_name_a().id;
            r.store_id = mock_store_a().id;
            r.invoice_number = 100;
            r.r#type = InvoiceRowType::InboundShipment;
            r.status = InvoiceRowStatus::New;
            r.user_id = Some(mock_user_account_a().id);
            r.created_datetime = NaiveDate::from_ymd_opt(2017, 1, 1)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap();
        })
    }

    fn inbound_created_before_store_line_a() -> InvoiceLineRow {
        inline_init(|r: &mut InvoiceLineRow| {
            r.id = "inbound_created_before_store_line_a".to_string();
            r.invoice_id = "inbound_created_before_store".to_string();
            r.item_link_id = "item_a".to_string();
            r.item_name = "Item A".to_string();
            r.item_code = "item_a_code".to_string();
            r.pack_size = 1;
            r.total_before_tax = 0.87;
            r.total_after_tax = 1.0;
            r.r#type = InvoiceLineRowType::StockIn;
            r.number_of_packs = 10.0;
        })
    }

    #[actix_rt::test]
    async fn delete_inbound_shipment_line_errors() {
        let (_, _, connection_manager, _) = setup_all_with_data(
            "zero_inbound_shipment_line_quantity_error",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.invoices = vec![inbound_created_after_store()];
                r.invoice_lines = vec![inbound_created_after_store_line_a()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.invoice_line_service;

        // InvoiceWasCreatedAfterStore
        assert_eq!(
            service.zero_inbound_shipment_line_quantity(
                &context,
                ZeroInboundShipmentLineQuantity {
                    id: inbound_created_after_store_line_a().id.clone(),
                },
            ),
            Err(ServiceError::InvoiceWasCreatedAfterStore)
        );
    }

    #[actix_rt::test]
    async fn delete_inbound_shipment_line_success() {
        let (_, connection, connection_manager, _) = setup_all_with_data(
            "zero_inbound_shipment_line_quantity_success",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.invoices = vec![inbound_created_before_store()];
                r.invoice_lines = vec![inbound_created_before_store_line_a()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.invoice_line_service;

        service
            .zero_inbound_shipment_line_quantity(
                &context,
                ZeroInboundShipmentLineQuantity {
                    id: inbound_created_before_store_line_a().id,
                },
            )
            .unwrap();

        let line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&inbound_created_before_store_line_a().id)
            .unwrap();
        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&inbound_created_before_store().id)
            .unwrap();
        assert_eq!(
            line,
            inline_edit(&inbound_created_before_store_line_a(), |mut l| {
                l.pack_size = 0;
                l.total_before_tax = 0.0;
                l.total_after_tax = 0.0;
                l.number_of_packs = 0.0;
                l
            })
        );
        assert_eq!(
            invoice,
            inline_edit(&inbound_created_before_store(), |mut i| {
                i.status = InvoiceRowStatus::New;
                i
            })
        )
    }
}

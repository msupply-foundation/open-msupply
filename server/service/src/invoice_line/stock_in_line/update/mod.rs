use crate::{
    invoice_line::{query::get_invoice_line, ShipmentTaxUpdate},
    service_provider::ServiceContext,
    NullableUpdate, WithDBError,
};
use chrono::NaiveDate;
use repository::{
    vvm_status::vvm_status_log_row::VVMStatusLogRowRepository, InvoiceLine,
    InvoiceLineRowRepository, InvoiceRowRepository, RepositoryError, StockLineRowRepository,
};

mod generate;
mod validate;

use generate::{generate, GenerateResult};
use validate::validate;

use super::StockInType;

#[derive(Clone, Debug, Default, PartialEq)]
pub struct UpdateStockInLine {
    pub id: String,
    pub item_id: Option<String>,
    pub location: Option<NullableUpdate<String>>,
    pub pack_size: Option<f64>,
    pub batch: Option<String>,
    pub note: Option<NullableUpdate<String>>,
    pub cost_price_per_pack: Option<f64>,
    pub sell_price_per_pack: Option<f64>,
    pub expiry_date: Option<NaiveDate>,
    pub number_of_packs: Option<f64>,
    pub total_before_tax: Option<f64>,
    pub tax_percentage: Option<ShipmentTaxUpdate>,
    pub r#type: StockInType,
    pub item_variant_id: Option<NullableUpdate<String>>,
    pub vvm_status_id: Option<String>,
    pub donor_id: Option<NullableUpdate<String>>,
    pub campaign_id: Option<NullableUpdate<String>>,
    pub shipped_number_of_packs: Option<f64>,
}

type OutError = UpdateStockInLineError;

pub fn update_stock_in_line(
    ctx: &ServiceContext,
    input: UpdateStockInLine,
) -> Result<InvoiceLine, OutError> {
    let updated_line = ctx
        .connection
        .transaction_sync(|connection| {
            let (line, item, invoice) = validate(&input, &ctx.store_id, connection)?;

            let GenerateResult {
                invoice_row_option,
                updated_line,
                upsert_batch_option,
                batch_to_delete_id,
                vvm_status_log_option,
            } = generate(connection, &ctx.user_id, input, line, item, invoice)?;

            let stock_line_repository = StockLineRowRepository::new(connection);
            if let Some(upsert_batch) = upsert_batch_option {
                stock_line_repository.upsert_one(&upsert_batch)?;
            }

            InvoiceLineRowRepository::new(connection).upsert_one(&updated_line)?;

            if let Some(id) = batch_to_delete_id {
                stock_line_repository.delete(&id)?;
            }

            if let Some(invoice_row) = invoice_row_option {
                InvoiceRowRepository::new(connection).upsert_one(&invoice_row)?;
            }

            if let Some(vvm_status_log_row) = vvm_status_log_option {
                VVMStatusLogRowRepository::new(connection).upsert_one(&vvm_status_log_row)?;
            }

            get_invoice_line(ctx, &updated_line.id)
                .map_err(OutError::DatabaseError)?
                .ok_or(OutError::UpdatedLineDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(updated_line)
}

#[derive(Debug, PartialEq)]
pub enum UpdateStockInLineError {
    LineDoesNotExist,
    DatabaseError(RepositoryError),
    InvoiceDoesNotExist,
    NotAStockIn,
    NotThisStoreInvoice,
    CannotEditFinalised,
    LocationDoesNotExist,
    ItemVariantDoesNotExist,
    ItemNotFound,
    PackSizeBelowOne,
    NumberOfPacksBelowZero,
    BatchIsReserved,
    UpdatedLineDoesNotExist,
    NotThisInvoiceLine(String),
    VVMStatusDoesNotExist,
}

impl From<RepositoryError> for UpdateStockInLineError {
    fn from(error: RepositoryError) -> Self {
        UpdateStockInLineError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for UpdateStockInLineError
where
    ERR: Into<UpdateStockInLineError>,
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
            mock_customer_return_a_invoice_line_a, mock_customer_return_a_invoice_line_b,
            mock_item_a, mock_item_b, mock_name_store_b, mock_store_a, mock_store_b,
            mock_supplier_return_a_invoice_line_a, mock_transferred_inbound_shipment_a,
            mock_user_account_a, mock_vaccine_item_a, mock_vvm_status_a, mock_vvm_status_b,
            MockData, MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        vvm_status::vvm_status_log::{VVMStatusLogFilter, VVMStatusLogRepository},
        EqualFilter, InvoiceLineRow, InvoiceLineRowRepository, InvoiceLineType, InvoiceRow,
        InvoiceStatus, InvoiceType, StorePreferenceRow, StorePreferenceRowRepository,
    };
    use util::{inline_edit, inline_init};

    use crate::{
        invoice_line::stock_in_line::{
            insert_stock_in_line, update::UpdateStockInLine, update_stock_in_line,
            InsertStockInLine, StockInType, UpdateStockInLineError as ServiceError,
        },
        service_provider::ServiceProvider,
        NullableUpdate,
    };

    #[actix_rt::test]
    async fn update_stock_in_line_errors() {
        fn verified_return() -> InvoiceRow {
            InvoiceRow {
                id: "verified_return".to_string(),
                store_id: mock_store_b().id,
                name_link_id: mock_name_store_b().id,
                r#type: InvoiceType::CustomerReturn,
                status: InvoiceStatus::Verified,
                ..Default::default()
            }
        }

        fn verified_return_line() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "verified_return_line".to_string(),
                invoice_id: verified_return().id,
                item_link_id: mock_item_a().id,
                r#type: InvoiceLineType::StockIn,
                ..Default::default()
            }
        }
        let (_, _, connection_manager, _) = setup_all_with_data(
            "update_stock_in_line_errors",
            MockDataInserts::all(),
            MockData {
                invoices: vec![verified_return()],
                invoice_lines: vec![verified_return_line()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let mut context = service_provider
            .context(mock_store_b().id, mock_user_account_a().id)
            .unwrap();

        // LineDoesNotExist
        assert_eq!(
            update_stock_in_line(
                &context,
                inline_init(|r: &mut UpdateStockInLine| {
                    r.id = "invalid".to_string();
                }),
            ),
            Err(ServiceError::LineDoesNotExist)
        );

        // LocationDoesNotExist
        assert_eq!(
            update_stock_in_line(
                &context,
                inline_init(|r: &mut UpdateStockInLine| {
                    r.id = mock_customer_return_a_invoice_line_a().id;
                    r.location = Some(NullableUpdate {
                        value: Some("invalid".to_string()),
                    });
                }),
            ),
            Err(ServiceError::LocationDoesNotExist)
        );

        // ItemVariantDoesNotExist
        assert_eq!(
            update_stock_in_line(
                &context,
                inline_init(|r: &mut UpdateStockInLine| {
                    r.id = mock_customer_return_a_invoice_line_a().id;
                    r.item_variant_id = Some(NullableUpdate {
                        value: Some("invalid".to_string()),
                    });
                }),
            ),
            Err(ServiceError::ItemVariantDoesNotExist)
        );

        // PackSizeBelowOne
        assert_eq!(
            update_stock_in_line(
                &context,
                inline_init(|r: &mut UpdateStockInLine| {
                    r.id = mock_customer_return_a_invoice_line_a().id;
                    r.pack_size = Some(0.0);
                }),
            ),
            Err(ServiceError::PackSizeBelowOne)
        );

        // NumberOfPacksBelowZero
        assert_eq!(
            update_stock_in_line(
                &context,
                inline_init(|r: &mut UpdateStockInLine| {
                    r.id = mock_customer_return_a_invoice_line_a().id;
                    r.pack_size = Some(1.0);
                    r.number_of_packs = Some(-1.0);
                }),
            ),
            Err(ServiceError::NumberOfPacksBelowZero)
        );

        // ItemNotFound
        assert_eq!(
            update_stock_in_line(
                &context,
                inline_init(|r: &mut UpdateStockInLine| {
                    r.id = mock_customer_return_a_invoice_line_a().id;
                    r.item_id = Some("invalid".to_string());
                    r.pack_size = Some(1.0);
                    r.number_of_packs = Some(1.0);
                }),
            ),
            Err(ServiceError::ItemNotFound)
        );

        // NotAStockIn
        assert_eq!(
            update_stock_in_line(
                &context,
                inline_init(|r: &mut UpdateStockInLine| {
                    r.id = mock_supplier_return_a_invoice_line_a().id;
                    r.pack_size = Some(1.0);
                    r.number_of_packs = Some(1.0);
                }),
            ),
            Err(ServiceError::NotAStockIn)
        );

        // CannotEditFinalised
        assert_eq!(
            update_stock_in_line(
                &context,
                inline_init(|r: &mut UpdateStockInLine| {
                    r.id = verified_return_line().id;
                    r.item_id = Some(mock_item_a().id.clone());
                    r.pack_size = Some(1.0);
                    r.number_of_packs = Some(1.0);
                }),
            ),
            Err(ServiceError::CannotEditFinalised)
        );

        // BatchIsReserved
        assert_eq!(
            update_stock_in_line(
                &context,
                inline_init(|r: &mut UpdateStockInLine| {
                    r.id = mock_customer_return_a_invoice_line_b().id; // line number_of_packs and stock_line available_number_of_packs are different
                    r.item_id = Some(mock_item_b().id);
                    r.pack_size = Some(1.0);
                    r.number_of_packs = Some(1.0);
                }),
            ),
            Err(ServiceError::BatchIsReserved)
        );

        // NotThisStoreInvoice
        context.store_id = mock_store_a().id;
        assert_eq!(
            update_stock_in_line(
                &context,
                inline_init(|r: &mut UpdateStockInLine| {
                    r.id = mock_customer_return_a_invoice_line_a().id;
                    r.item_id = Some(mock_item_a().id);
                    r.pack_size = Some(1.0);
                    r.number_of_packs = Some(1.0);
                }),
            ),
            Err(ServiceError::NotThisStoreInvoice)
        );
    }

    #[actix_rt::test]
    async fn update_stock_in_line_success() {
        let (_, connection, connection_manager, _) =
            setup_all("update_stock_in_line_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_b().id, mock_user_account_a().id)
            .unwrap();

        let return_line_id = mock_customer_return_a_invoice_line_a().id;

        update_stock_in_line(
            &context,
            inline_init(|r: &mut UpdateStockInLine| {
                r.id.clone_from(&return_line_id);
                r.pack_size = Some(2.0);
                r.number_of_packs = Some(3.0);
            }),
        )
        .unwrap();

        let inbound_line_update = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&return_line_id)
            .unwrap()
            .unwrap();

        assert_eq!(
            inbound_line_update,
            inline_edit(&inbound_line_update, |mut u| {
                u.id.clone_from(&return_line_id);
                u.pack_size = 2.0;
                u.number_of_packs = 3.0;
                u
            })
        );

        // pack to one preference is set
        let pack_to_one = StorePreferenceRow {
            id: mock_store_b().id.clone(),
            pack_to_one: true,
            ..StorePreferenceRow::default()
        };
        StorePreferenceRowRepository::new(&connection)
            .upsert_one(&pack_to_one)
            .unwrap();

        update_stock_in_line(
            &context,
            inline_init(|r: &mut UpdateStockInLine| {
                r.id.clone_from(&return_line_id);
                r.pack_size = Some(20.0);
                r.number_of_packs = Some(20.0);
                r.sell_price_per_pack = Some(100.0);
                r.cost_price_per_pack = Some(60.0);
            }),
        )
        .unwrap();

        let inbound_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&return_line_id)
            .unwrap()
            .unwrap();

        assert_eq!(
            inbound_line,
            inline_edit(&inbound_line, |mut u| {
                u.id = return_line_id;
                u.pack_size = 1.0;
                u.number_of_packs = 400.0;
                u.sell_price_per_pack = 5.0;
                u.cost_price_per_pack = 3.0;
                u
            })
        );

        // Check vvm status id is updated on an inbound shipment with status: Delivered
        insert_stock_in_line(
            &context,
            InsertStockInLine {
                id: "delivered_invoice_line_with_vvm_status".to_string(),
                invoice_id: mock_transferred_inbound_shipment_a().id,
                item_id: mock_vaccine_item_a().id,
                pack_size: 1.0,
                number_of_packs: 1.0,
                r#type: StockInType::InboundShipment,
                vvm_status_id: Some(mock_vvm_status_a().id),
                ..Default::default()
            },
        )
        .unwrap();

        let vvm_log_filter = VVMStatusLogFilter::new().invoice_line_id(EqualFilter::equal_to(
            "delivered_invoice_line_with_vvm_status",
        ));

        let vvm_status_logs = VVMStatusLogRepository::new(&connection)
            .query_by_filter(vvm_log_filter.clone())
            .unwrap();

        let latest_log = vvm_status_logs.first().map(|log| log.status_id.clone());

        assert_eq!(vvm_status_logs.len(), 1);
        assert_eq!(latest_log, Some(mock_vvm_status_a().id));

        // Update the invoice line with a new vvm status
        let result = update_stock_in_line(
            &context,
            UpdateStockInLine {
                id: "delivered_invoice_line_with_vvm_status".to_string(),
                vvm_status_id: Some(mock_vvm_status_b().id),
                r#type: StockInType::InboundShipment,
                ..Default::default()
            },
        )
        .unwrap();
        assert_eq!(
            result.invoice_line_row.vvm_status_id,
            Some(mock_vvm_status_b().id),
        );

        let vvm_status_logs = VVMStatusLogRepository::new(&connection)
            .query_by_filter(vvm_log_filter.clone())
            .unwrap();

        let vvm_log = vvm_status_logs.first().map(|log| log.status_id.clone());

        // existing log should be updated
        assert_eq!(vvm_status_logs.len(), 1);
        assert_eq!(vvm_log, Some(mock_vvm_status_b().id));
    }
}

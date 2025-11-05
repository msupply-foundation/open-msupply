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
    pub expiry_date: Option<NullableUpdate<NaiveDate>>,
    pub number_of_packs: Option<f64>,
    pub total_before_tax: Option<f64>,
    pub tax_percentage: Option<ShipmentTaxUpdate>,
    pub r#type: StockInType,
    pub item_variant_id: Option<NullableUpdate<String>>,
    pub vvm_status_id: Option<String>,
    pub donor_id: Option<NullableUpdate<String>>,
    pub campaign_id: Option<NullableUpdate<String>>,
    pub program_id: Option<NullableUpdate<String>>,
    pub shipped_number_of_packs: Option<f64>,
    pub volume_per_pack: Option<f64>,
    pub shipped_pack_size: Option<f64>,
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
    ProgramNotVisible,
    IncorrectLocationType,
    CampaignDoesNotExist,
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
    use chrono::NaiveDate;
    use repository::{
        mock::{
            mock_customer_return_a_invoice_line_a, mock_customer_return_a_invoice_line_b,
            mock_immunisation_program_a, mock_inbound_shipment_a, mock_item_a, mock_item_b,
            mock_item_restricted_location_type_b, mock_location_with_restricted_location_type_a,
            mock_name_store_b, mock_store_a, mock_store_b, mock_supplier_return_a_invoice_line_a,
            mock_transferred_inbound_shipment_a, mock_user_account_a, mock_vaccine_item_a,
            mock_vvm_status_a, mock_vvm_status_b, MockData, MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        vvm_status::vvm_status_log::{VVMStatusLogFilter, VVMStatusLogRepository},
        EqualFilter, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineRow,
        InvoiceLineRowRepository, InvoiceLineType, InvoiceRow, InvoiceStatus, InvoiceType,
        StorePreferenceRow, StorePreferenceRowRepository,
    };

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
        fn item_line_with_restricted_location_type_b() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "item_line_with_restricted_location_type_b".to_string(),
                invoice_id: mock_inbound_shipment_a().id,
                item_link_id: mock_item_restricted_location_type_b().id,
                r#type: InvoiceLineType::StockIn,
                number_of_packs: 30.0,
                ..Default::default()
            }
        }
        let (_, _, connection_manager, _) = setup_all_with_data(
            "update_stock_in_line_errors",
            MockDataInserts::all(),
            MockData {
                invoices: vec![verified_return()],
                invoice_lines: vec![
                    verified_return_line(),
                    item_line_with_restricted_location_type_b(),
                ],
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
                UpdateStockInLine {
                    id: "invalid".to_string(),
                    ..Default::default()
                },
            ),
            Err(ServiceError::LineDoesNotExist)
        );

        // LocationDoesNotExist
        assert_eq!(
            update_stock_in_line(
                &context,
                UpdateStockInLine {
                    id: mock_customer_return_a_invoice_line_a().id,
                    location: Some(NullableUpdate {
                        value: Some("invalid".to_string()),
                    }),
                    ..Default::default()
                },
            ),
            Err(ServiceError::LocationDoesNotExist)
        );

        // ItemVariantDoesNotExist
        assert_eq!(
            update_stock_in_line(
                &context,
                UpdateStockInLine {
                    id: mock_customer_return_a_invoice_line_a().id,
                    item_variant_id: Some(NullableUpdate {
                        value: Some("invalid".to_string()),
                    }),
                    ..Default::default()
                },
            ),
            Err(ServiceError::ItemVariantDoesNotExist)
        );

        // PackSizeBelowOne
        assert_eq!(
            update_stock_in_line(
                &context,
                UpdateStockInLine {
                    id: mock_customer_return_a_invoice_line_a().id,
                    pack_size: Some(0.0),
                    ..Default::default()
                },
            ),
            Err(ServiceError::PackSizeBelowOne)
        );

        // NumberOfPacksBelowZero
        assert_eq!(
            update_stock_in_line(
                &context,
                UpdateStockInLine {
                    id: mock_customer_return_a_invoice_line_a().id,
                    pack_size: Some(1.0),
                    number_of_packs: Some(-1.0),
                    ..Default::default()
                },
            ),
            Err(ServiceError::NumberOfPacksBelowZero)
        );

        // ItemNotFound
        assert_eq!(
            update_stock_in_line(
                &context,
                UpdateStockInLine {
                    id: mock_customer_return_a_invoice_line_a().id,
                    item_id: Some("invalid".to_string()),
                    pack_size: Some(1.0),
                    number_of_packs: Some(1.0),
                    ..Default::default()
                },
            ),
            Err(ServiceError::ItemNotFound)
        );

        // NotAStockIn
        assert_eq!(
            update_stock_in_line(
                &context,
                UpdateStockInLine {
                    id: mock_supplier_return_a_invoice_line_a().id,
                    pack_size: Some(1.0),
                    number_of_packs: Some(1.0),
                    ..Default::default()
                },
            ),
            Err(ServiceError::NotAStockIn)
        );

        // CannotEditFinalised
        assert_eq!(
            update_stock_in_line(
                &context,
                UpdateStockInLine {
                    id: verified_return_line().id,
                    item_id: Some(mock_item_a().id.clone()),
                    pack_size: Some(1.0),
                    number_of_packs: Some(1.0),
                    ..Default::default()
                },
            ),
            Err(ServiceError::CannotEditFinalised)
        );

        // BatchIsReserved
        assert_eq!(
            update_stock_in_line(
                &context,
                UpdateStockInLine {
                    id: mock_customer_return_a_invoice_line_b().id, // line number_of_packs and stock_line available_number_of_packs are different
                    item_id: Some(mock_item_b().id),
                    pack_size: Some(1.0),
                    number_of_packs: Some(1.0),
                    ..Default::default()
                },
            ),
            Err(ServiceError::BatchIsReserved)
        );

        // ProgramNotVisible
        assert_eq!(
            update_stock_in_line(
                &context,
                UpdateStockInLine {
                    id: mock_customer_return_a_invoice_line_a().id,
                    program_id: Some(NullableUpdate {
                        value: Some(mock_immunisation_program_a().id)
                    }), // Master list not visible to store_b
                    ..Default::default()
                },
            ),
            Err(ServiceError::ProgramNotVisible)
        );

        // NotThisStoreInvoice
        context.store_id = mock_store_a().id;
        assert_eq!(
            update_stock_in_line(
                &context,
                UpdateStockInLine {
                    id: mock_customer_return_a_invoice_line_a().id,
                    item_id: Some(mock_item_a().id),
                    pack_size: Some(1.0),
                    number_of_packs: Some(1.0),
                    ..Default::default()
                },
            ),
            Err(ServiceError::NotThisStoreInvoice)
        );

        // IncorrectLocationType
        assert_eq!(
            update_stock_in_line(
                &context,
                UpdateStockInLine {
                    id: item_line_with_restricted_location_type_b().id,
                    r#type: StockInType::InboundShipment,
                    location: Some(NullableUpdate {
                        value: Some(mock_location_with_restricted_location_type_a().id),
                    }),
                    ..Default::default()
                },
            ),
            Err(ServiceError::IncorrectLocationType)
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
            UpdateStockInLine {
                id: return_line_id.clone(),
                pack_size: Some(2.0),
                number_of_packs: Some(3.0),
                ..Default::default()
            },
        )
        .unwrap();

        let inbound_line_update = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&return_line_id)
            .unwrap()
            .unwrap();

        assert_eq!(inbound_line_update.pack_size, 2.0);
        assert_eq!(inbound_line_update.number_of_packs, 3.0);

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
            UpdateStockInLine {
                id: return_line_id.clone(),
                pack_size: Some(20.0),
                number_of_packs: Some(20.0),
                sell_price_per_pack: Some(100.0),
                cost_price_per_pack: Some(60.0),
                ..Default::default()
            },
        )
        .unwrap();

        let inbound_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&return_line_id)
            .unwrap()
            .unwrap();

        assert_eq!(inbound_line.pack_size, 1.0);
        assert_eq!(inbound_line.number_of_packs, 400.0);
        assert_eq!(inbound_line.sell_price_per_pack, 5.0);
        assert_eq!(inbound_line.cost_price_per_pack, 3.0);

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

        let vvm_log_filter = VVMStatusLogFilter::new().invoice_line_id(
            EqualFilter::equal_to("delivered_invoice_line_with_vvm_status".to_string()),
        );

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

        assert_eq!(vvm_status_logs.len(), 1);
        assert_eq!(vvm_log, Some(mock_vvm_status_b().id));

        // Volume per pack
        insert_stock_in_line(
            &context,
            InsertStockInLine {
                id: "volume_per_pack_invoice_line".to_string(),
                invoice_id: mock_transferred_inbound_shipment_a().id,
                item_id: mock_vaccine_item_a().id,
                pack_size: 1.0,
                number_of_packs: 1.0,
                r#type: StockInType::InboundShipment,
                expiry_date: NaiveDate::from_ymd_opt(2023, 10, 1),
                ..Default::default()
            },
        )
        .unwrap();
        let result = update_stock_in_line(
            &context,
            UpdateStockInLine {
                id: "volume_per_pack_invoice_line".to_string(),
                r#type: StockInType::InboundShipment,
                number_of_packs: Some(15.0),
                volume_per_pack: Some(10.0),
                expiry_date: Some(NullableUpdate { value: None }),
                ..Default::default()
            },
        )
        .unwrap();
        assert_eq!(result.invoice_line_row.volume_per_pack, 10.0);
        assert_eq!(result.invoice_line_row.expiry_date, None);

        let invoice_line = InvoiceLineRepository::new(&connection)
            .query_by_filter(
                InvoiceLineFilter::new()
                    .id(EqualFilter::equal_to("volume_per_pack_invoice_line".to_string())),
            )
            .unwrap()
            .pop()
            .unwrap();
        let stock_line = invoice_line.stock_line_option.clone().unwrap();
        assert_eq!(stock_line.volume_per_pack, 10.0);
        assert_eq!(stock_line.total_volume, 150.0);
    }
}

use chrono::{NaiveDate, Utc};
use repository::{
    ActivityLogType, InvoiceLineRowRepository, InvoiceRow, InvoiceRowRepository, InvoiceStatus,
};
use repository::{RepositoryError, StockLine};

use super::generate::{generate, GenerateResult};
use super::validate::validate;

use crate::activity_log::activity_log_entry;
use crate::invoice_line::stock_in_line::{insert_stock_in_line, InsertStockInLineError};
use crate::service_provider::ServiceContext;
use crate::stock_line::query::get_stock_line;
use crate::{NullableUpdate, SingleRecordError};

#[derive(Clone, Debug, PartialEq, Default)]
pub struct AddNewStockLine {
    pub stock_line_id: String,
    pub item_id: String,
    pub number_of_packs: f64,
    pub cost_price_per_pack: f64,
    pub sell_price_per_pack: f64,
    pub pack_size: f64,
    pub on_hold: bool,
    pub batch: Option<String>,
    pub location: Option<NullableUpdate<String>>,
    pub expiry_date: Option<NaiveDate>,
    pub reason_option_id: Option<String>,
    pub barcode: Option<String>,
    pub item_variant_id: Option<String>,
    pub vvm_status_id: Option<String>,
    pub donor_id: Option<String>,
    pub campaign_id: Option<String>,
    pub program_id: Option<String>,
    pub volume_per_pack: Option<f64>,
}

#[derive(Clone, Debug, PartialEq)]
pub enum AddNewStockLineError {
    StockLineAlreadyExists,
    AdjustmentReasonNotValid,
    AdjustmentReasonNotProvided,
    NewlyCreatedStockLineDoesNotExist,
    DatabaseError(RepositoryError),
    // Line Errors
    LineInsertError(InsertStockInLineError),
}

pub fn add_new_stock_line(
    ctx: &ServiceContext,
    input: AddNewStockLine,
) -> Result<StockLine, AddNewStockLineError> {
    let stock_line = ctx
        .connection
        .transaction_sync(|connection| {
            // Needed for query below, input is moved
            let stock_line_id = input.stock_line_id.clone();

            validate(connection, &input)?;
            let GenerateResult {
                invoice,
                stock_in_line,
                update_inventory_adjustment_reason,
            } = generate(connection, &ctx.store_id, &ctx.user_id, input)?;

            // Create Inventory Adjustment invoice in NEW status
            let invoice_row_repo = InvoiceRowRepository::new(connection);
            invoice_row_repo.upsert_one(&invoice)?;

            // Add invoice line (and introduce stock line)
            insert_stock_in_line(ctx, stock_in_line)
                .map_err(AddNewStockLineError::LineInsertError)?;

            // Add inventory adjustment reason to the invoice line
            let invoice_line_repo = InvoiceLineRowRepository::new(connection);
            invoice_line_repo.update_reason_option_id(
                &update_inventory_adjustment_reason.invoice_line_id,
                update_inventory_adjustment_reason.reason_option_id,
            )?;

            // Set invoice to verified
            let verified_datetime = Utc::now().naive_utc();

            let verified_invoice = InvoiceRow {
                status: InvoiceStatus::Verified,
                verified_datetime: Some(verified_datetime),
                ..invoice
            };

            invoice_row_repo.upsert_one(&verified_invoice)?;

            activity_log_entry(
                ctx,
                ActivityLogType::InventoryAdjustment,
                Some(verified_invoice.id.to_string()),
                None,
                None,
            )?;

            match get_stock_line(ctx, stock_line_id) {
                Ok(stock_line) => Ok(stock_line),
                Err(SingleRecordError::NotFound(_)) => {
                    Err(AddNewStockLineError::NewlyCreatedStockLineDoesNotExist)
                }
                Err(SingleRecordError::DatabaseError(error)) => {
                    Err(AddNewStockLineError::DatabaseError(error))
                }
            }
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(stock_line)
}

impl From<RepositoryError> for AddNewStockLineError {
    fn from(error: RepositoryError) -> Self {
        AddNewStockLineError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_item_a, mock_location_1, mock_stock_line_a, mock_store_a, mock_user_account_a,
            mock_vaccine_item_a, mock_vvm_status_a, MockData, MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        vvm_status::vvm_status_log::{VVMStatusLogFilter, VVMStatusLogRepository},
        EqualFilter, InvoiceFilter, InvoiceLineFilter, InvoiceLineRepository, InvoiceRepository,
        InvoiceStatus, ReasonOptionRow, ReasonOptionType,
    };

    use crate::{
        invoice::inventory_adjustment::add_new_stock_line::AddNewStockLine,
        invoice_line::stock_in_line::InsertStockInLineError, service_provider::ServiceProvider,
        NullableUpdate,
    };

    use super::AddNewStockLineError;

    type ServiceError = AddNewStockLineError;

    #[actix_rt::test]
    async fn add_new_stock_line_errors() {
        fn addition_reason() -> ReasonOptionRow {
            ReasonOptionRow {
                id: "addition".to_string(),
                reason: "test addition".to_string(),
                is_active: true,
                r#type: ReasonOptionType::PositiveInventoryAdjustment,
            }
        }
        let (_, _, connection_manager, _) = setup_all_with_data(
            "add_new_stock_line_errors",
            MockDataInserts::all(),
            MockData {
                reason_options: vec![addition_reason()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_service;

        // Stockline already exists
        assert_eq!(
            service.add_new_stock_line(
                &context,
                AddNewStockLine {
                    stock_line_id: mock_stock_line_a().id,
                    ..Default::default()
                }
            ),
            Err(ServiceError::StockLineAlreadyExists)
        );

        // Missing reason
        assert_eq!(
            service.add_new_stock_line(
                &context,
                AddNewStockLine {
                    stock_line_id: "new".to_string(),
                    number_of_packs: 1.0,
                    reason_option_id: None,
                    ..Default::default()
                }
            ),
            Err(ServiceError::AdjustmentReasonNotProvided)
        );

        // Invalid reason
        assert_eq!(
            service.add_new_stock_line(
                &context,
                AddNewStockLine {
                    stock_line_id: "new".to_string(),
                    number_of_packs: 2.0,
                    reason_option_id: Some("invalid".to_string()),
                    ..Default::default()
                }
            ),
            Err(ServiceError::AdjustmentReasonNotValid)
        );

        // Line level errors surfaced
        assert_eq!(
            service.add_new_stock_line(
                &context,
                AddNewStockLine {
                    stock_line_id: "new".to_string(),
                    pack_size: 0.0,
                    ..Default::default()
                }
            ),
            Err(ServiceError::LineInsertError(
                InsertStockInLineError::PackSizeBelowOne,
            ))
        );
    }

    #[actix_rt::test]
    async fn add_new_stock_line_success() {
        fn addition_reason() -> ReasonOptionRow {
            ReasonOptionRow {
                id: "addition".to_string(),
                reason: "test addition".to_string(),
                is_active: true,
                r#type: ReasonOptionType::PositiveInventoryAdjustment,
            }
        }
        let (_, connection, connection_manager, _) = setup_all_with_data(
            "add_new_stock_line_success",
            MockDataInserts::all(),
            MockData {
                reason_options: vec![addition_reason()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.invoice_service;

        let new_stock_line = service
            .add_new_stock_line(
                &context,
                AddNewStockLine {
                    stock_line_id: "new".to_string(),
                    pack_size: 1.0,
                    number_of_packs: 2.0,
                    item_id: mock_item_a().id,
                    reason_option_id: Some(addition_reason().id),
                    on_hold: true,
                    location: Some(NullableUpdate {
                        value: Some(mock_location_1().id),
                    }),
                    barcode: Some("barcode".to_string()),
                    ..Default::default()
                },
            )
            .unwrap();

        let stock_line_row = new_stock_line.stock_line_row;
        assert_eq!(stock_line_row.available_number_of_packs, 2.0);
        assert_eq!(stock_line_row.total_number_of_packs, 2.0);
        assert_eq!(stock_line_row.location_id, Some(mock_location_1().id));
        assert_eq!(stock_line_row.on_hold, true);
        let mut invoices = InvoiceRepository::new(&connection)
            .query_by_filter(InvoiceFilter::new().stock_line_id(stock_line_row.id))
            .unwrap();

        // Should only be one invoice related to the new stock line - the inventory adjustment
        assert_eq!(invoices.len(), 1);

        let inv_adj = invoices.pop().unwrap();
        let invoice_row = inv_adj.invoice_row;

        let mut invoice_lines = InvoiceLineRepository::new(&connection)
            .query_by_filter(
                InvoiceLineFilter::new()
                    .invoice_id(EqualFilter::equal_to(invoice_row.id.to_string())),
            )
            .unwrap();

        assert_eq!(invoice_lines.len(), 1);

        let invoice_line = invoice_lines.pop().unwrap();
        let invoice_line_row = invoice_line.invoice_line_row;

        assert_eq!(invoice_row.status, InvoiceStatus::Verified);

        assert_eq!(invoice_line_row.number_of_packs, 2.0);
        assert_eq!(
            invoice_line_row.reason_option_id,
            Some(addition_reason().id)
        );

        let new_stock_line = service
            .add_new_stock_line(
                &context,
                AddNewStockLine {
                    stock_line_id: "new_vaccine".to_string(),
                    pack_size: 1.0,
                    number_of_packs: 2.0,
                    item_id: mock_vaccine_item_a().id,
                    reason_option_id: Some(addition_reason().id),
                    vvm_status_id: Some(mock_vvm_status_a().id),
                    ..Default::default()
                },
            )
            .unwrap();

        let stock_line_id = new_stock_line.stock_line_row.id.clone();
        let invoice = InvoiceRepository::new(&connection)
            .query_by_filter(InvoiceFilter::new().stock_line_id(stock_line_id.clone()))
            .unwrap()
            .pop()
            .unwrap();

        let invoice_lines = InvoiceLineRepository::new(&connection)
            .query_by_filter(
                InvoiceLineFilter::new()
                    .invoice_id(EqualFilter::equal_to(invoice.invoice_row.id.to_string())),
            )
            .unwrap()
            .pop()
            .unwrap();

        let vvm_status_log = VVMStatusLogRepository::new(&connection)
            .query_by_filter(
                VVMStatusLogFilter::new()
                    .stock_line_id(EqualFilter::equal_to(stock_line_id.to_string()))
                    .invoice_line_id(EqualFilter::equal_to(
                        invoice_lines.invoice_line_row.id.to_string(),
                    )),
            )
            .unwrap()
            .pop();

        assert!(new_stock_line.vvm_status_row.is_some());
        assert!(vvm_status_log.is_some());
    }

    #[actix_rt::test]
    async fn add_new_stock_line_success_no_reason() {
        let (_, _, connection_manager, _) = setup_all(
            "add_new_stock_line_success_no_reason",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.invoice_service;

        let res = service.add_new_stock_line(
            &context,
            AddNewStockLine {
                stock_line_id: "new".to_string(),
                pack_size: 1.0,
                number_of_packs: 2.0,
                item_id: mock_item_a().id,
                reason_option_id: None, // Check *no* error when reasons not defined and not provided
                ..Default::default()
            },
        );
        assert!(res.is_ok());
    }
}

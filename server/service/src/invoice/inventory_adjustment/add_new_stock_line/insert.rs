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
    pub inventory_adjustment_reason_id: Option<String>,
    pub barcode: Option<String>,
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
                .map_err(|error| AddNewStockLineError::LineInsertError(error))?;

            // Add inventory adjustment reason to the invoice line
            let invoice_line_repo = InvoiceLineRowRepository::new(connection);
            invoice_line_repo.update_inventory_adjustment_reason_id(
                &update_inventory_adjustment_reason.invoice_line_id,
                update_inventory_adjustment_reason.reason_id,
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
                Some(verified_invoice.id.to_owned()),
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
            MockData, MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        EqualFilter, InventoryAdjustmentReasonRow, InventoryAdjustmentType, InvoiceFilter,
        InvoiceLineFilter, InvoiceLineRepository, InvoiceRepository, InvoiceStatus,
    };
    use util::inline_edit;

    use crate::{
        invoice::inventory_adjustment::add_new_stock_line::AddNewStockLine,
        invoice_line::stock_in_line::InsertStockInLineError, service_provider::ServiceProvider,
        NullableUpdate,
    };

    use super::AddNewStockLineError;

    type ServiceError = AddNewStockLineError;

    #[actix_rt::test]
    async fn add_new_stock_line_errors() {
        fn addition_reason() -> InventoryAdjustmentReasonRow {
            InventoryAdjustmentReasonRow {
                id: "addition".to_string(),
                reason: "test addition".to_string(),
                is_active: true,
                r#type: InventoryAdjustmentType::Positive,
            }
        }
        let (_, _, connection_manager, _) = setup_all_with_data(
            "add_new_stock_line_errors",
            MockDataInserts::all(),
            MockData {
                inventory_adjustment_reasons: vec![addition_reason()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
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
                    inventory_adjustment_reason_id: None,
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
                    inventory_adjustment_reason_id: Some("invalid".to_string()),
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
        fn addition_reason() -> InventoryAdjustmentReasonRow {
            InventoryAdjustmentReasonRow {
                id: "addition".to_string(),
                reason: "test addition".to_string(),
                is_active: true,
                r#type: InventoryAdjustmentType::Positive,
            }
        }
        let (_, connection, connection_manager, _) = setup_all_with_data(
            "add_new_stock_line_success",
            MockDataInserts::all(),
            MockData {
                inventory_adjustment_reasons: vec![addition_reason()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
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
                    inventory_adjustment_reason_id: Some(addition_reason().id),
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
        assert_eq!(
            stock_line_row,
            inline_edit(&stock_line_row, |mut u| {
                u.available_number_of_packs = 2.0;
                u.total_number_of_packs = 2.0;
                u.location_id = Some(mock_location_1().id);
                u.on_hold = true;
                u
            })
        );
        let mut invoices = InvoiceRepository::new(&connection)
            .query_by_filter(InvoiceFilter::new().stock_line_id(stock_line_row.id))
            .unwrap();

        // Should only be one invoice related to the new stock line - the inventory adjustment
        assert_eq!(invoices.len(), 1);

        let inv_adj = invoices.pop().unwrap();
        let invoice_row = inv_adj.invoice_row;

        let mut invoice_lines = InvoiceLineRepository::new(&connection)
            .query_by_filter(
                InvoiceLineFilter::new().invoice_id(EqualFilter::equal_to(&invoice_row.id)),
            )
            .unwrap();

        assert_eq!(invoice_lines.len(), 1);

        let invoice_line = invoice_lines.pop().unwrap();
        let invoice_line_row = invoice_line.invoice_line_row;

        assert_eq!(
            invoice_row,
            inline_edit(&invoice_row, |mut u| {
                u.status = InvoiceStatus::Verified;
                u
            })
        );

        assert_eq!(
            invoice_line_row,
            inline_edit(&invoice_line_row, |mut u| {
                u.number_of_packs = 2.0;
                u.inventory_adjustment_reason_id = Some(addition_reason().id);
                u
            })
        );
    }

    #[actix_rt::test]
    async fn add_new_stock_line_success_no_reason() {
        let (_, _, connection_manager, _) = setup_all(
            "add_new_stock_line_success_no_reason",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
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
                inventory_adjustment_reason_id: None, // Check *no* error when reasons not defined and not provided
                ..Default::default()
            },
        );
        assert!(res.is_ok());
    }
}

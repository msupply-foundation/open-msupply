use chrono::Utc;
use repository::RepositoryError;
use repository::{
    ActivityLogType, Invoice, InvoiceLineRowRepository, InvoiceRow, InvoiceRowRepository,
    InvoiceStatus, StockLine,
};

use super::generate::{generate, GenerateResult, InsertStockInOrOutLine};
use super::validate::validate;

use crate::activity_log::activity_log_entry;
use crate::invoice::query::get_invoice;
use crate::invoice_line::stock_in_line::{insert_stock_in_line, InsertStockInLineError};
use crate::invoice_line::stock_out_line::{insert_stock_out_line, InsertStockOutLineError};
use crate::service_provider::ServiceContext;

#[derive(Clone, Debug, PartialEq)]

pub enum AdjustmentType {
    Addition,
    Reduction,
}

impl Default for AdjustmentType {
    fn default() -> Self {
        Self::Addition
    }
}

#[derive(Clone, Debug, PartialEq, Default)]
pub struct InsertInventoryAdjustment {
    pub stock_line_id: String,
    pub adjustment: f64,
    pub adjustment_type: AdjustmentType,
    pub inventory_adjustment_reason_id: Option<String>,
    /// defaults to the system `Inventory adjustments` name
    pub name_id: Option<String>,
}

#[derive(Clone, Debug, PartialEq)]
pub enum InsertInventoryAdjustmentError {
    InvalidStore,
    StockLineDoesNotExist,
    StockLineReducedBelowZero(StockLine),
    InvalidAdjustment,
    AdjustmentReasonNotValid,
    AdjustmentReasonNotProvided,
    NewlyCreatedInvoiceDoesNotExist,
    DatabaseError(RepositoryError),
    InternalError(String),
    StockInLineInsertError(InsertStockInLineError),
    StockOutLineInsertError(InsertStockOutLineError),
}

pub fn insert_inventory_adjustment(
    ctx: &ServiceContext,
    input: InsertInventoryAdjustment,
) -> Result<Invoice, InsertInventoryAdjustmentError> {
    let invoice = ctx
        .connection
        .transaction_sync(|connection| {
            let stock_line = validate(connection, &ctx.store_id, &input)?;
            let GenerateResult {
                invoice,
                insert_stock_in_or_out_line,
                update_inventory_adjustment_reason,
            } = generate(connection, &ctx.store_id, &ctx.user_id, input, stock_line)?;

            // Create Inventory Adjustment in New status
            let invoice_row_repo = InvoiceRowRepository::new(connection);
            invoice_row_repo.upsert_one(&invoice)?;

            // Add invoice line (and update stock line)
            match insert_stock_in_or_out_line {
                InsertStockInOrOutLine::StockIn(stock_in_line) => {
                    insert_stock_in_line(ctx, stock_in_line).map_err(|error| {
                        InsertInventoryAdjustmentError::StockInLineInsertError(error)
                    })?;
                }
                InsertStockInOrOutLine::StockOut(stock_out_line) => {
                    insert_stock_out_line(ctx, stock_out_line).map_err(|error| {
                        InsertInventoryAdjustmentError::StockOutLineInsertError(error)
                    })?;
                }
            }

            // Add inventory adjustment reason to the invoice line
            let invoice_line_repo = InvoiceLineRowRepository::new(connection);
            invoice_line_repo.update_inventory_adjustment_reason_id(
                &update_inventory_adjustment_reason.invoice_line_id,
                update_inventory_adjustment_reason.reason_id,
            )?;

            let verified_invoice = InvoiceRow {
                status: InvoiceStatus::Verified,
                verified_datetime: Some(Utc::now().naive_utc()),
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

            get_invoice(ctx, None, &verified_invoice.id)
                .map_err(InsertInventoryAdjustmentError::DatabaseError)?
                .ok_or(InsertInventoryAdjustmentError::NewlyCreatedInvoiceDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(invoice)
}

impl From<RepositoryError> for InsertInventoryAdjustmentError {
    fn from(error: RepositoryError) -> Self {
        InsertInventoryAdjustmentError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_stock_line_a, mock_stock_line_b, mock_store_a, mock_store_b, mock_user_account_a,
            MockData, MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        EqualFilter, InventoryAdjustmentReasonRow, InventoryAdjustmentType, InvoiceRowRepository,
        InvoiceStatus, StockLineFilter, StockLineRepository, StockLineRowRepository,
    };
    use util::inline_edit;

    use crate::{
        invoice::inventory_adjustment::{
            adjust_existing_stock::InsertInventoryAdjustment, AdjustmentType,
        },
        service_provider::ServiceProvider,
    };

    use super::InsertInventoryAdjustmentError;

    type ServiceError = InsertInventoryAdjustmentError;

    #[actix_rt::test]
    async fn insert_inventory_adjustment_errors() {
        fn reduction_reason() -> InventoryAdjustmentReasonRow {
            InventoryAdjustmentReasonRow {
                id: "reduction".to_string(),
                reason: "test reduction".to_string(),
                is_active: true,
                r#type: InventoryAdjustmentType::Negative,
            }
        }
        let (_, _, connection_manager, _) = setup_all_with_data(
            "insert_inventory_adjustment_errors",
            MockDataInserts::all(),
            MockData {
                inventory_adjustment_reasons: vec![reduction_reason()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_service;

        // Stockline doesn't exist
        assert_eq!(
            service.insert_inventory_adjustment(
                &context,
                InsertInventoryAdjustment {
                    stock_line_id: "x".to_string(),
                    ..Default::default()
                }
            ),
            Err(ServiceError::StockLineDoesNotExist)
        );

        // Wrong store
        context.store_id = mock_store_b().id;
        assert_eq!(
            service.insert_inventory_adjustment(
                &context,
                InsertInventoryAdjustment {
                    stock_line_id: mock_stock_line_a().id,
                    ..Default::default()
                }
            ),
            Err(ServiceError::InvalidStore)
        );
        context.store_id = mock_store_a().id;

        // Missing reason
        assert_eq!(
            service.insert_inventory_adjustment(
                &context,
                InsertInventoryAdjustment {
                    stock_line_id: mock_stock_line_a().id,
                    adjustment: 2.0,
                    adjustment_type: AdjustmentType::Reduction,
                    ..Default::default()
                }
            ),
            Err(ServiceError::AdjustmentReasonNotProvided)
        );

        // Invalid reason
        assert_eq!(
            service.insert_inventory_adjustment(
                &context,
                InsertInventoryAdjustment {
                    stock_line_id: mock_stock_line_a().id,
                    adjustment: 2.0,
                    inventory_adjustment_reason_id: Some("invalid".to_string()),
                    ..Default::default()
                }
            ),
            Err(ServiceError::AdjustmentReasonNotValid)
        );

        // Invalid adjustment (adjustment = 0)
        assert_eq!(
            service.insert_inventory_adjustment(
                &context,
                InsertInventoryAdjustment {
                    stock_line_id: mock_stock_line_a().id,
                    adjustment: 0.0,
                    ..Default::default()
                }
            ),
            Err(ServiceError::InvalidAdjustment)
        );

        // Invalid adjustment (adjustment < 0)
        assert_eq!(
            service.insert_inventory_adjustment(
                &context,
                InsertInventoryAdjustment {
                    stock_line_id: mock_stock_line_a().id,
                    adjustment: -10.0,
                    ..Default::default()
                }
            ),
            Err(ServiceError::InvalidAdjustment)
        );

        // Reduce stock below zero
        let stock_line = StockLineRepository::new(&context.connection)
            .query_by_filter(
                StockLineFilter::new().id(EqualFilter::equal_to(&mock_stock_line_a().id)),
                Some(mock_store_a().id.clone()),
            )
            .unwrap()
            .pop()
            .unwrap();

        assert_eq!(
            service.insert_inventory_adjustment(
                &context,
                InsertInventoryAdjustment {
                    stock_line_id: mock_stock_line_a().id,
                    adjustment_type:
                        crate::invoice::inventory_adjustment::AdjustmentType::Reduction,
                    adjustment: 50.0,
                    inventory_adjustment_reason_id: Some(reduction_reason().id),
                    ..Default::default()
                }
            ),
            Err(ServiceError::StockLineReducedBelowZero(stock_line))
        );
    }

    #[actix_rt::test]
    async fn insert_inventory_adjustment_success_no_reasons() {
        let (_, _, connection_manager, _) = setup_all(
            "insert_inventory_adjustment_success_no_reasons",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.invoice_service;

        // Check *no* error when reasons not defined and not provided
        let result = service.insert_inventory_adjustment(
            &context,
            InsertInventoryAdjustment {
                stock_line_id: mock_stock_line_a().id,
                adjustment: 1.0,
                ..Default::default()
            },
        );

        assert!(result.is_ok());
    }

    #[actix_rt::test]
    async fn insert_inventory_adjustment_success() {
        let (_, connection, connection_manager, _) = setup_all(
            "insert_inventory_adjustment_success",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.invoice_service;

        // Positive adjustment
        let created_invoice = service
            .insert_inventory_adjustment(
                &context,
                InsertInventoryAdjustment {
                    stock_line_id: mock_stock_line_a().id,
                    adjustment: 2.0,
                    ..Default::default()
                },
            )
            .unwrap();

        let retrieved_invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&created_invoice.invoice_row.id)
            .unwrap()
            .unwrap();

        let updated_stockline = StockLineRowRepository::new(&connection)
            .find_one_by_id(&mock_stock_line_a().id)
            .unwrap()
            .unwrap();

        assert_eq!(
            retrieved_invoice,
            inline_edit(&retrieved_invoice, |mut u| {
                u.id = created_invoice.invoice_row.id;
                u.status = InvoiceStatus::Verified;
                u
            })
        );

        assert_eq!(
            updated_stockline.available_number_of_packs,
            mock_stock_line_a().available_number_of_packs + 2.0
        );

        assert_eq!(
            updated_stockline.total_number_of_packs,
            mock_stock_line_a().total_number_of_packs + 2.0
        );

        // Negative adjustment
        let created_invoice = service
            .insert_inventory_adjustment(
                &context,
                InsertInventoryAdjustment {
                    stock_line_id: mock_stock_line_b().id,
                    adjustment_type: AdjustmentType::Reduction,
                    adjustment: 10.5,
                    ..Default::default()
                },
            )
            .unwrap();

        let retrieved_invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&created_invoice.invoice_row.id)
            .unwrap()
            .unwrap();

        let updated_stockline = StockLineRowRepository::new(&connection)
            .find_one_by_id(&mock_stock_line_b().id)
            .unwrap()
            .unwrap();

        assert_eq!(
            retrieved_invoice,
            inline_edit(&retrieved_invoice, |mut u| {
                u.id = created_invoice.invoice_row.id;
                u.status = InvoiceStatus::Verified;
                u
            })
        );

        assert_eq!(
            updated_stockline.available_number_of_packs,
            mock_stock_line_b().available_number_of_packs - 10.5
        );

        assert_eq!(
            updated_stockline.total_number_of_packs,
            mock_stock_line_b().total_number_of_packs - 10.5
        );
    }
}

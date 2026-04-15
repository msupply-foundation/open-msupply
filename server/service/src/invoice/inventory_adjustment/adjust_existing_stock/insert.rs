use chrono::{DateTime, Utc};
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

#[derive(Clone, Debug, PartialEq, Default)]
pub enum AdjustmentType {
    #[default]
    Addition,
    Reduction,
}

#[derive(Clone, Debug, PartialEq, Default)]
pub struct InsertInventoryAdjustment {
    pub stock_line_id: String,
    pub adjustment: f64,
    pub adjustment_type: AdjustmentType,
    pub reason_option_id: Option<String>,
    pub backdated_datetime: Option<DateTime<Utc>>,
}

#[derive(Clone, Debug, PartialEq)]
pub enum InsertInventoryAdjustmentError {
    InvalidStore,
    StockLineDoesNotExist,
    StockLineReducedBelowZero(StockLine),
    InvalidAdjustment,
    AdjustmentReasonNotValid,
    AdjustmentReasonNotProvided,
    BackdatingNotEnabled,
    CannotSetDateInFuture,
    ExceedsMaximumBackdatingDays,
    LedgerGoesBelowZero,
    NewlyCreatedInvoiceDoesNotExist,
    PreferenceError(String),
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
            let stock_line_id = stock_line.stock_line_row.id.clone();
            let backdated_datetime = input.backdated_datetime;
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
                    insert_stock_in_line(ctx, stock_in_line, None).map_err(|error| {
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
            invoice_line_repo.update_reason_option_id(
                &update_inventory_adjustment_reason.invoice_line_id,
                update_inventory_adjustment_reason.reason_option_id,
            )?;

            let verified_datetime = backdated_datetime
                .map(|d| d.naive_utc())
                .unwrap_or_else(|| Utc::now().naive_utc());
            let verified_invoice = InvoiceRow {
                status: InvoiceStatus::Verified,
                verified_datetime: Some(verified_datetime),
                backdated_datetime: backdated_datetime.map(|d| d.naive_utc()),
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

            // Also log against the stock line so it appears in the stock line's Log tab
            activity_log_entry(
                ctx,
                ActivityLogType::InventoryAdjustment,
                Some(stock_line_id),
                None,
                None,
            )?;

            get_invoice(ctx, None, &verified_invoice.id, None)
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

impl From<crate::preference::PreferenceError> for InsertInventoryAdjustmentError {
    fn from(error: crate::preference::PreferenceError) -> Self {
        InsertInventoryAdjustmentError::PreferenceError(format!("{error:?}"))
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
        EqualFilter, InvoiceRowRepository, InvoiceStatus, ReasonOptionRow, ReasonOptionType,
        StockLineFilter, StockLineRepository, StockLineRowRepository,
    };

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
        fn reduction_reason() -> ReasonOptionRow {
            ReasonOptionRow {
                id: "reduction".to_string(),
                reason: "test reduction".to_string(),
                is_active: true,
                r#type: ReasonOptionType::NegativeInventoryAdjustment,
            }
        }
        let (_, _, connection_manager, _) = setup_all_with_data(
            "insert_inventory_adjustment_errors",
            MockDataInserts::all(),
            MockData {
                reason_options: vec![reduction_reason()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
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
                    reason_option_id: Some("invalid".to_string()),
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
                StockLineFilter::new().id(EqualFilter::equal_to(mock_stock_line_a().id)),
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
                    reason_option_id: Some(reduction_reason().id),
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

        let service_provider = ServiceProvider::new(connection_manager);
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

        let service_provider = ServiceProvider::new(connection_manager);
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

        assert_eq!(retrieved_invoice, {
            let mut u = retrieved_invoice.clone();
            u.id = created_invoice.invoice_row.id;
            u.status = InvoiceStatus::Verified;
            u
        });

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

        assert_eq!(retrieved_invoice, {
            let mut u = retrieved_invoice.clone();
            u.id = created_invoice.invoice_row.id;
            u.status = InvoiceStatus::Verified;
            u
        });

        assert_eq!(
            updated_stockline.available_number_of_packs,
            mock_stock_line_b().available_number_of_packs - 10.5
        );

        assert_eq!(
            updated_stockline.total_number_of_packs,
            mock_stock_line_b().total_number_of_packs - 10.5
        );
    }

    // Timeline: stock received 10 packs (5 days ago), 8 picked out (2 days ago), current = 2.
    // Backdated reduction at 3 days ago must not cause a dip below zero at any point
    // between then and now. The min-available algorithm tracks the lowest point.
    //
    // With a 5-pack backdated reduction: 10 → 5 at 3 days ago, then 5 - 8 = -3 at
    // 2 days ago → dip below zero → LedgerGoesBelowZero.
    //
    // With a 2-pack backdated reduction: 10 → 8 at 3 days ago, then 8 - 8 = 0 at
    // 2 days ago → no dip → success.
    #[actix_rt::test]
    async fn insert_inventory_adjustment_backdated_ledger_below_zero() {
        use chrono::{DateTime, Duration, Utc};
        use repository::{
            InvoiceLineRow, InvoiceLineType, InvoiceRow, InvoiceType, PreferenceRow,
            PreferenceRowRepository, StockLineRow,
        };

        let two_days_ago = Utc::now().naive_utc() - Duration::days(2);

        // Current stock: 2 packs (10 originally, 8 went out 2 days ago)
        fn stock_line() -> StockLineRow {
            StockLineRow {
                id: "backdate_ledger_stock".to_string(),
                store_id: mock_store_a().id,
                item_link_id: repository::mock::mock_item_a().id,
                available_number_of_packs: 2.0,
                total_number_of_packs: 2.0,
                pack_size: 1.0,
                ..Default::default()
            }
        }

        fn outbound_invoice(picked: chrono::NaiveDateTime) -> InvoiceRow {
            InvoiceRow {
                id: "backdate_ledger_outbound".to_string(),
                name_id: repository::mock::mock_name_a().id,
                store_id: mock_store_a().id,
                r#type: InvoiceType::OutboundShipment,
                status: InvoiceStatus::Picked,
                picked_datetime: Some(picked),
                ..Default::default()
            }
        }

        fn outbound_line() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "backdate_ledger_outbound_line".to_string(),
                invoice_id: "backdate_ledger_outbound".to_string(),
                item_link_id: repository::mock::mock_item_a().id,
                stock_line_id: Some("backdate_ledger_stock".to_string()),
                r#type: InvoiceLineType::StockOut,
                number_of_packs: 8.0,
                pack_size: 1.0,
                ..Default::default()
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "insert_inventory_adjustment_backdated_ledger",
            MockDataInserts::all(),
            MockData {
                stock_lines: vec![stock_line()],
                invoices: vec![outbound_invoice(two_days_ago)],
                invoice_lines: vec![outbound_line()],
                ..Default::default()
            },
        )
        .await;

        // Enable backdating preference
        PreferenceRowRepository::new(&connection)
            .upsert_one(&PreferenceRow {
                id: "backdating_global".to_string(),
                key: "backdating".to_string(),
                value: r#"{"shipmentsEnabled":true,"inventoryAdjustmentsEnabled":true,"maxDays":0}"#
                    .to_string(),
                store_id: None,
            })
            .unwrap();

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.invoice_service;

        let three_days_ago: DateTime<Utc> = Utc::now() - Duration::days(3);

        // Min available across timeline with 5-pack reduction:
        // current=2, walk back: undo 8-pack outbound → 10, that's the historical value.
        // Min is min(2, 10) = 2. So 2 - 5 < 0 → LedgerGoesBelowZero
        assert_eq!(
            service.insert_inventory_adjustment(
                &context,
                InsertInventoryAdjustment {
                    stock_line_id: stock_line().id,
                    adjustment_type: AdjustmentType::Reduction,
                    adjustment: 5.0,
                    backdated_datetime: Some(three_days_ago),
                    ..Default::default()
                }
            ),
            Err(ServiceError::LedgerGoesBelowZero)
        );

        // With 1-pack reduction: min=2, 2 - 1 >= 0 → success
        let result = service.insert_inventory_adjustment(
            &context,
            InsertInventoryAdjustment {
                stock_line_id: stock_line().id,
                adjustment_type: AdjustmentType::Reduction,
                adjustment: 1.0,
                backdated_datetime: Some(three_days_ago),
                ..Default::default()
            },
        );
        assert!(
            result.is_ok(),
            "Backdated reduction within ledger limits should succeed: {:#?}",
            result
        );
    }

    // Covers the three pure backdating gates in validate.rs:
    //   - preference disabled  → BackdatingNotEnabled
    //   - datetime in future   → CannotSetDateInFuture
    //   - datetime exceeds max → ExceedsMaximumBackdatingDays
    #[actix_rt::test]
    async fn insert_inventory_adjustment_backdating_validation_errors() {
        use chrono::{Duration, Utc};
        use repository::{PreferenceRow, PreferenceRowRepository};

        let (_, connection, connection_manager, _) = setup_all(
            "insert_inventory_adjustment_backdating_validation_errors",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.invoice_service;

        let one_day_ago = Utc::now() - Duration::days(1);

        // Preference not set (defaults: inventory_adjustments_enabled = false)
        // → BackdatingNotEnabled
        assert_eq!(
            service.insert_inventory_adjustment(
                &context,
                InsertInventoryAdjustment {
                    stock_line_id: mock_stock_line_a().id,
                    adjustment: 1.0,
                    backdated_datetime: Some(one_day_ago),
                    ..Default::default()
                }
            ),
            Err(ServiceError::BackdatingNotEnabled)
        );

        // Preference enabled for shipments only
        // → BackdatingNotEnabled (inventory adjustments still disabled)
        let pref_repo = PreferenceRowRepository::new(&connection);
        pref_repo
            .upsert_one(&PreferenceRow {
                id: "backdating_global".to_string(),
                key: "backdating".to_string(),
                value: r#"{"shipmentsEnabled":true,"inventoryAdjustmentsEnabled":false,"maxDays":0}"#
                    .to_string(),
                store_id: None,
            })
            .unwrap();

        assert_eq!(
            service.insert_inventory_adjustment(
                &context,
                InsertInventoryAdjustment {
                    stock_line_id: mock_stock_line_a().id,
                    adjustment: 1.0,
                    backdated_datetime: Some(one_day_ago),
                    ..Default::default()
                }
            ),
            Err(ServiceError::BackdatingNotEnabled)
        );

        // Enable backdating for inventory adjustments, with a max of 1 day
        pref_repo
            .upsert_one(&PreferenceRow {
                id: "backdating_global".to_string(),
                key: "backdating".to_string(),
                value: r#"{"shipmentsEnabled":true,"inventoryAdjustmentsEnabled":true,"maxDays":1}"#
                    .to_string(),
                store_id: None,
            })
            .unwrap();

        // Future datetime → CannotSetDateInFuture
        let future = Utc::now() + Duration::days(1);
        assert_eq!(
            service.insert_inventory_adjustment(
                &context,
                InsertInventoryAdjustment {
                    stock_line_id: mock_stock_line_a().id,
                    adjustment: 1.0,
                    backdated_datetime: Some(future),
                    ..Default::default()
                }
            ),
            Err(ServiceError::CannotSetDateInFuture)
        );

        // Older than max_days (1) → ExceedsMaximumBackdatingDays
        let three_days_ago = Utc::now() - Duration::days(3);
        assert_eq!(
            service.insert_inventory_adjustment(
                &context,
                InsertInventoryAdjustment {
                    stock_line_id: mock_stock_line_a().id,
                    adjustment: 1.0,
                    backdated_datetime: Some(three_days_ago),
                    ..Default::default()
                }
            ),
            Err(ServiceError::ExceedsMaximumBackdatingDays)
        );
    }

    // Positive backdated adjustment: should bypass the ledger check entirely
    // (only Reductions can drive the ledger below zero) and persist
    // backdated_datetime + verified_datetime on the resulting invoice.
    #[actix_rt::test]
    async fn insert_inventory_adjustment_backdated_addition_success() {
        use chrono::{Duration, Utc};
        use repository::{PreferenceRow, PreferenceRowRepository};

        let (_, connection, connection_manager, _) = setup_all(
            "insert_inventory_adjustment_backdated_addition_success",
            MockDataInserts::all(),
        )
        .await;

        // Enable backdating for inventory adjustments (no max_days cap)
        PreferenceRowRepository::new(&connection)
            .upsert_one(&PreferenceRow {
                id: "backdating_global".to_string(),
                key: "backdating".to_string(),
                value: r#"{"shipmentsEnabled":true,"inventoryAdjustmentsEnabled":true,"maxDays":0}"#
                    .to_string(),
                store_id: None,
            })
            .unwrap();

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.invoice_service;

        let three_days_ago = Utc::now() - Duration::days(3);

        let starting_available = mock_stock_line_a().available_number_of_packs;
        let starting_total = mock_stock_line_a().total_number_of_packs;

        let created_invoice = service
            .insert_inventory_adjustment(
                &context,
                InsertInventoryAdjustment {
                    stock_line_id: mock_stock_line_a().id,
                    adjustment_type: AdjustmentType::Addition,
                    adjustment: 3.0,
                    backdated_datetime: Some(three_days_ago),
                    ..Default::default()
                },
            )
            .expect("Backdated addition should succeed regardless of ledger state");

        // Stock line was incremented
        let updated_stockline = StockLineRowRepository::new(&connection)
            .find_one_by_id(&mock_stock_line_a().id)
            .unwrap()
            .unwrap();
        assert_eq!(
            updated_stockline.available_number_of_packs,
            starting_available + 3.0
        );
        assert_eq!(
            updated_stockline.total_number_of_packs,
            starting_total + 3.0
        );

        // Invoice persisted with backdated_datetime and verified at the
        // backdated time (not "now")
        let retrieved_invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&created_invoice.invoice_row.id)
            .unwrap()
            .unwrap();

        assert_eq!(retrieved_invoice.status, InvoiceStatus::Verified);
        assert_eq!(
            retrieved_invoice.backdated_datetime,
            Some(three_days_ago.naive_utc())
        );
        assert_eq!(
            retrieved_invoice.verified_datetime,
            Some(three_days_ago.naive_utc())
        );
    }
}

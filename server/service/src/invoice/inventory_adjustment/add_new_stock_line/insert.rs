use chrono::{NaiveDate, Utc};
use repository::RepositoryError;
use repository::{ActivityLogType, Invoice, InvoiceRow, InvoiceRowRepository, InvoiceRowStatus};

use super::generate::generate;
use super::validate::validate;

use crate::activity_log::activity_log_entry;
use crate::invoice::query::get_invoice;
use crate::invoice_line::stock_in_line::{insert_stock_in_line, InsertStockInLineError};
use crate::service_provider::ServiceContext;
use crate::NullableUpdate;

#[derive(Clone, Debug, PartialEq, Default)]
pub struct AddNewStockLine {
    pub stock_line_id: String,
    pub item_id: String,
    pub number_of_packs: f64,
    pub cost_price_per_pack: f64,
    pub sell_price_per_pack: f64,
    pub pack_size: u32,
    pub on_hold: bool,
    pub batch: Option<String>,
    pub location: Option<NullableUpdate<String>>,
    pub expiry_date: Option<NaiveDate>,
    pub inventory_adjustment_reason_id: Option<String>,
}

#[derive(Clone, Debug, PartialEq)]
pub enum AddNewStockLineError {
    InvalidStore,
    StockLineAlreadyExists,
    AdjustmentReasonNotValid,
    AdjustmentReasonNotProvided,
    NewlyCreatedInvoiceDoesNotExist,
    DatabaseError(RepositoryError),
    InternalError(String),
    // Line Errors
    LineInsertError(InsertStockInLineError),
}

pub fn add_new_stock_line(
    ctx: &ServiceContext,
    input: AddNewStockLine,
) -> Result<Invoice, AddNewStockLineError> {
    let invoice = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &ctx.store_id, &input)?;
            let (new_invoice, stock_in_line) =
                generate(connection, &ctx.store_id, &ctx.user_id, input)?;

            let invoice_row_repo = InvoiceRowRepository::new(connection);
            invoice_row_repo.upsert_one(&new_invoice)?;

            insert_stock_in_line(ctx, stock_in_line)
                .map_err(|error| AddNewStockLineError::LineInsertError(error))?;

            let verified_datetime = Utc::now().naive_utc();

            let verified_invoice = InvoiceRow {
                status: InvoiceRowStatus::Verified,
                verified_datetime: Some(verified_datetime),
                ..new_invoice
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
                .map_err(AddNewStockLineError::DatabaseError)?
                .ok_or(AddNewStockLineError::NewlyCreatedInvoiceDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(invoice)
}

impl From<RepositoryError> for AddNewStockLineError {
    fn from(error: RepositoryError) -> Self {
        AddNewStockLineError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{mock_item_a, mock_store_a, mock_user_account_a, MockData, MockDataInserts},
        test_db::{setup_all, setup_all_with_data},
        EqualFilter, InventoryAdjustmentReasonRow, InventoryAdjustmentReasonType,
        InvoiceLineFilter, InvoiceLineRepository, InvoiceRowStatus,
    };
    use util::inline_edit;

    use crate::{
        invoice::inventory_adjustment::add_new_stock_line::AddNewStockLine,
        invoice_line::stock_in_line::InsertStockInLineError, service_provider::ServiceProvider,
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
                r#type: InventoryAdjustmentReasonType::Positive,
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
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_service;

        // tODO
        // Stockline already exists
        // assert_eq!(
        //     service.add_new_stock_line(
        //         &context,
        //         AddNewStockLine {
        //             id: "x".to_string(),
        //             ..Default::default()
        //         }
        //     ),
        //     Err(ServiceError::StockLineAlreadyExists)
        // );

        // Invalid store
        context.store_id = "invalid".to_string();
        assert_eq!(
            service.add_new_stock_line(
                &context,
                AddNewStockLine {
                    ..Default::default()
                }
            ),
            Err(ServiceError::InvalidStore)
        );
        context.store_id = mock_store_a().id;

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
                    pack_size: 0,
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
        let (_, connection, connection_manager, _) =
            setup_all("add_new_stock_line_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.invoice_service;

        let inv_adj = service
            .add_new_stock_line(
                &context,
                AddNewStockLine {
                    stock_line_id: "new".to_string(),
                    pack_size: 1,
                    number_of_packs: 2.0,
                    item_id: mock_item_a().id,
                    inventory_adjustment_reason_id: None, // todo set
                    ..Default::default()
                },
            )
            .unwrap();

        let invoice_row = inv_adj.invoice_row;

        let mut invoice_lines = InvoiceLineRepository::new(&connection)
            .query_by_filter(
                InvoiceLineFilter::new().invoice_id(EqualFilter::equal_to(&invoice_row.id)),
            )
            .unwrap();

        assert_eq!(invoice_lines.len(), 1);

        let invoice_line = invoice_lines.pop().unwrap();
        let invoice_line_row = invoice_line.invoice_line_row;

        let stock_line_row = invoice_line.stock_line_option.unwrap();

        assert_eq!(
            invoice_row,
            inline_edit(&invoice_row, |mut u| {
                u.status = InvoiceRowStatus::Verified;
                u
            })
        );

        assert_eq!(
            invoice_line_row,
            inline_edit(&invoice_line_row, |mut u| {
                u.number_of_packs = 2.0;
                u
            })
        );
        assert_eq!(
            stock_line_row,
            inline_edit(&stock_line_row, |mut u| {
                u.available_number_of_packs = 2.0;
                u.total_number_of_packs = 2.0;
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
                pack_size: 1,
                number_of_packs: 2.0,
                item_id: mock_item_a().id,
                inventory_adjustment_reason_id: None, // Check *no* error when reasons not defined and not provided
                ..Default::default()
            },
        );
        assert!(res.is_ok());
    }
}

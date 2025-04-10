use repository::{
    Invoice, InvoiceRowRepository, InvoiceStatus, RepositoryError, StockLineRowRepository,
};

use crate::{
    activity_log::{activity_log_entry, log_type_from_invoice_status},
    invoice::get_invoice,
    service_provider::ServiceContext,
};

pub mod generate;
pub mod validate;
use generate::generate;
use validate::validate;

use self::generate::GenerateResult;

#[derive(Clone, Debug, PartialEq)]
pub enum UpdateSupplierReturnStatus {
    Picked,
    Shipped,
}

#[derive(Clone, Debug, Default, PartialEq)]
pub struct UpdateSupplierReturn {
    pub supplier_return_id: String,
    // pub other_party_id: String,
    pub comment: Option<String>,
    pub status: Option<UpdateSupplierReturnStatus>,
    pub colour: Option<String>,
    pub on_hold: Option<bool>,
    pub their_reference: Option<String>,
    pub transport_reference: Option<String>,
}

#[derive(PartialEq, Debug, Clone)]
pub enum UpdateSupplierReturnError {
    ReturnDoesNotExist,
    ReturnDoesNotBelongToCurrentStore,
    ReturnIsNotEditable,
    NotAnSupplierReturn,
    CannotChangeStatusOfInvoiceOnHold,
    CannotReverseInvoiceStatus,
    InvoiceLineHasNoStockLine(String), // holds the id of the invalid invoice line
    UpdatedReturnDoesNotExist,
    DatabaseError(RepositoryError),
}

pub fn update_supplier_return(
    ctx: &ServiceContext,
    input: UpdateSupplierReturn,
) -> Result<Invoice, UpdateSupplierReturnError> {
    let supplier_return = ctx
        .connection
        .transaction_sync(|connection| {
            let (return_row, status_changed) = validate(connection, &ctx.store_id, &input)?;
            let GenerateResult {
                updated_return,
                stock_lines_to_update,
            } = generate(connection, input.clone(), return_row)?;

            InvoiceRowRepository::new(connection).upsert_one(&updated_return)?;

            if let Some(stock_lines) = stock_lines_to_update {
                let repository = StockLineRowRepository::new(connection);
                for stock_line in stock_lines {
                    repository.upsert_one(&stock_line)?;
                }
            }

            if status_changed {
                activity_log_entry(
                    ctx,
                    log_type_from_invoice_status(&updated_return.status, false),
                    Some(updated_return.id.to_owned()),
                    None,
                    None,
                )?;
            }

            get_invoice(ctx, None, &input.supplier_return_id)
                .map_err(UpdateSupplierReturnError::DatabaseError)?
                .ok_or(UpdateSupplierReturnError::UpdatedReturnDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    ctx.processors_trigger.trigger_invoice_transfer_processors();

    Ok(supplier_return)
}

impl From<RepositoryError> for UpdateSupplierReturnError {
    fn from(error: RepositoryError) -> Self {
        UpdateSupplierReturnError::DatabaseError(error)
    }
}

impl UpdateSupplierReturnStatus {
    pub fn as_invoice_row_status(&self) -> InvoiceStatus {
        match self {
            UpdateSupplierReturnStatus::Picked => InvoiceStatus::Picked,
            UpdateSupplierReturnStatus::Shipped => InvoiceStatus::Shipped,
        }
    }

    pub fn full_status_option(
        status: &Option<UpdateSupplierReturnStatus>,
    ) -> Option<InvoiceStatus> {
        status.as_ref().map(|status| status.as_invoice_row_status())
    }
}

impl UpdateSupplierReturn {
    pub fn full_status(&self) -> Option<InvoiceStatus> {
        self.status
            .as_ref()
            .map(|status| status.as_invoice_row_status())
    }
}
#[cfg(test)]
mod test {
    use crate::{
        invoice::{
            supplier_return::update::{
                UpdateSupplierReturn, UpdateSupplierReturnError as ServiceError,
            },
            UpdateSupplierReturnStatus,
        },
        service_provider::ServiceProvider,
    };
    use repository::{
        mock::{
            currency_a, mock_item_a, mock_name_store_b, mock_outbound_shipment_a, mock_store_a,
            mock_store_b, mock_supplier_return_a, mock_supplier_return_a_invoice_line_a,
            mock_supplier_return_b, mock_supplier_return_b_invoice_line_a, mock_user_account_a,
            MockData, MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        InvoiceLineRow, InvoiceLineType, InvoiceRow, InvoiceStatus, InvoiceType,
        StockLineRowRepository,
    };

    #[actix_rt::test]
    async fn test_update_supplier_return_errors() {
        fn base_test_return() -> InvoiceRow {
            InvoiceRow {
                store_id: mock_store_b().id,
                name_link_id: mock_name_store_b().id,
                currency_id: Some(currency_a().id),
                r#type: InvoiceType::SupplierReturn,
                status: InvoiceStatus::New,
                ..Default::default()
            }
        }

        fn wrong_store() -> InvoiceRow {
            InvoiceRow {
                id: "wrong_store".to_string(),
                store_id: mock_store_a().id,
                ..base_test_return()
            }
        }

        fn shipped_return() -> InvoiceRow {
            InvoiceRow {
                id: "shipped_return".to_string(),
                status: InvoiceStatus::Shipped,
                ..base_test_return()
            }
        }

        fn new_return() -> InvoiceRow {
            InvoiceRow {
                id: "new_return".to_string(),
                ..base_test_return()
            }
        }

        fn new_return_line_no_stock_line() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "new_return_line_no_stock_line".to_string(),
                invoice_id: new_return().id,
                item_link_id: mock_item_a().id,
                r#type: InvoiceLineType::StockOut,
                ..Default::default()
            }
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "test_update_supplier_return_errors",
            MockDataInserts::all(),
            MockData {
                invoices: vec![wrong_store(), shipped_return(), new_return()],
                invoice_lines: vec![new_return_line_no_stock_line()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_b().id, mock_user_account_a().id)
            .unwrap();

        // ReturnDoesNotExist
        assert_eq!(
            service_provider.invoice_service.update_supplier_return(
                &context,
                UpdateSupplierReturn {
                    supplier_return_id: "non-existent-id".to_string(),
                    ..Default::default()
                }
            ),
            Err(ServiceError::ReturnDoesNotExist)
        );

        // NotAnSupplierReturn
        assert_eq!(
            service_provider.invoice_service.update_supplier_return(
                &context,
                UpdateSupplierReturn {
                    supplier_return_id: mock_outbound_shipment_a().id,
                    ..Default::default()
                }
            ),
            Err(ServiceError::NotAnSupplierReturn)
        );

        // ReturnDoesNotBelongToCurrentStore
        assert_eq!(
            service_provider.invoice_service.update_supplier_return(
                &context,
                UpdateSupplierReturn {
                    supplier_return_id: wrong_store().id,
                    ..Default::default()
                }
            ),
            Err(ServiceError::ReturnDoesNotBelongToCurrentStore)
        );

        // ReturnIsNotEditable
        assert_eq!(
            service_provider.invoice_service.update_supplier_return(
                &context,
                UpdateSupplierReturn {
                    supplier_return_id: shipped_return().id,
                    ..Default::default()
                }
            ),
            Err(ServiceError::ReturnIsNotEditable)
        );

        // InvoiceLineHasNoStockLine
        assert_eq!(
            service_provider.invoice_service.update_supplier_return(
                &context,
                UpdateSupplierReturn {
                    supplier_return_id: new_return().id,
                    status: Some(UpdateSupplierReturnStatus::Shipped),
                    ..Default::default()
                }
            ),
            Err(ServiceError::InvoiceLineHasNoStockLine(
                new_return_line_no_stock_line().id
            ))
        );
    }

    #[actix_rt::test]
    async fn test_update_supplier_return_success_new_to_shipped() {
        let (_, connection, connection_manager, _) = setup_all(
            "test_update_supplier_return_success_new_to_shipped",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_b().id, mock_user_account_a().id)
            .unwrap();

        let stock_line_row_repo = StockLineRowRepository::new(&connection);
        let stock_line_id = mock_supplier_return_b_invoice_line_a()
            .stock_line_id
            .unwrap();

        let original_stock_line = stock_line_row_repo
            .find_one_by_id(&stock_line_id)
            .unwrap()
            .unwrap();

        let result = service_provider
            .invoice_service
            .update_supplier_return(
                &context,
                UpdateSupplierReturn {
                    supplier_return_id: mock_supplier_return_b().id, // is NEW status
                    status: Some(UpdateSupplierReturnStatus::Shipped),
                    ..Default::default()
                },
            )
            .unwrap();

        assert_eq!(result.invoice_row.status, InvoiceStatus::Shipped);
        assert!(result.invoice_row.picked_datetime.is_some());
        assert!(result.invoice_row.shipped_datetime.is_some());

        let updated_stock_line = stock_line_row_repo
            .find_one_by_id(&stock_line_id)
            .unwrap()
            .unwrap();

        assert_eq!(
            updated_stock_line.total_number_of_packs,
            original_stock_line.total_number_of_packs - 5.0 // stock has been reduced by the num of packs in the supplier return line
        );
    }

    #[actix_rt::test]
    async fn test_update_supplier_return_success_picked_to_shipped() {
        let (_, connection, connection_manager, _) = setup_all(
            "test_update_supplier_return_success_picked_to_shipped",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();

        let stock_line_row_repo = StockLineRowRepository::new(&connection);
        let stock_line_id = mock_supplier_return_a_invoice_line_a()
            .stock_line_id
            .unwrap();

        let original_stock_line = stock_line_row_repo
            .find_one_by_id(&stock_line_id)
            .unwrap()
            .unwrap();

        let result = service_provider
            .invoice_service
            .update_supplier_return(
                &context,
                UpdateSupplierReturn {
                    supplier_return_id: mock_supplier_return_a().id, // is PICKED status
                    status: Some(UpdateSupplierReturnStatus::Shipped),
                    ..Default::default()
                },
            )
            .unwrap();

        assert_eq!(result.invoice_row.status, InvoiceStatus::Shipped);
        assert!(result.invoice_row.shipped_datetime.is_some());

        let updated_stock_line = stock_line_row_repo
            .find_one_by_id(&stock_line_id)
            .unwrap()
            .unwrap();

        assert_eq!(
            updated_stock_line.total_number_of_packs,
            original_stock_line.total_number_of_packs // total has not changed (no stock movements after PICKED status)
        );
    }
}

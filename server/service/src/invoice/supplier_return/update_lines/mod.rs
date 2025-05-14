use repository::{Invoice, RepositoryError};

use crate::{
    invoice::get_invoice,
    invoice_line::{
        stock_out_line::{
            delete_stock_out_line, insert_stock_out_line, update_stock_out_line,
            DeleteStockOutLineError, InsertStockOutLineError, UpdateStockOutLineError,
        },
        update_return_reason_id::{update_return_reason_id, UpdateLineReturnReasonError},
    },
    service_provider::ServiceContext,
};

pub mod generate;
pub mod validate;
use generate::generate;
use validate::validate;

use self::generate::GenerateResult;

use super::SupplierReturnLineInput;

#[derive(Clone, Debug, Default, PartialEq)]
pub struct UpdateSupplierReturnLines {
    pub supplier_return_id: String,
    pub supplier_return_lines: Vec<SupplierReturnLineInput>,
}

#[derive(PartialEq, Debug)]
pub enum UpdateSupplierReturnLinesError {
    ReturnDoesNotExist,
    ReturnDoesNotBelongToCurrentStore,
    ReturnIsNotEditable,
    NotAnSupplierReturn,
    UpdatedReturnDoesNotExist,
    // Line Errors
    LineInsertError {
        line_id: String,
        error: InsertStockOutLineError,
    },
    LineUpdateError {
        line_id: String,
        error: UpdateStockOutLineError,
    },
    LineDeleteError {
        line_id: String,
        error: DeleteStockOutLineError,
    },
    LineReturnReasonUpdateError {
        line_id: String,
        error: UpdateLineReturnReasonError,
    },
    DatabaseError(RepositoryError),
}

pub fn update_supplier_return_lines(
    ctx: &ServiceContext,
    input: UpdateSupplierReturnLines,
) -> Result<Invoice, UpdateSupplierReturnLinesError> {
    let supplier_return = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &ctx.store_id, &input.supplier_return_id)?;
            let GenerateResult {
                lines_to_add,
                lines_to_update,
                lines_to_delete,
                update_line_return_reasons,
            } = generate(connection, input.clone())?;

            for line in lines_to_add {
                insert_stock_out_line(ctx, line.clone()).map_err(|error| {
                    UpdateSupplierReturnLinesError::LineInsertError {
                        line_id: line.id,
                        error,
                    }
                })?;
            }

            for line in lines_to_update {
                update_stock_out_line(ctx, line.clone()).map_err(|error| {
                    UpdateSupplierReturnLinesError::LineUpdateError {
                        line_id: line.id,
                        error,
                    }
                })?;
            }

            for line in lines_to_delete {
                delete_stock_out_line(ctx, line.clone()).map_err(|error| {
                    UpdateSupplierReturnLinesError::LineDeleteError {
                        line_id: line.id,
                        error,
                    }
                })?;
            }

            for line in update_line_return_reasons {
                update_return_reason_id(ctx, line.clone()).map_err(|error| {
                    UpdateSupplierReturnLinesError::LineReturnReasonUpdateError {
                        line_id: line.line_id,
                        error,
                    }
                })?;
            }

            get_invoice(ctx, None, &input.supplier_return_id)
                .map_err(UpdateSupplierReturnLinesError::DatabaseError)?
                .ok_or(UpdateSupplierReturnLinesError::UpdatedReturnDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    ctx.processors_trigger.trigger_invoice_transfer_processors();

    Ok(supplier_return)
}

impl From<RepositoryError> for UpdateSupplierReturnLinesError {
    fn from(error: RepositoryError) -> Self {
        UpdateSupplierReturnLinesError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use crate::{
        invoice::supplier_return::{
            update_lines::{
                UpdateSupplierReturnLines, UpdateSupplierReturnLinesError as ServiceError,
            },
            SupplierReturnLineInput,
        },
        invoice_line::{
            stock_out_line::{InsertStockOutLineError, UpdateStockOutLineError},
            update_return_reason_id::UpdateLineReturnReasonError,
        },
        service_provider::ServiceProvider,
    };
    use repository::{
        mock::{
            mock_item_a, mock_name_store_a, mock_outbound_shipment_e, mock_stock_line_a,
            mock_store_a, mock_store_b, mock_supplier_return_a,
            mock_supplier_return_a_invoice_line_a, mock_supplier_return_a_invoice_line_b,
            mock_user_account_a, MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        InvoiceLineRow, InvoiceLineRowRepository, InvoiceRow, InvoiceStatus, InvoiceType,
        ReasonOptionRow, ReasonOptionType,
    };

    #[actix_rt::test]
    async fn test_update_supplier_return_lines_errors() {
        fn base_test_return() -> InvoiceRow {
            InvoiceRow {
                store_id: mock_store_a().id,
                name_link_id: mock_name_store_a().id,
                r#type: InvoiceType::SupplierReturn,
                status: InvoiceStatus::New,
                ..Default::default()
            }
        }
        fn wrong_store() -> InvoiceRow {
            InvoiceRow {
                id: "wrong_store".to_string(),
                store_id: mock_store_b().id,
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
        fn wrong_store_return_line() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "wrong_store_return_line".to_string(),
                invoice_id: wrong_store().id,
                item_link_id: mock_item_a().id,
                ..Default::default()
            }
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "test_update_supplier_return_lines_errors",
            MockDataInserts::all(),
            MockData {
                invoices: vec![wrong_store(), shipped_return()],
                invoice_lines: vec![wrong_store_return_line()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();

        // ReturnDoesNotExist
        assert_eq!(
            service_provider
                .invoice_service
                .update_supplier_return_lines(
                    &context,
                    UpdateSupplierReturnLines {
                        supplier_return_id: "non-existent-id".to_string(),
                        ..Default::default()
                    }
                ),
            Err(ServiceError::ReturnDoesNotExist)
        );

        // NotAnSupplierReturn
        assert_eq!(
            service_provider
                .invoice_service
                .update_supplier_return_lines(
                    &context,
                    UpdateSupplierReturnLines {
                        supplier_return_id: mock_outbound_shipment_e().id,
                        ..Default::default()
                    }
                ),
            Err(ServiceError::NotAnSupplierReturn)
        );

        // ReturnDoesNotBelongToCurrentStore
        assert_eq!(
            service_provider
                .invoice_service
                .update_supplier_return_lines(
                    &context,
                    UpdateSupplierReturnLines {
                        supplier_return_id: wrong_store().id,
                        ..Default::default()
                    }
                ),
            Err(ServiceError::ReturnDoesNotBelongToCurrentStore)
        );

        // ReturnIsNotEditable
        assert_eq!(
            service_provider
                .invoice_service
                .update_supplier_return_lines(
                    &context,
                    UpdateSupplierReturnLines {
                        supplier_return_id: shipped_return().id,
                        ..Default::default()
                    }
                ),
            Err(ServiceError::ReturnIsNotEditable)
        );

        // LineInsertError
        assert_eq!(
            service_provider
                .invoice_service
                .update_supplier_return_lines(
                    &context,
                    UpdateSupplierReturnLines {
                        supplier_return_id: mock_supplier_return_a().id,
                        supplier_return_lines: vec![SupplierReturnLineInput {
                            id: "new_line".to_string(),
                            stock_line_id: "does_not_exist".to_string(),
                            number_of_packs: 1.0,
                            ..Default::default()
                        }],
                    }
                ),
            Err(ServiceError::LineInsertError {
                line_id: "new_line".to_string(),
                error: InsertStockOutLineError::StockLineNotFound,
            }),
        );

        // LineUpdateError
        assert_eq!(
            service_provider
                .invoice_service
                .update_supplier_return_lines(
                    &context,
                    UpdateSupplierReturnLines {
                        supplier_return_id: mock_supplier_return_a().id,
                        supplier_return_lines: vec![SupplierReturnLineInput {
                            id: mock_supplier_return_a_invoice_line_a().id,
                            stock_line_id: "does_not_exist".to_string(),
                            number_of_packs: 1.0,
                            ..Default::default()
                        }],
                    }
                ),
            Err(ServiceError::LineUpdateError {
                line_id: mock_supplier_return_a_invoice_line_a().id,
                error: UpdateStockOutLineError::StockLineNotFound,
            }),
        );

        // LineReturnReasonUpdateError
        assert_eq!(
            service_provider
                .invoice_service
                .update_supplier_return_lines(
                    &context,
                    UpdateSupplierReturnLines {
                        supplier_return_id: mock_supplier_return_a().id,
                        supplier_return_lines: vec![SupplierReturnLineInput {
                            id: "new_line_id".to_string(),
                            number_of_packs: 1.0,
                            stock_line_id: "item_b_line_a".to_string(),
                            reason_id: Some("does_not_exist".to_string()),
                            ..Default::default()
                        }],
                    },
                ),
            Err(ServiceError::LineReturnReasonUpdateError {
                line_id: "new_line_id".to_string(),
                error: UpdateLineReturnReasonError::ReasonDoesNotExist,
            }),
        );
    }

    #[actix_rt::test]
    async fn test_update_supplier_return_lines_success() {
        fn return_reason() -> ReasonOptionRow {
            ReasonOptionRow {
                id: "return_reason".to_string(),
                is_active: true,
                r#type: ReasonOptionType::ReturnReason,
                ..Default::default()
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "test_update_supplier_return_lines_success",
            MockDataInserts::all(),
            MockData {
                reason_options: vec![return_reason()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();

        service_provider
            .invoice_service
            .update_supplier_return_lines(
                &context,
                UpdateSupplierReturnLines {
                    supplier_return_id: mock_supplier_return_a().id,
                    supplier_return_lines: vec![
                        SupplierReturnLineInput {
                            id: "line1".to_string(), // create
                            number_of_packs: 1.0,
                            stock_line_id: "item_b_line_a".to_string(),
                            reason_id: Some(return_reason().id),
                            ..Default::default()
                        },
                        SupplierReturnLineInput {
                            id: mock_supplier_return_a_invoice_line_a().id, // update
                            number_of_packs: 2.0,
                            stock_line_id: mock_stock_line_a().id,
                            reason_id: Some(return_reason().id),
                            ..Default::default()
                        },
                        SupplierReturnLineInput {
                            id: mock_supplier_return_a_invoice_line_b().id,
                            number_of_packs: 0.0, // delete
                            ..Default::default()
                        },
                    ],
                },
            )
            .unwrap();

        let updated_lines = InvoiceLineRowRepository::new(&connection)
            .find_many_by_invoice_id(&mock_supplier_return_a().id)
            .unwrap();

        assert_eq!(updated_lines.len(), 2);

        // new line was added
        assert!(updated_lines.iter().any(|line| line.id == "line1"));

        // existing line was updated with new num of packs
        assert_eq!(
            updated_lines
                .iter()
                .find(|line| line.id == mock_supplier_return_a_invoice_line_a().id)
                .unwrap()
                .number_of_packs,
            2.0
        );

        // zeroed line was deleted
        assert!(!updated_lines
            .iter()
            .any(|line| line.id == mock_supplier_return_a_invoice_line_b().id));
    }
}

use repository::{Invoice, RepositoryError};

use crate::{
    invoice::get_invoice,
    invoice_line::{
        stock_in_line::{
            delete_stock_in_line, insert_stock_in_line, update_stock_in_line,
            DeleteStockInLineError, InsertStockInLineError, UpdateStockInLineError,
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

use super::CustomerReturnLineInput;

#[derive(Clone, Debug, Default, PartialEq)]
pub struct UpdateCustomerReturnLines {
    pub customer_return_id: String,
    pub customer_return_lines: Vec<CustomerReturnLineInput>,
}

#[derive(PartialEq, Debug)]
pub enum UpdateCustomerReturnLinesError {
    ReturnDoesNotExist,
    ReturnDoesNotBelongToCurrentStore,
    ReturnIsNotEditable,
    NotACustomerReturn,
    UpdatedReturnDoesNotExist,
    // Line Errors
    LineInsertError {
        line_id: String,
        error: InsertStockInLineError,
    },
    LineUpdateError {
        line_id: String,
        error: UpdateStockInLineError,
    },
    LineDeleteError {
        line_id: String,
        error: DeleteStockInLineError,
    },
    LineReturnReasonUpdateError {
        line_id: String,
        error: UpdateLineReturnReasonError,
    },
    DatabaseError(RepositoryError),
}

pub fn update_customer_return_lines(
    ctx: &ServiceContext,
    input: UpdateCustomerReturnLines,
) -> Result<Invoice, UpdateCustomerReturnLinesError> {
    let customer_return = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &ctx.store_id, &input.customer_return_id)?;
            let GenerateResult {
                lines_to_add,
                lines_to_update,
                lines_to_delete,
                update_line_return_reasons,
            } = generate(connection, input.clone())?;

            for line in lines_to_add {
                insert_stock_in_line(ctx, line.clone()).map_err(|error| {
                    UpdateCustomerReturnLinesError::LineInsertError {
                        line_id: line.id,
                        error,
                    }
                })?;
            }

            for line in lines_to_update {
                update_stock_in_line(ctx, line.clone()).map_err(|error| {
                    UpdateCustomerReturnLinesError::LineUpdateError {
                        line_id: line.id,
                        error,
                    }
                })?;
            }

            for line in lines_to_delete {
                delete_stock_in_line(ctx, line.clone()).map_err(|error| {
                    UpdateCustomerReturnLinesError::LineDeleteError {
                        line_id: line.id,
                        error,
                    }
                })?;
            }

            for line in update_line_return_reasons {
                update_return_reason_id(ctx, line.clone()).map_err(|error| {
                    UpdateCustomerReturnLinesError::LineReturnReasonUpdateError {
                        line_id: line.line_id,
                        error,
                    }
                })?;
            }

            get_invoice(ctx, None, &input.customer_return_id)
                .map_err(UpdateCustomerReturnLinesError::DatabaseError)?
                .ok_or(UpdateCustomerReturnLinesError::UpdatedReturnDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(customer_return)
}

impl From<RepositoryError> for UpdateCustomerReturnLinesError {
    fn from(error: RepositoryError) -> Self {
        UpdateCustomerReturnLinesError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use crate::{
        invoice::customer_return::{
            update_lines::{
                UpdateCustomerReturnLines, UpdateCustomerReturnLinesError as ServiceError,
            },
            CustomerReturnLineInput,
        },
        invoice_line::{
            stock_in_line::{InsertStockInLineError, UpdateStockInLineError},
            update_return_reason_id::UpdateLineReturnReasonError,
        },
        service_provider::ServiceProvider,
    };
    use repository::{
        mock::{
            currency_a, mock_customer_return_a, mock_customer_return_a_invoice_line_a, mock_item_a,
            mock_name_store_b, mock_outbound_shipment_a, mock_store_a, mock_store_b,
            mock_user_account_a, MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        InvoiceLineRow, InvoiceLineRowRepository, InvoiceRow, InvoiceStatus, InvoiceType,
        ReturnReasonRow,
    };

    #[actix_rt::test]
    async fn test_update_customer_return_lines_errors() {
        fn base_test_return() -> InvoiceRow {
            InvoiceRow {
                store_id: mock_store_b().id,
                name_link_id: mock_name_store_b().id,
                currency_id: Some(currency_a().id),
                r#type: InvoiceType::CustomerReturn,
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

        fn verified_return() -> InvoiceRow {
            InvoiceRow {
                id: "verified_return".to_string(),
                status: InvoiceStatus::Verified,
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
            "test_update_customer_return_lines_errors",
            MockDataInserts::all(),
            MockData {
                invoices: vec![wrong_store(), verified_return()],
                invoice_lines: vec![wrong_store_return_line()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_b().id, mock_user_account_a().id)
            .unwrap();

        // ReturnDoesNotExist
        assert_eq!(
            service_provider
                .invoice_service
                .update_customer_return_lines(
                    &context,
                    UpdateCustomerReturnLines {
                        customer_return_id: "non-existent-id".to_string(),
                        ..Default::default()
                    }
                ),
            Err(ServiceError::ReturnDoesNotExist)
        );

        // NotACustomerReturn
        assert_eq!(
            service_provider
                .invoice_service
                .update_customer_return_lines(
                    &context,
                    UpdateCustomerReturnLines {
                        customer_return_id: mock_outbound_shipment_a().id,
                        ..Default::default()
                    }
                ),
            Err(ServiceError::NotACustomerReturn)
        );

        // ReturnDoesNotBelongToCurrentStore
        assert_eq!(
            service_provider
                .invoice_service
                .update_customer_return_lines(
                    &context,
                    UpdateCustomerReturnLines {
                        customer_return_id: wrong_store().id,
                        ..Default::default()
                    }
                ),
            Err(ServiceError::ReturnDoesNotBelongToCurrentStore)
        );

        // ReturnIsNotEditable
        assert_eq!(
            service_provider
                .invoice_service
                .update_customer_return_lines(
                    &context,
                    UpdateCustomerReturnLines {
                        customer_return_id: verified_return().id,
                        ..Default::default()
                    }
                ),
            Err(ServiceError::ReturnIsNotEditable)
        );

        // LineInsertError
        assert_eq!(
            service_provider
                .invoice_service
                .update_customer_return_lines(
                    &context,
                    UpdateCustomerReturnLines {
                        customer_return_id: mock_customer_return_a().id,
                        customer_return_lines: vec![CustomerReturnLineInput {
                            id: "new_line".to_string(),
                            pack_size: 0.0,
                            number_of_packs: 1.0,
                            ..Default::default()
                        }],
                    }
                ),
            Err(ServiceError::LineInsertError {
                line_id: "new_line".to_string(),
                error: InsertStockInLineError::PackSizeBelowOne,
            }),
        );

        // LineUpdateError
        assert_eq!(
            service_provider
                .invoice_service
                .update_customer_return_lines(
                    &context,
                    UpdateCustomerReturnLines {
                        customer_return_id: mock_customer_return_a().id,
                        customer_return_lines: vec![CustomerReturnLineInput {
                            id: mock_customer_return_a_invoice_line_a().id,
                            pack_size: 0.0,
                            number_of_packs: 1.0,
                            ..Default::default()
                        }],
                    }
                ),
            Err(ServiceError::LineUpdateError {
                line_id: mock_customer_return_a_invoice_line_a().id,
                error: UpdateStockInLineError::PackSizeBelowOne,
            }),
        );

        // LineReturnReasonUpdateError
        assert_eq!(
            service_provider
                .invoice_service
                .update_customer_return_lines(
                    &context,
                    UpdateCustomerReturnLines {
                        customer_return_id: mock_customer_return_a().id,
                        customer_return_lines: vec![CustomerReturnLineInput {
                            id: "new_line_id".to_string(),
                            number_of_packs: 1.0,
                            pack_size: 1.0,
                            item_id: mock_item_a().id,
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
    async fn test_update_customer_return_lines_success() {
        fn return_reason() -> ReturnReasonRow {
            ReturnReasonRow {
                id: "return_reason".to_string(),
                is_active: true,
                ..Default::default()
            }
        }
        fn line_to_delete() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "line_to_delete".to_string(),
                invoice_id: mock_customer_return_a().id,
                item_link_id: mock_item_a().id,
                number_of_packs: 5.0,
                ..Default::default()
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "test_update_customer_return_lines_success",
            MockDataInserts::all(),
            MockData {
                return_reasons: vec![return_reason()],
                invoice_lines: vec![line_to_delete()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_b().id, mock_user_account_a().id)
            .unwrap();

        service_provider
            .invoice_service
            .update_customer_return_lines(
                &context,
                UpdateCustomerReturnLines {
                    customer_return_id: mock_customer_return_a().id,
                    customer_return_lines: vec![
                        CustomerReturnLineInput {
                            id: "line1".to_string(), // create
                            number_of_packs: 1.0,
                            pack_size: 1.0,
                            item_id: mock_item_a().id,
                            reason_id: Some(return_reason().id),
                            ..Default::default()
                        },
                        CustomerReturnLineInput {
                            id: mock_customer_return_a_invoice_line_a().id, // update
                            number_of_packs: 2.0,
                            pack_size: 1.0,
                            item_id: mock_item_a().id,
                            reason_id: Some(return_reason().id),
                            ..Default::default()
                        },
                        CustomerReturnLineInput {
                            id: line_to_delete().id,
                            number_of_packs: 0.0, // delete
                            ..Default::default()
                        },
                    ],
                },
            )
            .unwrap();

        let updated_lines = InvoiceLineRowRepository::new(&connection)
            .find_many_by_invoice_id(&mock_customer_return_a().id)
            .unwrap();

        assert_eq!(updated_lines.len(), 3);

        // new line was added
        assert!(updated_lines.iter().any(|line| line.id == "line1"));

        // existing line was updated
        let updated_line = updated_lines
            .iter()
            .find(|line| line.id == mock_customer_return_a_invoice_line_a().id)
            .unwrap();
        assert_eq!(updated_line.number_of_packs, 2.0);
        assert_eq!(updated_line.return_reason_id, Some(return_reason().id));

        // zeroed line was deleted
        assert!(!updated_lines
            .iter()
            .any(|line| line.id == line_to_delete().id));
    }
}

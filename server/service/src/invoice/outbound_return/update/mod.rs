use repository::{Invoice, InvoiceRowRepository, RepositoryError};

use crate::{
    activity_log::{activity_log_entry, log_type_from_invoice_status},
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

use super::OutboundReturnLineInput;

#[derive(Clone, Debug, PartialEq)]
pub enum UpdateOutboundReturnStatus {
    Allocated,
    Picked,
    Shipped,
}

#[derive(Clone, Debug, Default, PartialEq)]
pub struct UpdateOutboundReturn {
    pub id: String,
    // pub other_party_id: String,
    pub status: Option<UpdateOutboundReturnStatus>,
    pub outbound_return_lines: Vec<OutboundReturnLineInput>,
}

#[derive(PartialEq, Debug)]
pub enum UpdateOutboundReturnError {
    ReturnDoesNotExist,
    ReturnDoesNotBelongToCurrentStore,
    ReturnIsNotEditable,
    NotAnOutboundReturn,
    // InvoiceLineHasNoStockLine,
    // CannotReverseInvoiceStatus,
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

pub fn update_outbound_return(
    ctx: &ServiceContext,
    input: UpdateOutboundReturn,
) -> Result<Invoice, UpdateOutboundReturnError> {
    let outbound_return = ctx
        .connection
        .transaction_sync(|connection| {
            let (return_row, status_changed) = validate(connection, &ctx.store_id, &input.id)?;
            let GenerateResult {
                updated_return,
                lines_to_add,
                lines_to_update,
                lines_to_delete,
                update_line_return_reasons,
            } = generate(connection, input.clone(), return_row)?;

            InvoiceRowRepository::new(connection).upsert_one(&updated_return)?;

            for line in lines_to_add {
                insert_stock_out_line(ctx, line.clone()).map_err(|error| {
                    UpdateOutboundReturnError::LineInsertError {
                        line_id: line.id,
                        error,
                    }
                })?;
            }

            for line in lines_to_update {
                update_stock_out_line(ctx, line.clone()).map_err(|error| {
                    UpdateOutboundReturnError::LineUpdateError {
                        line_id: line.id,
                        error,
                    }
                })?;
            }

            for line in lines_to_delete {
                delete_stock_out_line(ctx, line.clone()).map_err(|error| {
                    UpdateOutboundReturnError::LineDeleteError {
                        line_id: line.id,
                        error,
                    }
                })?;
            }

            for line in update_line_return_reasons {
                update_return_reason_id(ctx, line.clone()).map_err(|error| {
                    UpdateOutboundReturnError::LineReturnReasonUpdateError {
                        line_id: line.line_id,
                        error,
                    }
                })?;
            }

            if status_changed {
                activity_log_entry(
                    &ctx,
                    log_type_from_invoice_status(&updated_return.status, false),
                    Some(updated_return.id.to_owned()),
                    None,
                    None,
                )?;
            }

            get_invoice(ctx, None, &input.id)
                .map_err(|error| UpdateOutboundReturnError::DatabaseError(error))?
                .ok_or(UpdateOutboundReturnError::UpdatedReturnDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(outbound_return)
}

impl From<RepositoryError> for UpdateOutboundReturnError {
    fn from(error: RepositoryError) -> Self {
        UpdateOutboundReturnError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use crate::{
        invoice::outbound_return::{
            update::{UpdateOutboundReturn, UpdateOutboundReturnError as ServiceError},
            OutboundReturnLineInput,
        },
        service_provider::ServiceProvider,
    };
    use repository::{
        mock::{
            mock_name_store_b, mock_outbound_return_a, mock_outbound_return_a_invoice_line_a,
            mock_outbound_return_a_invoice_line_b, mock_outbound_shipment_a, mock_stock_line_a,
            mock_store_a, mock_store_b, mock_user_account_a, MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        InvoiceLineRowRepository, InvoiceRow, InvoiceRowStatus, InvoiceRowType, ReturnReasonRow,
    };

    #[actix_rt::test]
    async fn test_update_outbound_return_errors() {
        fn base_test_return() -> InvoiceRow {
            InvoiceRow {
                store_id: mock_store_b().id,
                name_link_id: mock_name_store_b().id,
                r#type: InvoiceRowType::OutboundReturn,
                status: InvoiceRowStatus::New,
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
                status: InvoiceRowStatus::Shipped,
                ..base_test_return()
            }
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "test_update_outbound_return_errors",
            MockDataInserts::all(),
            MockData {
                invoices: vec![wrong_store(), shipped_return()],
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
            service_provider.invoice_service.update_outbound_return(
                &context,
                UpdateOutboundReturn {
                    id: "non-existent-id".to_string(),
                    ..Default::default()
                }
            ),
            Err(ServiceError::ReturnDoesNotExist)
        );

        // NotAnOutboundReturn
        assert_eq!(
            service_provider.invoice_service.update_outbound_return(
                &context,
                UpdateOutboundReturn {
                    id: mock_outbound_shipment_a().id,
                    ..Default::default()
                }
            ),
            Err(ServiceError::NotAnOutboundReturn)
        );

        // ReturnDoesNotBelongToCurrentStore
        assert_eq!(
            service_provider.invoice_service.update_outbound_return(
                &context,
                UpdateOutboundReturn {
                    id: wrong_store().id,
                    ..Default::default()
                }
            ),
            Err(ServiceError::ReturnDoesNotBelongToCurrentStore)
        );

        // ReturnIsNotEditable
        assert_eq!(
            service_provider.invoice_service.update_outbound_return(
                &context,
                UpdateOutboundReturn {
                    id: shipped_return().id,
                    ..Default::default()
                }
            ),
            Err(ServiceError::ReturnIsNotEditable)
        );

        // LineInsertError
    }

    #[actix_rt::test]
    async fn test_update_outbound_return_success() {
        fn return_reason() -> ReturnReasonRow {
            ReturnReasonRow {
                id: "return_reason".to_string(),
                is_active: true,
                ..Default::default()
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "test_update_outbound_return_success",
            MockDataInserts::all(),
            MockData {
                return_reasons: vec![return_reason()],
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
            .update_outbound_return(
                &context,
                UpdateOutboundReturn {
                    id: mock_outbound_return_a().id,
                    outbound_return_lines: vec![
                        OutboundReturnLineInput {
                            id: "line1".to_string(), // create
                            number_of_packs: 1.0,
                            stock_line_id: "item_b_line_a".to_string(),
                            reason_id: Some(return_reason().id),
                            ..Default::default()
                        },
                        OutboundReturnLineInput {
                            id: mock_outbound_return_a_invoice_line_a().id, // update
                            number_of_packs: 2.0,
                            stock_line_id: mock_stock_line_a().id,
                            reason_id: Some(return_reason().id),
                            ..Default::default()
                        },
                        OutboundReturnLineInput {
                            id: mock_outbound_return_a_invoice_line_b().id,
                            number_of_packs: 0.0, // delete
                            ..Default::default()
                        },
                    ],
                    ..Default::default()
                },
            )
            .unwrap();

        let updated_lines = InvoiceLineRowRepository::new(&connection)
            .find_many_by_invoice_id(&mock_outbound_return_a().id)
            .unwrap();

        assert_eq!(updated_lines.len(), 2);

        // new line was added
        assert!(updated_lines
            .iter()
            .find(|line| line.id == "line1")
            .is_some());

        // existing line was updated with new num of packs
        assert_eq!(
            updated_lines
                .iter()
                .find(|line| line.id == mock_outbound_return_a_invoice_line_a().id)
                .unwrap()
                .number_of_packs,
            2.0
        );

        // zeroed line was deleted
        assert!(updated_lines
            .iter()
            .find(|line| line.id == mock_outbound_return_a_invoice_line_b().id)
            .is_none());
    }
}

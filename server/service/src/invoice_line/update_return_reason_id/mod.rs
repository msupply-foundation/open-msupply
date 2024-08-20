mod validate;
use repository::{InvoiceLine, InvoiceLineRowRepository, RepositoryError, TransactionError};
use validate::validate;

use crate::service_provider::ServiceContext;

use super::get_invoice_line;

#[derive(Clone, Debug, PartialEq, Default)]
pub struct UpdateLineReturnReason {
    pub line_id: String,
    pub reason_id: Option<String>,
}

#[derive(Clone, Debug, PartialEq)]
pub enum UpdateLineReturnReasonError {
    LineDoesNotExist,
    ReasonDoesNotExist,
    ReasonIsNotActive,
    UpdatedLineDoesNotExist,
    DatabaseError(RepositoryError),
}

pub fn update_return_reason_id(
    ctx: &ServiceContext,
    input: UpdateLineReturnReason,
) -> Result<InvoiceLine, UpdateLineReturnReasonError> {
    let new_line = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &input)?;

            let invoice_line_repo = InvoiceLineRowRepository::new(connection);

            invoice_line_repo.update_return_reason_id(&input.line_id, input.reason_id.clone())?;

            get_invoice_line(ctx, &input.line_id)
                .map_err(UpdateLineReturnReasonError::DatabaseError)?
                .ok_or(UpdateLineReturnReasonError::UpdatedLineDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(new_line)
}

impl From<RepositoryError> for UpdateLineReturnReasonError {
    fn from(error: RepositoryError) -> Self {
        UpdateLineReturnReasonError::DatabaseError(error)
    }
}

impl From<TransactionError<UpdateLineReturnReasonError>> for UpdateLineReturnReasonError {
    fn from(error: TransactionError<UpdateLineReturnReasonError>) -> Self {
        match error {
            TransactionError::Transaction { msg, level } => {
                UpdateLineReturnReasonError::DatabaseError(RepositoryError::TransactionError {
                    msg,
                    level,
                })
            }
            TransactionError::Inner(e) => e,
        }
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{mock_store_b, mock_supplier_return_a_invoice_line_a, MockData, MockDataInserts},
        test_db::setup_all_with_data,
        ReturnReasonRow,
    };

    use crate::{
        invoice_line::{UpdateLineReturnReason, UpdateLineReturnReasonError},
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn update_return_reason_id_errors() {
        fn non_active_return_reason() -> ReturnReasonRow {
            ReturnReasonRow {
                id: "not_active".to_string(),
                is_active: false,
                ..Default::default()
            }
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "update_return_reason_id_errors",
            MockDataInserts::all(),
            MockData {
                return_reasons: vec![non_active_return_reason()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_b().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_line_service;

        // LineDoesNotExist
        assert_eq!(
            service
                .update_return_reason_id(
                    &context,
                    UpdateLineReturnReason {
                        line_id: "line_does_not_exist".to_string(),
                        reason_id: None
                    }
                )
                .unwrap_err(),
            UpdateLineReturnReasonError::LineDoesNotExist
        );

        // ReasonDoesNotExist
        assert_eq!(
            service
                .update_return_reason_id(
                    &context,
                    UpdateLineReturnReason {
                        line_id: mock_supplier_return_a_invoice_line_a().id,
                        reason_id: Some("reason_does_not_exist".to_string())
                    }
                )
                .unwrap_err(),
            UpdateLineReturnReasonError::ReasonDoesNotExist
        );

        // ReasonIsNotActive
        assert_eq!(
            service
                .update_return_reason_id(
                    &context,
                    UpdateLineReturnReason {
                        line_id: mock_supplier_return_a_invoice_line_a().id,
                        reason_id: Some(non_active_return_reason().id.clone())
                    }
                )
                .unwrap_err(),
            UpdateLineReturnReasonError::ReasonIsNotActive
        );
    }

    #[actix_rt::test]
    async fn update_return_reason_id_success() {
        fn return_reason() -> ReturnReasonRow {
            ReturnReasonRow {
                id: "reason_id".to_string(),
                is_active: true,
                ..Default::default()
            }
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "update_return_reason_id_success",
            MockDataInserts::all(),
            MockData {
                return_reasons: vec![return_reason()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_b().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_line_service;

        let updated_line = service
            .update_return_reason_id(
                &context,
                UpdateLineReturnReason {
                    line_id: mock_supplier_return_a_invoice_line_a().id,
                    reason_id: Some(return_reason().id),
                },
            )
            .unwrap();

        assert_eq!(
            updated_line.invoice_line_row.return_reason_id,
            Some(return_reason().id)
        );
    }
}

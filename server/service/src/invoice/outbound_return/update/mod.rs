use repository::{Invoice, InvoiceRowRepository, InvoiceRowStatus, RepositoryError};

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
pub enum UpdateOutboundReturnStatus {
    Picked,
    Shipped,
}

#[derive(Clone, Debug, Default, PartialEq)]
pub struct UpdateOutboundReturn {
    pub outbound_return_id: String,
    // pub other_party_id: String,
    pub comment: Option<String>,
    pub status: Option<UpdateOutboundReturnStatus>,
}

#[derive(PartialEq, Debug)]
pub enum UpdateOutboundReturnError {
    ReturnDoesNotExist,
    ReturnDoesNotBelongToCurrentStore,
    ReturnIsNotEditable,
    NotAnOutboundReturn,
    CannotChangeStatusOfInvoiceOnHold,
    CannotReverseInvoiceStatus,
    InvoiceLineHasNoStockLine(String), // holds the id of the invalid invoice line
    UpdatedReturnDoesNotExist,
    DatabaseError(RepositoryError),
}

pub fn update_outbound_return(
    ctx: &ServiceContext,
    input: UpdateOutboundReturn,
) -> Result<Invoice, UpdateOutboundReturnError> {
    let outbound_return = ctx
        .connection
        .transaction_sync(|connection| {
            let (return_row, status_changed) = validate(connection, &ctx.store_id, &input)?;
            let GenerateResult { updated_return } =
                generate(connection, input.clone(), return_row)?;

            InvoiceRowRepository::new(connection).upsert_one(&updated_return)?;

            if status_changed {
                activity_log_entry(
                    &ctx,
                    log_type_from_invoice_status(&updated_return.status, false),
                    Some(updated_return.id.to_owned()),
                    None,
                    None,
                )?;
            }

            get_invoice(ctx, None, &input.outbound_return_id)
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

impl UpdateOutboundReturnStatus {
    pub fn full_status(&self) -> InvoiceRowStatus {
        match self {
            UpdateOutboundReturnStatus::Picked => InvoiceRowStatus::New,
            UpdateOutboundReturnStatus::Shipped => InvoiceRowStatus::Shipped,
        }
    }

    pub fn full_status_option(
        status: &Option<UpdateOutboundReturnStatus>,
    ) -> Option<InvoiceRowStatus> {
        match status {
            Some(status) => Some(status.full_status()),
            None => None,
        }
    }
}

impl UpdateOutboundReturn {
    pub fn full_status(&self) -> Option<InvoiceRowStatus> {
        match &self.status {
            Some(status) => Some(status.full_status()),
            None => None,
        }
    }
}
#[cfg(test)]
mod test {
    use crate::{
        invoice::outbound_return::update::{
            UpdateOutboundReturn, UpdateOutboundReturnError as ServiceError,
        },
        service_provider::ServiceProvider,
    };
    use repository::{
        mock::{
            mock_name_store_b, mock_outbound_return_a, mock_outbound_shipment_a, mock_store_a,
            mock_store_b, mock_user_account_a, MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        InvoiceRow, InvoiceRowStatus, InvoiceRowType, ReturnReasonRow,
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
                    outbound_return_id: "non-existent-id".to_string(),
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
                    outbound_return_id: mock_outbound_shipment_a().id,
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
                    outbound_return_id: wrong_store().id,
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
                    outbound_return_id: shipped_return().id,
                    ..Default::default()
                }
            ),
            Err(ServiceError::ReturnIsNotEditable)
        );
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

        let (_, _, connection_manager, _) = setup_all_with_data(
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

        let result = service_provider
            .invoice_service
            .update_outbound_return(
                &context,
                UpdateOutboundReturn {
                    outbound_return_id: mock_outbound_return_a().id,
                    ..Default::default()
                },
            )
            .unwrap();
    }
}

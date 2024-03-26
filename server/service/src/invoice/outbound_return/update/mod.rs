use repository::{
    Invoice, InvoiceRowRepository, InvoiceRowStatus, RepositoryError, StockLineRowRepository,
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
    pub colour: Option<String>,
    pub on_hold: Option<bool>,
    pub their_reference: Option<String>,
    pub transport_reference: Option<String>,
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

    ctx.processors_trigger
        .trigger_shipment_transfer_processors();

    Ok(outbound_return)
}

impl From<RepositoryError> for UpdateOutboundReturnError {
    fn from(error: RepositoryError) -> Self {
        UpdateOutboundReturnError::DatabaseError(error)
    }
}

impl UpdateOutboundReturnStatus {
    pub fn as_invoice_row_status(&self) -> InvoiceRowStatus {
        match self {
            UpdateOutboundReturnStatus::Picked => InvoiceRowStatus::Picked,
            UpdateOutboundReturnStatus::Shipped => InvoiceRowStatus::Shipped,
        }
    }

    pub fn full_status_option(
        status: &Option<UpdateOutboundReturnStatus>,
    ) -> Option<InvoiceRowStatus> {
        match status {
            Some(status) => Some(status.as_invoice_row_status()),
            None => None,
        }
    }
}

impl UpdateOutboundReturn {
    pub fn full_status(&self) -> Option<InvoiceRowStatus> {
        match &self.status {
            Some(status) => Some(status.as_invoice_row_status()),
            None => None,
        }
    }
}
#[cfg(test)]
mod test {
    use crate::{
        invoice::{
            outbound_return::update::{
                UpdateOutboundReturn, UpdateOutboundReturnError as ServiceError,
            },
            UpdateOutboundReturnStatus,
        },
        service_provider::ServiceProvider,
    };
    use repository::{
        mock::{
            currency_a, mock_item_a, mock_name_store_b, mock_outbound_return_a,
            mock_outbound_return_a_invoice_line_a, mock_outbound_return_b,
            mock_outbound_return_b_invoice_line_a, mock_outbound_shipment_a, mock_store_a,
            mock_store_b, mock_user_account_a, MockData, MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        InvoiceLineRow, InvoiceLineRowType, InvoiceRow, InvoiceRowStatus, InvoiceRowType,
        StockLineRowRepository,
    };

    #[actix_rt::test]
    async fn test_update_outbound_return_errors() {
        fn base_test_return() -> InvoiceRow {
            InvoiceRow {
                store_id: mock_store_b().id,
                name_link_id: mock_name_store_b().id,
                currency_id: currency_a().id,
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
                r#type: InvoiceLineRowType::StockOut,
                ..Default::default()
            }
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "test_update_outbound_return_errors",
            MockDataInserts::all(),
            MockData {
                invoices: vec![wrong_store(), shipped_return(), new_return()],
                invoice_lines: vec![new_return_line_no_stock_line()],
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

        // InvoiceLineHasNoStockLine
        assert_eq!(
            service_provider.invoice_service.update_outbound_return(
                &context,
                UpdateOutboundReturn {
                    outbound_return_id: new_return().id,
                    status: Some(UpdateOutboundReturnStatus::Shipped),
                    ..Default::default()
                }
            ),
            Err(ServiceError::InvoiceLineHasNoStockLine(
                new_return_line_no_stock_line().id
            ))
        );
    }

    #[actix_rt::test]
    async fn test_update_outbound_return_success_new_to_shipped() {
        let (_, connection, connection_manager, _) = setup_all(
            "test_update_outbound_return_success_new_to_shipped",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_b().id, mock_user_account_a().id)
            .unwrap();

        let stock_line_row_repo = StockLineRowRepository::new(&connection);
        let stock_line_id = mock_outbound_return_b_invoice_line_a()
            .stock_line_id
            .unwrap();

        let original_stock_line = stock_line_row_repo.find_one_by_id(&stock_line_id).unwrap();

        let result = service_provider
            .invoice_service
            .update_outbound_return(
                &context,
                UpdateOutboundReturn {
                    outbound_return_id: mock_outbound_return_b().id, // is NEW status
                    status: Some(UpdateOutboundReturnStatus::Shipped),
                    ..Default::default()
                },
            )
            .unwrap();

        assert_eq!(result.invoice_row.status, InvoiceRowStatus::Shipped);
        assert!(result.invoice_row.picked_datetime.is_some());
        assert!(result.invoice_row.shipped_datetime.is_some());

        let updated_stock_line = stock_line_row_repo.find_one_by_id(&stock_line_id).unwrap();

        assert_eq!(
            updated_stock_line.total_number_of_packs,
            original_stock_line.total_number_of_packs - 5.0 // stock has been reduced by the num of packs in the outbound return line
        );
    }

    #[actix_rt::test]
    async fn test_update_outbound_return_success_picked_to_shipped() {
        let (_, connection, connection_manager, _) = setup_all(
            "test_update_outbound_return_success_picked_to_shipped",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();

        let stock_line_row_repo = StockLineRowRepository::new(&connection);
        let stock_line_id = mock_outbound_return_a_invoice_line_a()
            .stock_line_id
            .unwrap();

        let original_stock_line = stock_line_row_repo.find_one_by_id(&stock_line_id).unwrap();

        let result = service_provider
            .invoice_service
            .update_outbound_return(
                &context,
                UpdateOutboundReturn {
                    outbound_return_id: mock_outbound_return_a().id, // is PICKED status
                    status: Some(UpdateOutboundReturnStatus::Shipped),
                    ..Default::default()
                },
            )
            .unwrap();

        assert_eq!(result.invoice_row.status, InvoiceRowStatus::Shipped);
        assert!(result.invoice_row.shipped_datetime.is_some());

        let updated_stock_line = stock_line_row_repo.find_one_by_id(&stock_line_id).unwrap();

        assert_eq!(
            updated_stock_line.total_number_of_packs,
            original_stock_line.total_number_of_packs // total has not changed (no stock movements after PICKED status)
        );
    }
}

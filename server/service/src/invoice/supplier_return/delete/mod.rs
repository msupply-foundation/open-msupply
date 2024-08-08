use repository::{ActivityLogType, InvoiceRowRepository, RepositoryError, TransactionError};

pub mod validate;

use validate::validate;

use crate::{
    activity_log::activity_log_entry,
    invoice::common::get_lines_for_invoice,
    invoice_line::stock_out_line::{
        delete::{delete_stock_out_line, DeleteStockOutLine, DeleteStockOutLineError},
        StockOutType,
    },
    service_provider::ServiceContext,
};

pub fn delete_outbound_return(
    ctx: &ServiceContext,
    id: String,
) -> Result<String, DeleteOutboundReturnError> {
    let invoice_id = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&id, &ctx.store_id, connection)?;

            let lines = get_lines_for_invoice(connection, &id)?;
            for line in lines {
                delete_stock_out_line(
                    ctx,
                    DeleteStockOutLine {
                        id: line.invoice_line_row.id.clone(),
                        r#type: Some(StockOutType::OutboundReturn),
                    },
                )
                .map_err(|error| DeleteOutboundReturnError::LineDeleteError {
                    line_id: line.invoice_line_row.id,
                    error,
                })?;
            }

            InvoiceRowRepository::new(connection)
                .delete(&id)
                .map_err(DeleteOutboundReturnError::DatabaseError)?;

            activity_log_entry(
                ctx,
                ActivityLogType::InvoiceDeleted,
                Some(id.to_owned()),
                None,
                None,
            )?;

            Ok(id)
        })
        .map_err(|error: TransactionError<DeleteOutboundReturnError>| error.to_inner_error())?;

    ctx.processors_trigger.trigger_invoice_transfer_processors();

    Ok(invoice_id)
}

#[derive(Debug, PartialEq, Clone)]

pub enum DeleteOutboundReturnError {
    InvoiceDoesNotExist,
    DatabaseError(RepositoryError),
    NotThisStoreInvoice,
    CannotEditFinalised,
    LineDeleteError {
        line_id: String,
        error: DeleteStockOutLineError,
    },
    NotAnOutboundReturn,
}

impl From<RepositoryError> for DeleteOutboundReturnError {
    fn from(error: RepositoryError) -> Self {
        DeleteOutboundReturnError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            currency_a, mock_name_store_a, mock_name_store_b, mock_outbound_return_a,
            mock_outbound_return_a_invoice_line_a, mock_outbound_shipment_a, mock_store_a,
            mock_store_b, MockData, MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        InvoiceRow, InvoiceRowRepository, InvoiceStatus, InvoiceType, StockLineRowRepository,
    };

    use crate::{
        invoice::supplier_return::delete::DeleteOutboundReturnError as ServiceError,
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn delete_outbound_return_errors() {
        fn wrong_store() -> InvoiceRow {
            InvoiceRow {
                id: "wrong_store".to_string(),
                store_id: mock_store_a().id,
                r#type: InvoiceType::OutboundReturn,
                name_link_id: mock_name_store_a().id,
                currency_id: Some(currency_a().id),
                ..Default::default()
            }
        }
        fn verified() -> InvoiceRow {
            InvoiceRow {
                id: "verified".to_string(),
                store_id: mock_store_b().id,
                r#type: InvoiceType::OutboundReturn,
                name_link_id: mock_name_store_b().id,
                currency_id: Some(currency_a().id),
                status: InvoiceStatus::Verified,
                ..Default::default()
            }
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "delete_outbound_return_errors",
            MockDataInserts::all(),
            MockData {
                invoices: vec![wrong_store(), verified()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_b().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_service;

        // InvoiceDoesNotExist
        assert_eq!(
            service.delete_outbound_return(&context, "invalid".to_string()),
            Err(ServiceError::InvoiceDoesNotExist)
        );

        //NotAnOutboundReturn
        assert_eq!(
            service.delete_outbound_return(&context, mock_outbound_shipment_a().id),
            Err(ServiceError::NotAnOutboundReturn)
        );

        //NotThisStoreInvoice
        assert_eq!(
            service.delete_outbound_return(&context, wrong_store().id),
            Err(ServiceError::NotThisStoreInvoice)
        );

        //CannotEditFinalised
        assert_eq!(
            service.delete_outbound_return(&context, verified().id),
            Err(ServiceError::CannotEditFinalised)
        );
    }

    #[actix_rt::test]
    async fn delete_outbound_return_success() {
        let (_, connection, connection_manager, _) =
            setup_all("delete_outbound_return_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_service;

        let stock_line_row_repo = StockLineRowRepository::new(&connection);
        let stock_line_id = mock_outbound_return_a_invoice_line_a()
            .stock_line_id
            .unwrap();
        let original_stock_line = stock_line_row_repo
            .find_one_by_id(&stock_line_id)
            .unwrap()
            .unwrap();

        service
            .delete_outbound_return(&context, mock_outbound_return_a().id)
            .unwrap();

        // test entry has been deleted
        assert_eq!(
            InvoiceRowRepository::new(&connection)
                .find_one_by_id(&mock_outbound_return_a().id)
                .unwrap(),
            None
        );

        let updated_stock_line = stock_line_row_repo
            .find_one_by_id(&stock_line_id)
            .unwrap()
            .unwrap();

        // test stock has been increased by the num of packs in the outbound return line
        assert_eq!(
            updated_stock_line.total_number_of_packs,
            original_stock_line.total_number_of_packs
                + mock_outbound_return_a_invoice_line_a().number_of_packs
        );
    }
}

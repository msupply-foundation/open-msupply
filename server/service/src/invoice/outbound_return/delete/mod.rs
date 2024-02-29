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
    WithDBError,
};

type OutError = DeleteOutboundReturnError;

pub fn delete_outbound_return(
    ctx: &ServiceContext,
    id: String,
) -> Result<String, DeleteOutboundReturnError> {
    let invoice_id = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&id, &ctx.store_id, &connection)?;

            let lines = get_lines_for_invoice(connection, &id)?;
            for line in lines {
                delete_stock_out_line(
                    ctx,
                    DeleteStockOutLine {
                        id: line.invoice_line_row.id.clone(),
                        r#type: Some(StockOutType::OutboundReturn),
                    },
                )
                .map_err(|error| OutError::LineDeleteError {
                    line_id: line.invoice_line_row.id,
                    error,
                })?;
            }

            activity_log_entry(
                &ctx,
                ActivityLogType::InvoiceDeleted,
                Some(id.to_owned()),
                None,
                None,
            )?;

            match InvoiceRowRepository::new(&connection).delete(&id) {
                Ok(_) => Ok(id.clone()),
                Err(error) => Err(OutError::DatabaseError(error)),
            }
        })
        .map_err(|error| error.to_inner_error())?;

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

impl From<TransactionError<DeleteOutboundReturnError>> for DeleteOutboundReturnError {
    fn from(error: TransactionError<DeleteOutboundReturnError>) -> Self {
        match error {
            TransactionError::Transaction { msg, level } => {
                DeleteOutboundReturnError::DatabaseError(RepositoryError::TransactionError {
                    msg,
                    level,
                })
            }
            TransactionError::Inner(e) => e,
        }
    }
}

impl<ERR> From<WithDBError<ERR>> for DeleteOutboundReturnError
where
    ERR: Into<DeleteOutboundReturnError>,
{
    fn from(result: WithDBError<ERR>) -> Self {
        match result {
            WithDBError::DatabaseError(error) => error.into(),
            WithDBError::Error(error) => error.into(),
        }
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_inbound_shipment_a, mock_name_store_a, mock_name_store_b, mock_outbound_return_a,
            mock_store_a, mock_store_b, mock_store_c, MockData, MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        InvoiceRow, InvoiceRowRepository, InvoiceRowStatus, InvoiceRowType,
    };

    use crate::{
        invoice::outbound_return::delete::DeleteOutboundReturnError as ServiceError,
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn delete_outbound_return_errors() {
        fn wrong_store() -> InvoiceRow {
            InvoiceRow {
                id: "wrong_store".to_string(),
                store_id: mock_store_a().id,
                r#type: InvoiceRowType::OutboundReturn,
                name_link_id: mock_name_store_a().id,
                ..Default::default()
            }
        }
        fn verified() -> InvoiceRow {
            InvoiceRow {
                id: "verified".to_string(),
                store_id: mock_store_b().id,
                r#type: InvoiceRowType::OutboundReturn,
                name_link_id: mock_name_store_b().id,
                status: InvoiceRowStatus::Verified,
                ..Default::default()
            }
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "delete_outbound_return_errors",
            MockDataInserts::all(),
            MockData {
                invoices: vec![wrong_store()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let mut context = service_provider
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
            service.delete_outbound_return(&context, mock_inbound_shipment_a().id),
            Err(ServiceError::NotAnOutboundReturn)
        );

        //NotThisStoreInvoice
        assert_eq!(
            service.delete_outbound_return(&context, wrong_store().id),
            Err(ServiceError::NotThisStoreInvoice)
        );

        //CannotEditFinalised
        context.store_id = mock_store_c().id;
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
            .context(mock_store_b().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_service;

        service
            .delete_outbound_return(&context, mock_outbound_return_a().id)
            .unwrap();

        //test entry has been deleted
        assert_eq!(
            InvoiceRowRepository::new(&connection)
                .find_one_by_id_option(&mock_outbound_return_a().id)
                .unwrap(),
            None
        );
    }
}

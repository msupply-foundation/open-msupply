use repository::{ActivityLogType, InvoiceRowRepository, RepositoryError};

mod validate;

use validate::validate;

use crate::{
    activity_log::activity_log_entry,
    invoice::common::get_lines_for_invoice,
    invoice_line::inbound_shipment_line::{
        delete_inbound_shipment_line, DeleteInboundShipmentLine, DeleteInboundShipmentLineError,
    },
    service_provider::ServiceContext,
    WithDBError,
};

#[derive(Clone, Debug, Default, PartialEq)]
pub struct DeleteInboundShipment {
    pub id: String,
}

type OutError = DeleteInboundShipmentError;

pub fn delete_inbound_shipment(
    ctx: &ServiceContext,
    input: DeleteInboundShipment,
) -> Result<String, OutError> {
    let invoice_id = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &input, &ctx.store_id)?;

            let lines = get_lines_for_invoice(connection, &input.id)?;
            for line in lines {
                delete_inbound_shipment_line(
                    ctx,
                    DeleteInboundShipmentLine {
                        id: line.invoice_line_row.id.clone(),
                    },
                )
                .map_err(|error| DeleteInboundShipmentError::LineDeleteError {
                    line_id: line.invoice_line_row.id,
                    error,
                })?;
            }
            // End TODO
            activity_log_entry(
                ctx,
                ActivityLogType::InvoiceDeleted,
                Some(input.id.to_owned()),
                None,
                None,
            )?;

            match InvoiceRowRepository::new(connection).delete(&input.id.clone()) {
                Ok(_) => Ok(input.id.clone()),
                Err(error) => Err(OutError::DatabaseError(error)),
            }
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(invoice_id)
}

#[derive(Debug, PartialEq)]
pub enum DeleteInboundShipmentError {
    InvoiceDoesNotExist,
    DatabaseError(RepositoryError),
    NotAnInboundShipment,
    NotThisStoreInvoice,
    CannotEditFinalised,
    LineDeleteError {
        line_id: String,
        error: DeleteInboundShipmentLineError,
    },
}

impl From<RepositoryError> for DeleteInboundShipmentError {
    fn from(error: RepositoryError) -> Self {
        DeleteInboundShipmentError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for DeleteInboundShipmentError
where
    ERR: Into<DeleteInboundShipmentError>,
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
            mock_inbound_shipment_a, mock_inbound_shipment_b, mock_inbound_shipment_c,
            mock_inbound_shipment_e, mock_outbound_shipment_e, mock_store_a, mock_store_b,
            mock_user_account_a, MockDataInserts,
        },
        test_db::setup_all,
        InvoiceRowRepository,
    };

    use crate::{
        invoice::inbound_shipment::{
            DeleteInboundShipment, DeleteInboundShipmentError as ServiceError,
        },
        invoice_line::inbound_shipment_line::DeleteInboundShipmentLineError,
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn delete_inbound_shipment_errors() {
        let (_, _, connection_manager, _) =
            setup_all("delete_inbound_shipment_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let mut context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.invoice_service;

        // InvoiceDoesNotExist
        assert_eq!(
            service.delete_inbound_shipment(
                &context,
                DeleteInboundShipment {
                    id: "invalid".to_owned(),
                },
            ),
            Err(ServiceError::InvoiceDoesNotExist)
        );

        // CannotEditFinalised
        assert_eq!(
            service.delete_inbound_shipment(
                &context,
                DeleteInboundShipment {
                    id: mock_inbound_shipment_b().id.clone(),
                },
            ),
            Err(ServiceError::CannotEditFinalised)
        );

        // NotAnInboundShipment
        assert_eq!(
            service.delete_inbound_shipment(
                &context,
                DeleteInboundShipment {
                    id: mock_outbound_shipment_e().id.clone(),
                },
            ),
            Err(ServiceError::NotAnInboundShipment)
        );

        // LineDeleteError
        assert_eq!(
            service.delete_inbound_shipment(
                &context,
                DeleteInboundShipment {
                    id: mock_inbound_shipment_a().id.clone(),
                },
            ),
            Err(ServiceError::LineDeleteError {
                line_id: "inbound_shipment_a_line_a".to_string(),
                error: DeleteInboundShipmentLineError::BatchIsReserved
            })
        );

        // NotThisStoreInvoice
        context.store_id = mock_store_b().id;
        assert_eq!(
            service.delete_inbound_shipment(
                &context,
                DeleteInboundShipment {
                    id: mock_inbound_shipment_c().id.clone(),
                },
            ),
            Err(ServiceError::NotThisStoreInvoice)
        );
    }

    #[actix_rt::test]
    async fn delete_inbound_shipment_success() {
        let (_, connection, connection_manager, _) =
            setup_all("delete_inbound_shipment_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.invoice_service;

        let invoice_id = service
            .delete_inbound_shipment(
                &context,
                DeleteInboundShipment {
                    id: mock_inbound_shipment_e().id,
                },
            )
            .unwrap();

        //test entry has been deleted
        assert_eq!(
            InvoiceRowRepository::new(&connection)
                .find_one_by_id(&invoice_id)
                .unwrap(),
            None
        );
    }
}

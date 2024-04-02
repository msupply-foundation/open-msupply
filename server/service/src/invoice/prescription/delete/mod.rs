use repository::{ActivityLogType, InvoiceRowRepository, RepositoryError};

pub mod validate;

use validate::validate;

use crate::{
    activity_log::activity_log_entry,
    invoice::common::get_lines_for_invoice,
    invoice_line::stock_out_line::{
        delete_stock_out_line, DeleteStockOutLine, DeleteStockOutLineError, StockOutType,
    },
    service_provider::ServiceContext,
};

type OutError = DeletePrescriptionError;

pub fn delete_prescription(
    ctx: &ServiceContext,
    id: String,
) -> Result<String, DeletePrescriptionError> {
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
                        r#type: Some(StockOutType::Prescription),
                    },
                )
                .map_err(|error| OutError::LineDeleteError {
                    line_id: line.invoice_line_row.id,
                    error,
                })?;
            }

            activity_log_entry(
                ctx,
                ActivityLogType::PrescriptionDeleted,
                Some(id.to_owned()),
                None,
                None,
            )?;

            match InvoiceRowRepository::new(connection).delete(&id) {
                Ok(_) => Ok(id.clone()),
                Err(error) => Err(OutError::DatabaseError(error)),
            }
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(invoice_id)
}

#[derive(Debug, PartialEq, Clone)]

pub enum DeletePrescriptionError {
    InvoiceDoesNotExist,
    DatabaseError(RepositoryError),
    NotThisStoreInvoice,
    CannotEditFinalised,
    LineDeleteError {
        line_id: String,
        error: DeleteStockOutLineError,
    },
    NotAPrescriptionInvoice,
}

impl From<RepositoryError> for DeletePrescriptionError {
    fn from(error: RepositoryError) -> Self {
        DeletePrescriptionError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_inbound_shipment_c, mock_prescription_a, mock_prescription_verified, mock_store_a,
            mock_store_c, MockDataInserts,
        },
        test_db::setup_all,
        InvoiceRowRepository,
    };

    use crate::{
        invoice::prescription::delete::DeletePrescriptionError as ServiceError,
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn delete_prescription_errors() {
        let (_, _, connection_manager, _) =
            setup_all("delete_prescription_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_service;

        // InvoiceDoesNotExist
        assert_eq!(
            service.delete_prescription(&context, "invalid".to_string()),
            Err(ServiceError::InvoiceDoesNotExist)
        );

        // NotAPrescriptionInvoice
        assert_eq!(
            service.delete_prescription(&context, mock_inbound_shipment_c().id),
            Err(ServiceError::NotAPrescriptionInvoice)
        );

        // CannotEditFinalised
        assert_eq!(
            service.delete_prescription(&context, mock_prescription_verified().id),
            Err(ServiceError::CannotEditFinalised)
        );

        // NotThisStoreInvoice
        context.store_id = mock_store_c().id;
        assert_eq!(
            service.delete_prescription(&context, mock_prescription_a().id),
            Err(ServiceError::NotThisStoreInvoice)
        );
    }

    #[actix_rt::test]
    async fn delete_prescription_success() {
        let (_, connection, connection_manager, _) =
            setup_all("delete_prescription_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_service;

        let invoice_id = service
            .delete_prescription(&context, mock_prescription_a().id)
            .unwrap();

        //test entry has been deleted
        assert_eq!(
            InvoiceRowRepository::new(&connection)
                .find_one_by_id_option(&invoice_id)
                .unwrap(),
            None
        );
    }
}

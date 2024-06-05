use repository::{ActivityLogType, InvoiceRowRepository, RepositoryError};

mod validate;

use validate::validate;

use crate::{
    activity_log::activity_log_entry,
    invoice::common::get_lines_for_invoice,
    invoice_line::stock_in_line::{
        delete::{delete_stock_in_line, DeleteStockInLine, DeleteStockInLineError},
        StockInType,
    },
    service_provider::ServiceContext,
};

pub fn delete_inbound_return(
    ctx: &ServiceContext,
    id: String,
) -> Result<String, DeleteInboundReturnError> {
    ctx.connection
        .transaction_sync(|connection| {
            validate(&id, &ctx.store_id, &connection)?;

            let lines = get_lines_for_invoice(connection, &id)?;
            for line in lines {
                delete_stock_in_line(
                    ctx,
                    DeleteStockInLine {
                        id: line.invoice_line_row.id.clone(),
                        r#type: StockInType::InboundReturn,
                    },
                )
                .map_err(|error| DeleteInboundReturnError::LineDeleteError {
                    line_id: line.invoice_line_row.id,
                    error,
                })?;
            }

            InvoiceRowRepository::new(&connection)
                .delete(&id)
                .map_err(|error| DeleteInboundReturnError::DatabaseError(error))?;

            activity_log_entry(
                &ctx,
                ActivityLogType::InvoiceDeleted,
                Some(id.to_owned()),
                None,
                None,
            )?;

            Ok(id)
        })
        .map_err(|error| error.to_inner_error())
}

#[derive(Debug, PartialEq, Clone)]

pub enum DeleteInboundReturnError {
    InvoiceDoesNotExist,
    DatabaseError(RepositoryError),
    NotThisStoreInvoice,
    CannotEditFinalised,
    LineDeleteError {
        line_id: String,
        error: DeleteStockInLineError,
    },
    NotAnInboundReturn,
}

impl From<RepositoryError> for DeleteInboundReturnError {
    fn from(error: RepositoryError) -> Self {
        DeleteInboundReturnError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            currency_a, mock_item_a, mock_name_store_a, mock_name_store_b,
            mock_outbound_shipment_a, mock_store_a, mock_store_b, MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        InvoiceLineRow, InvoiceLineType, InvoiceRow, InvoiceRowRepository, InvoiceStatus,
        InvoiceType, StockLineRow, StockLineRowRepository,
    };

    use crate::{
        invoice::inbound_return::delete::DeleteInboundReturnError as ServiceError,
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn delete_inbound_return_errors() {
        fn wrong_store() -> InvoiceRow {
            InvoiceRow {
                id: "wrong_store".to_string(),
                store_id: mock_store_a().id,
                r#type: InvoiceType::InboundReturn,
                name_link_id: mock_name_store_a().id,
                currency_id: Some(currency_a().id),
                ..Default::default()
            }
        }
        fn verified() -> InvoiceRow {
            InvoiceRow {
                id: "verified".to_string(),
                store_id: mock_store_b().id,
                r#type: InvoiceType::InboundReturn,
                name_link_id: mock_name_store_b().id,
                status: InvoiceStatus::Verified,
                currency_id: Some(currency_a().id),
                ..Default::default()
            }
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "delete_inbound_return_errors",
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
            service.delete_inbound_return(&context, "invalid".to_string()),
            Err(ServiceError::InvoiceDoesNotExist)
        );

        //NotAnInboundReturn
        assert_eq!(
            service.delete_inbound_return(&context, mock_outbound_shipment_a().id),
            Err(ServiceError::NotAnInboundReturn)
        );

        //NotThisStoreInvoice
        assert_eq!(
            service.delete_inbound_return(&context, wrong_store().id),
            Err(ServiceError::NotThisStoreInvoice)
        );

        //CannotEditFinalised
        assert_eq!(
            service.delete_inbound_return(&context, verified().id),
            Err(ServiceError::CannotEditFinalised)
        );
    }

    #[actix_rt::test]
    async fn delete_inbound_return_success() {
        fn return_to_delete() -> InvoiceRow {
            InvoiceRow {
                id: "return_to_delete".to_string(),
                store_id: mock_store_b().id,
                name_link_id: mock_name_store_b().id,
                currency_id: Some(currency_a().id),
                r#type: InvoiceType::InboundReturn,
                status: InvoiceStatus::New,
                ..Default::default()
            }
        }

        fn stock_line() -> StockLineRow {
            StockLineRow {
                id: "test_stock_line".to_string(),
                store_id: mock_store_b().id,
                item_link_id: mock_item_a().id,
                ..Default::default()
            }
        }
        fn return_line() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "return_line".to_string(),
                invoice_id: return_to_delete().id,
                stock_line_id: Some(stock_line().id),
                item_link_id: mock_item_a().id,
                r#type: InvoiceLineType::StockIn,
                ..Default::default()
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "delete_inbound_return_success",
            MockDataInserts::all(),
            MockData {
                invoices: vec![return_to_delete()],
                invoice_lines: vec![return_line()],
                stock_lines: vec![stock_line()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_b().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_service;

        let stock_line_row_repo = StockLineRowRepository::new(&connection);

        // stock line exists before delete
        assert!(stock_line_row_repo.find_one_by_id(&stock_line().id).is_ok());

        service
            .delete_inbound_return(&context, return_to_delete().id)
            .unwrap();

        // test entry has been deleted
        assert_eq!(
            InvoiceRowRepository::new(&connection)
                .find_one_by_id(&return_to_delete().id)
                .unwrap(),
            None
        );

        // stock has been deleted
        assert_eq!(
            stock_line_row_repo
                .find_one_by_id(&stock_line().id)
                .unwrap(),
            None
        )
    }
}

use crate::{
    invoice::common::generate_invoice_user_id_update, service_provider::ServiceContext, WithDBError,
};
use repository::{
    vvm_status::vvm_status_log_row::VVMStatusLogRowRepository, InvoiceLineRowRepository,
    InvoiceRowRepository, RepositoryError, StockLineRowRepository,
};

mod validate;

use validate::validate;

use super::{get_existing_vvm_status_log_id, StockInType};

#[derive(Clone, Debug, PartialEq, Default)]
pub struct DeleteStockInLine {
    pub id: String,
    pub r#type: StockInType,
}

type OutError = DeleteStockInLineError;

pub fn delete_stock_in_line(
    ctx: &ServiceContext,
    input: DeleteStockInLine,
) -> Result<String, OutError> {
    let line_id = ctx
        .connection
        .transaction_sync(|connection| {
            let (invoice_row, line) = validate(&input, &ctx.store_id, connection)?;
            let delete_batch_id_option = line.stock_line_id.clone();

            if let Some(batch_id) = &delete_batch_id_option {
                if let Some(existing_log_id) =
                    get_existing_vvm_status_log_id(connection, batch_id, &line.id)?
                {
                    VVMStatusLogRowRepository::new(connection).delete(&existing_log_id)?;
                }
            }

            InvoiceLineRowRepository::new(connection).delete(&line.id)?;

            let delete_batch_id_option = line.stock_line_id.clone();
            if let Some(id) = delete_batch_id_option {
                StockLineRowRepository::new(connection).delete(&id)?;
            }

            if let Some(invoice_row) = generate_invoice_user_id_update(&ctx.user_id, invoice_row) {
                InvoiceRowRepository::new(connection).upsert_one(&invoice_row)?;
            }

            Ok(line.id) as Result<String, OutError>
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(line_id)
}

#[derive(Debug, PartialEq, Clone)]
pub enum DeleteStockInLineError {
    LineDoesNotExist,
    DatabaseError(RepositoryError),
    InvoiceDoesNotExist,
    NotAStockIn,
    NotThisStoreInvoice,
    CannotEditFinalised,
    BatchIsReserved,
    NotThisInvoiceLine(String),
    LineUsedInStocktake,
    LineLinkedToTransferredInvoice,
}

impl From<RepositoryError> for DeleteStockInLineError {
    fn from(error: RepositoryError) -> Self {
        DeleteStockInLineError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for DeleteStockInLineError
where
    ERR: Into<DeleteStockInLineError>,
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
            mock_customer_return_a, mock_customer_return_a_invoice_line_a,
            mock_customer_return_a_invoice_line_b, mock_item_a, mock_name_store_b, mock_store_a,
            mock_store_b, mock_supplier_return_b_invoice_line_a,
            mock_transferred_inbound_shipment_a, mock_transferred_inbound_shipment_a_line_b,
            mock_user_account_a, mock_vaccine_item_a, mock_vvm_status_a, MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        vvm_status::vvm_status_log::{VVMStatusLogFilter, VVMStatusLogRepository},
        EqualFilter, InvoiceLineRow, InvoiceLineRowRepository, InvoiceLineType, InvoiceRow,
        InvoiceStatus, InvoiceType, StockLineRow, StockLineRowRepository,
    };

    use crate::{
        invoice_line::stock_in_line::{
            delete::DeleteStockInLine, delete_stock_in_line, insert_stock_in_line,
            DeleteStockInLineError as ServiceError, InsertStockInLine, StockInType,
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn delete_stock_in_line_errors() {
        fn verified_return() -> InvoiceRow {
            InvoiceRow {
                id: "verified_return".to_string(),
                store_id: mock_store_b().id,
                name_link_id: mock_name_store_b().id,
                r#type: InvoiceType::CustomerReturn,
                status: InvoiceStatus::Verified,
                ..Default::default()
            }
        }

        fn verified_return_line() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "verified_return_line".to_string(),
                invoice_id: verified_return().id,
                item_link_id: mock_item_a().id,
                r#type: InvoiceLineType::StockIn,
                ..Default::default()
            }
        }
        let (_, _, connection_manager, _) = setup_all_with_data(
            "delete_stock_in_line_errors",
            MockDataInserts::all(),
            MockData {
                invoices: vec![verified_return()],
                invoice_lines: vec![verified_return_line()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let mut context = service_provider
            .context(mock_store_b().id, mock_user_account_a().id)
            .unwrap();

        // LineDoesNotExist
        assert_eq!(
            delete_stock_in_line(
                &context,
                DeleteStockInLine {
                    id: "invalid".to_owned(),
                    r#type: StockInType::CustomerReturn,
                },
            ),
            Err(ServiceError::LineDoesNotExist)
        );

        // NotAnStockIn
        assert_eq!(
            delete_stock_in_line(
                &context,
                DeleteStockInLine {
                    id: mock_supplier_return_b_invoice_line_a().id,
                    r#type: StockInType::CustomerReturn,
                },
            ),
            Err(ServiceError::NotAStockIn)
        );

        // CannotEditFinalised
        assert_eq!(
            delete_stock_in_line(
                &context,
                DeleteStockInLine {
                    id: verified_return_line().id,
                    r#type: StockInType::CustomerReturn,
                },
            ),
            Err(ServiceError::CannotEditFinalised)
        );

        // BatchIsReserved
        assert_eq!(
            delete_stock_in_line(
                &context,
                DeleteStockInLine {
                    id: mock_customer_return_a_invoice_line_b().id, // line number_of_packs and stock_line available_number_of_packs are different
                    r#type: StockInType::CustomerReturn,
                },
            ),
            Err(ServiceError::BatchIsReserved)
        );

        // // TransferredShipment
        assert_eq!(
            delete_stock_in_line(
                &context,
                DeleteStockInLine {
                    id: mock_transferred_inbound_shipment_a_line_b().id,
                    r#type: StockInType::InboundShipment,
                },
            ),
            Err(ServiceError::LineLinkedToTransferredInvoice)
        );

        // NotThisStoreInvoice
        context.store_id = mock_store_a().id;
        assert_eq!(
            delete_stock_in_line(
                &context,
                DeleteStockInLine {
                    id: mock_customer_return_a_invoice_line_a().id,
                    r#type: StockInType::CustomerReturn,
                },
            ),
            Err(ServiceError::NotThisStoreInvoice)
        );
    }

    #[actix_rt::test]
    async fn delete_stock_in_line_success() {
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
                invoice_id: mock_customer_return_a().id,
                stock_line_id: Some(stock_line().id),
                item_link_id: mock_item_a().id,
                r#type: InvoiceLineType::StockIn,
                ..Default::default()
            }
        }
        let (_, connection, connection_manager, _) = setup_all_with_data(
            "delete_stock_in_line_success",
            MockDataInserts::all(),
            MockData {
                stock_lines: vec![stock_line()],
                invoice_lines: vec![return_line()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_b().id, mock_user_account_a().id)
            .unwrap();

        let invoice_line_id = delete_stock_in_line(
            &context,
            DeleteStockInLine {
                id: return_line().id,
                r#type: StockInType::CustomerReturn,
            },
        )
        .unwrap();

        //test return line has been deleted
        assert_eq!(
            InvoiceLineRowRepository::new(&connection)
                .find_one_by_id(&invoice_line_id)
                .unwrap(),
            None
        );
        //test associated stock line has been deleted
        assert_eq!(
            StockLineRowRepository::new(&connection)
                .find_one_by_id(&stock_line().id)
                .unwrap(),
            None
        );

        // Check vvm status log is deleted when the associated inbound shipment line is deleted

        // Create a new inbound shipment line with vvm status
        insert_stock_in_line(
            &context,
            InsertStockInLine {
                id: "delivered_invoice_line_with_vvm_status".to_string(),
                invoice_id: mock_transferred_inbound_shipment_a().id,
                item_id: mock_vaccine_item_a().id,
                pack_size: 1.0,
                number_of_packs: 1.0,
                r#type: StockInType::InboundShipment,
                vvm_status_id: Some(mock_vvm_status_a().id),
                ..Default::default()
            },
        )
        .unwrap();

        let vvm_log_filter = VVMStatusLogFilter::new().invoice_line_id(EqualFilter::equal_to(
            "delivered_invoice_line_with_vvm_status",
        ));

        let vvm_status_log = VVMStatusLogRepository::new(&connection)
            .query_by_filter(vvm_log_filter.clone())
            .unwrap()
            .first()
            .map(|log| log.status_id.clone());

        // Check the log exists
        assert_eq!(vvm_status_log, Some(mock_vvm_status_a().id));

        // delete the inbound shipment line
        delete_stock_in_line(
            &context,
            DeleteStockInLine {
                id: "delivered_invoice_line_with_vvm_status".to_string(),
                r#type: StockInType::InboundShipment,
                ..Default::default()
            },
        )
        .unwrap();

        // Check the shipment line no longer exists
        let deleted_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id("delivered_invoice_line_with_vvm_status")
            .unwrap();
        assert_eq!(deleted_line, None);

        let vvm_status_log = VVMStatusLogRepository::new(&connection)
            .query_by_filter(vvm_log_filter)
            .unwrap()
            .first()
            .map(|log| log.status_id.clone());

        // Check the log no longer exists
        assert_eq!(vvm_status_log, None);
    }
}

use crate::{service_provider::ServiceContext, WithDBError};
use repository::{
    InvoiceLineRowRepository, InvoiceRowRepository, InvoiceRowStatus, RepositoryError,
    StockLineRowRepository,
};

mod validate;

use validate::validate;
#[derive(Clone, Debug, PartialEq, Default)]
pub struct DeleteOutboundShipmentLine {
    pub id: String,
}

type OutError = DeleteOutboundShipmentLineError;

pub fn delete_outbound_shipment_line(
    ctx: &ServiceContext,
    input: DeleteOutboundShipmentLine,
) -> Result<String, OutError> {
    let line_id = ctx
        .connection
        .transaction_sync(|connection| {
            let line = validate(&input, &ctx.store_id, &connection)?;
            let stock_line_id_option = line.stock_line_id.clone();

            InvoiceLineRowRepository::new(&connection).delete(&line.id)?;

            if let Some(stock_line_id) = stock_line_id_option {
                let invoice_repository = InvoiceRowRepository::new(&connection);
                let stock_line_repository = StockLineRowRepository::new(&connection);

                let mut stock_line = stock_line_repository.find_one_by_id(&stock_line_id)?;
                stock_line.available_number_of_packs += line.number_of_packs;

                let invoice = invoice_repository.find_one_by_id(&line.invoice_id)?;
                if invoice.status == InvoiceRowStatus::Picked {
                    stock_line.total_number_of_packs += line.number_of_packs;
                }

                stock_line_repository.upsert_one(&stock_line)?;
            }

            Ok(line.id) as Result<String, OutError>
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(line_id)
}

#[derive(Debug, Clone, PartialEq)]
pub enum DeleteOutboundShipmentLineError {
    LineDoesNotExist,
    DatabaseError(RepositoryError),
    InvoiceDoesNotExist,
    NotAnOutboundShipment,
    NotThisStoreInvoice,
    CannotEditInvoice,
    NotThisInvoiceLine(String),
}

impl From<RepositoryError> for DeleteOutboundShipmentLineError {
    fn from(error: RepositoryError) -> Self {
        DeleteOutboundShipmentLineError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for DeleteOutboundShipmentLineError
where
    ERR: Into<DeleteOutboundShipmentLineError>,
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
    use chrono::NaiveDate;
    use repository::{
        mock::{
            mock_inbound_shipment_a_invoice_lines, mock_outbound_shipment_a_invoice_lines,
            mock_outbound_shipment_b_invoice_lines, mock_outbound_shipment_c_invoice_lines,
            mock_outbound_shipment_no_lines, mock_store_c, MockData, MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        InvoiceLineRow, InvoiceLineRowRepository, InvoiceLineRowType, InvoiceRow, InvoiceRowStatus,
        StockLineRowRepository,
    };
    use util::{inline_edit, inline_init};

    use crate::{
        invoice_line::outbound_shipment_line::delete::DeleteOutboundShipmentLine,
        invoice_line::outbound_shipment_line::DeleteOutboundShipmentLineError as ServiceError,
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn delete_inbound_shipment_line_errors() {
        let (_, _, connection_manager, _) = setup_all(
            "delete_outbound_shipment_line_errors",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let store_a_context = service_provider.context("store_a", "").unwrap();
        let store_b_context = service_provider.context("store_b", "").unwrap();
        let store_c_context = service_provider.context("store_c", "").unwrap();
        let service = service_provider.invoice_line_service;

        // LineDoesNotExist
        assert_eq!(
            service.delete_outbound_shipment_line(
                &store_b_context,
                DeleteOutboundShipmentLine {
                    id: "invalid".to_owned(),
                },
            ),
            Err(ServiceError::LineDoesNotExist)
        );

        // NotAnOutboundShipment
        assert_eq!(
            service.delete_outbound_shipment_line(
                &store_a_context,
                DeleteOutboundShipmentLine {
                    id: mock_inbound_shipment_a_invoice_lines()[0].id.clone(),
                },
            ),
            Err(ServiceError::NotAnOutboundShipment)
        );

        // CannotEditInvoice
        assert_eq!(
            service.delete_outbound_shipment_line(
                &store_c_context,
                DeleteOutboundShipmentLine {
                    id: mock_outbound_shipment_b_invoice_lines()[1].id.clone(),
                },
            ),
            Err(ServiceError::CannotEditInvoice)
        );

        // NotThisStoreInvoice
        assert_eq!(
            service.delete_outbound_shipment_line(
                &store_b_context,
                DeleteOutboundShipmentLine {
                    id: mock_outbound_shipment_c_invoice_lines()[0].id.clone()
                }
            ),
            Err(ServiceError::NotThisStoreInvoice)
        );
    }

    #[actix_rt::test]
    async fn delete_outbound_shipment_line_success() {
        fn outbound_shipment_no_lines_allocated() -> InvoiceRow {
            inline_edit(&mock_outbound_shipment_no_lines(), |mut u| {
                u.status = InvoiceRowStatus::Allocated;
                u
            })
        }

        fn outbound_shipment_lines() -> InvoiceLineRow {
            inline_init(|r: &mut InvoiceLineRow| {
                r.id = String::from("outbound_shipment_no_lines_a");
                r.invoice_id = mock_outbound_shipment_no_lines().id;
                r.item_id = String::from("item_a");
                r.item_name = String::from("Item A");
                r.item_code = String::from("item_a_code");
                r.stock_line_id = Some(String::from("item_a_line_a"));
                r.batch = Some(String::from("item_a_line_a"));
                r.expiry_date = Some(NaiveDate::from_ymd(2020, 8, 1));
                r.pack_size = 1;
                r.total_before_tax = 0.87;
                r.total_after_tax = 1.0;
                r.tax = Some(15.0);
                r.r#type = InvoiceLineRowType::StockOut;
                r.number_of_packs = 10;
            })
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "delete_outbound_shipment_line_success",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.invoices = vec![outbound_shipment_no_lines_allocated()];
                r.invoice_lines = vec![outbound_shipment_lines()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let store_b_context = service_provider.context("store_b", "").unwrap();
        let store_c_context = service_provider.context(&mock_store_c().id, "").unwrap();
        let service = service_provider.invoice_line_service;

        // helpers to compare total
        let stock_line_for_invoice_line = |invoice_line: &InvoiceLineRow| {
            let stock_line_id = invoice_line.stock_line_id.as_ref().unwrap();
            StockLineRowRepository::new(&connection)
                .find_one_by_id(&stock_line_id)
                .unwrap()
        };

        // Test delete Picked invoice line
        let invoice_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&mock_outbound_shipment_a_invoice_lines()[0].id)
            .unwrap();
        let stock_line = stock_line_for_invoice_line(&invoice_line);
        let expected_stock_line_total =
            stock_line.total_number_of_packs + invoice_line.number_of_packs;
        let expected_available_number_of_packs =
            stock_line.available_number_of_packs + invoice_line.number_of_packs;

        let invoice_line_id = service
            .delete_outbound_shipment_line(
                &store_b_context,
                DeleteOutboundShipmentLine {
                    id: mock_outbound_shipment_a_invoice_lines()[0].id.clone(),
                },
            )
            .unwrap();
        assert_eq!(
            InvoiceLineRowRepository::new(&connection)
                .find_one_by_id_option(&invoice_line_id)
                .unwrap(),
            None
        );

        let stock_line = StockLineRowRepository::new(&connection)
            .find_one_by_id(&invoice_line.stock_line_id.unwrap())
            .unwrap();
        assert_eq!(expected_stock_line_total, stock_line.total_number_of_packs);
        assert_eq!(
            expected_available_number_of_packs,
            stock_line.available_number_of_packs
        );

        // Test delete New invoice line
        let invoice_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&mock_outbound_shipment_c_invoice_lines()[0].id)
            .unwrap();
        let stock_line = stock_line_for_invoice_line(&invoice_line);
        let expected_stock_line_total = stock_line.total_number_of_packs;
        let expected_available_number_of_packs =
            stock_line.available_number_of_packs + invoice_line.number_of_packs;

        service
            .delete_outbound_shipment_line(
                &store_c_context,
                DeleteOutboundShipmentLine {
                    id: mock_outbound_shipment_c_invoice_lines()[0].id.clone(),
                },
            )
            .unwrap();

        let stock_line = StockLineRowRepository::new(&connection)
            .find_one_by_id(&invoice_line.stock_line_id.unwrap())
            .unwrap();
        assert_eq!(expected_stock_line_total, stock_line.total_number_of_packs);
        assert_eq!(
            expected_available_number_of_packs,
            stock_line.available_number_of_packs
        );

        // Test delete Allocated invoice line
        let invoice_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&outbound_shipment_lines().id)
            .unwrap();
        let stock_line = stock_line_for_invoice_line(&invoice_line);
        let expected_stock_line_total = stock_line.total_number_of_packs;
        let expected_available_number_of_packs =
            stock_line.available_number_of_packs + invoice_line.number_of_packs;

        service
            .delete_outbound_shipment_line(
                &store_c_context,
                DeleteOutboundShipmentLine {
                    id: outbound_shipment_lines().id,
                },
            )
            .unwrap();

        let stock_line = StockLineRowRepository::new(&connection)
            .find_one_by_id(&invoice_line.stock_line_id.unwrap())
            .unwrap();
        assert_eq!(expected_stock_line_total, stock_line.total_number_of_packs);
        assert_eq!(
            expected_available_number_of_packs,
            stock_line.available_number_of_packs
        );
    }
}

use repository::{
    requisition_row::RequisitionRowType, InvoiceRowRepository, InvoiceRowType, RepositoryError,
    RequisitionRowRepository, StocktakeRowRepository, StorageConnection,
};

pub fn invoice_next_number(
    connection: &StorageConnection,
    r#type: &InvoiceRowType,
    store_id: &str,
) -> Result<i64, RepositoryError> {
    let next_number = connection.transaction_sync(|connection_tx| {
        let repo = InvoiceRowRepository::new(&connection_tx);

        let next_number = match repo.max_number_by_type_and_store(r#type, store_id)? {
            Some(mut number) => {
                number += 1;
                number
            }
            None => 1,
        };
        Ok(next_number)
    })?;
    Ok(next_number)
}

pub fn requisition_next_number(
    connection: &StorageConnection,
    r#type: &RequisitionRowType,
    store_id: &str,
) -> Result<i64, RepositoryError> {
    let next_number = connection.transaction_sync(|connection_tx| {
        let repo = RequisitionRowRepository::new(&connection_tx);

        let next_number = match repo.max_number_by_type_and_store(r#type, store_id)? {
            Some(mut number) => {
                number += 1;
                number
            }
            None => 1,
        };
        Ok(next_number)
    })?;
    Ok(next_number)
}

pub fn stocktake_next_number(
    connection: &StorageConnection,
    store_id: &str,
) -> Result<i64, RepositoryError> {
    let next_number = connection.transaction_sync(|connection_tx| {
        let repo = StocktakeRowRepository::new(&connection_tx);

        let next_number = match repo.max_number_by_type_and_store(store_id)? {
            Some(mut number) => {
                number += 1;
                number
            }
            None => 1,
        };
        Ok(next_number)
    })?;
    Ok(next_number)
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_outbound_shipment_a, mock_requisition_for_number_test, mock_stocktake_no_line_a,
            mock_store_a, mock_store_b, mock_store_c, mock_unique_number_inbound_shipment,
            MockDataInserts,
        },
        requisition_row::RequisitionRowType,
        test_db::setup_all,
        InvoiceRowType,
    };

    use super::{invoice_next_number, requisition_next_number, stocktake_next_number};

    #[actix_rt::test]
    async fn test_number_service() {
        let (_, connection, _, _) = setup_all("test_number_service", MockDataInserts::all()).await;

        let inbound_shipment = mock_unique_number_inbound_shipment();
        let outbound_shipment = mock_outbound_shipment_a();
        let request_requisition = mock_requisition_for_number_test();
        let stocktake = mock_stocktake_no_line_a();

        // Test existing
        let result = invoice_next_number(
            &connection,
            &InvoiceRowType::InboundShipment,
            &mock_store_a().id,
        )
        .unwrap();
        assert_eq!(result, inbound_shipment.invoice_number + 1);

        let result = invoice_next_number(
            &connection,
            &InvoiceRowType::OutboundShipment,
            &mock_store_b().id,
        )
        .unwrap();
        assert_eq!(result, outbound_shipment.invoice_number + 1);

        let result = requisition_next_number(
            &connection,
            &RequisitionRowType::Request,
            &mock_store_a().id,
        )
        .unwrap();
        assert_eq!(result, request_requisition.requisition_number + 1);

        let result = stocktake_next_number(&connection, &mock_store_a().id).unwrap();
        assert_eq!(result, stocktake.stocktake_number + 1);

        // Test new
        let result = invoice_next_number(
            &connection,
            &InvoiceRowType::InboundShipment,
            &mock_store_b().id,
        )
        .unwrap();
        assert_eq!(result, 1);

        let result =
            invoice_next_number(&connection, &InvoiceRowType::OutboundShipment, "store_e").unwrap();
        assert_eq!(result, 1);

        let result = requisition_next_number(
            &connection,
            &RequisitionRowType::Request,
            &mock_store_b().id,
        )
        .unwrap();
        assert_eq!(result, 1);

        let result = stocktake_next_number(&connection, &mock_store_c().id).unwrap();
        assert_eq!(result, 1);
    }
}

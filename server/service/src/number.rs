use repository::{
    NumberRow, NumberRowRepository, NumberRowType, RepositoryError, StorageConnection,
};
use util::uuid::uuid;

pub fn next_number(
    connection: &StorageConnection,
    r#type: &NumberRowType,
    store_id: &str,
) -> Result<i64, RepositoryError> {
    // Should be done in transaction
    let next_number = connection.transaction_sync(|connection_tx| {
        let repo = NumberRowRepository::new(&connection_tx);

        let updated_number_row = match repo.find_one_by_type_and_store(r#type, store_id)? {
            Some(mut row) => {
                // update existing counter
                row.value = row.value + 1;
                repo.upsert_one(&row)?;
                row
            }
            None => {
                // insert new counter
                let row = NumberRow {
                    id: uuid(),
                    value: 1,
                    r#type: r#type.clone(),
                    store_id: store_id.to_owned(),
                };
                repo.upsert_one(&row)?;
                row
            }
        };
        Ok(updated_number_row.value)
    })?;
    Ok(next_number)
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_inbound_shipment_number_store_a, mock_outbound_shipment_number_store_a,
            MockDataInserts,
        },
        test_db::setup_all,
        NumberRowType,
    };

    use crate::number::next_number;

    #[actix_rt::test]
    async fn test_number_service() {
        let (_, connection, _, _) = setup_all("test_number_service", MockDataInserts::all()).await;

        let inbound_shipment_store_a_number = mock_inbound_shipment_number_store_a();
        let outbound_shipment_store_b_number = mock_outbound_shipment_number_store_a();

        // Test existing

        let result = next_number(&connection, &NumberRowType::InboundShipment, "store_a").unwrap();
        assert_eq!(result, inbound_shipment_store_a_number.value + 1);

        let result = next_number(&connection, &NumberRowType::InboundShipment, "store_a").unwrap();
        assert_eq!(result, inbound_shipment_store_a_number.value + 2);

        let result = next_number(&connection, &NumberRowType::OutboundShipment, "store_a").unwrap();
        assert_eq!(result, outbound_shipment_store_b_number.value + 1);

        // Test new

        let result = next_number(&connection, &NumberRowType::OutboundShipment, "store_b").unwrap();
        assert_eq!(result, 1);

        let result = next_number(&connection, &NumberRowType::OutboundShipment, "store_b").unwrap();
        assert_eq!(result, 2);
    }
}

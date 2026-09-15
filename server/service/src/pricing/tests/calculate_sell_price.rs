#[cfg(test)]
mod issue_at_cost_price_tests {
    use repository::{
        mock::MockDataInserts, test_db::setup_all, InvoiceRow, InvoiceType, PreferenceRow,
        PreferenceRowRepository, StorageConnection,
    };

    use crate::{
        preference::{Preference, TransferStockToInternalCustomersAtCostPrice},
        pricing::calculate_sell_price::issue_at_cost_price,
    };

    fn set_pref(connection: &StorageConnection, value: bool) {
        PreferenceRowRepository::new(connection)
            .upsert_one(&PreferenceRow {
                id: "transfer stock to internal customers at cost price".to_string(),
                store_id: None,
                key: TransferStockToInternalCustomersAtCostPrice
                    .key()
                    .to_string(),
                value: value.to_string(),
            })
            .unwrap();
    }

    fn invoice(r#type: InvoiceType, name_store_id: Option<&str>) -> InvoiceRow {
        InvoiceRow {
            r#type,
            name_store_id: name_store_id.map(String::from),
            ..Default::default()
        }
    }

    #[actix_rt::test]
    async fn issue_at_cost_price_only_for_internal_customer_outbound_shipments() {
        let (_, connection, _, _) = setup_all("issue_at_cost_price", MockDataInserts::none()).await;

        let internal_customer_outbound = invoice(InvoiceType::OutboundShipment, Some("store_b"));
        let external_customer_outbound = invoice(InvoiceType::OutboundShipment, None);
        // A supplier return to an internal store is also a transfer, but its
        // pricing is already cost-based - the preference must not touch it
        let internal_customer_return = invoice(InvoiceType::SupplierReturn, Some("store_b"));
        let prescription = invoice(InvoiceType::Prescription, None);

        // Preference defaults to off, so nothing changes for existing deployments
        assert!(!issue_at_cost_price(&connection, &internal_customer_outbound).unwrap());

        set_pref(&connection, true);

        assert!(issue_at_cost_price(&connection, &internal_customer_outbound).unwrap());
        assert!(!issue_at_cost_price(&connection, &external_customer_outbound).unwrap());
        assert!(!issue_at_cost_price(&connection, &internal_customer_return).unwrap());
        assert!(!issue_at_cost_price(&connection, &prescription).unwrap());

        // And turning it back off restores the previous behaviour
        set_pref(&connection, false);

        assert!(!issue_at_cost_price(&connection, &internal_customer_outbound).unwrap());
    }
}

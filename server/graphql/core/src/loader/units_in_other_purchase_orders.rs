use async_graphql::dataloader::*;
use async_graphql::*;
use repository::{
    EqualFilter, PurchaseOrderLineFilter, PurchaseOrderLineRepository, RepositoryError,
    StorageConnectionManager,
};
use service::purchase_order_line::query::calculate_units_in_other_purchase_orders;
use std::collections::HashMap;

pub struct UnitsInOtherPurchaseOrdersLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for UnitsInOtherPurchaseOrdersLoader {
    type Value = f64;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = PurchaseOrderLineRepository::new(&connection);

        let lines = repo.query_by_filter(
            PurchaseOrderLineFilter::new().id(EqualFilter::equal_any(ids.to_vec())),
        )?;

        let mut result = HashMap::new();

        for line in lines {
            let line_row = &line.purchase_order_line_row;
            let item_row = &line.item_row;

            let units = calculate_units_in_other_purchase_orders(
                &connection,
                &line_row.store_id,
                &item_row.id,
                &line_row.purchase_order_id,
            )?;

            result.insert(line_row.id.clone(), units);
        }

        Ok(result)
    }
}

#[cfg(test)]
mod tests {
    use async_graphql::dataloader::Loader;
    use repository::{
        PurchaseOrderLineRow, PurchaseOrderLineRowRepository, PurchaseOrderRow,
        PurchaseOrderRowRepository, PurchaseOrderStatus,
        mock::{MockDataInserts, mock_item_a, mock_name_c, mock_store_a, mock_store_b},
        test_db,
    };

    use crate::loader::UnitsInOtherPurchaseOrdersLoader;

    /// A server can host several stores: a line's on order elsewhere counts
    /// its own store's other Sent orders and never another store's
    /// (spec/purchase-orders/rules.md § Stock on order).
    #[tokio::test]
    async fn units_in_other_purchase_orders_loader_counts_own_store_only() {
        let (_, connection, connection_manager, _) = test_db::setup_all(
            "units_in_other_purchase_orders_loader_counts_own_store_only",
            MockDataInserts::none().stores().items(),
        )
        .await;

        let orders = [
            (
                "po_draft_a",
                mock_store_a().id,
                PurchaseOrderStatus::New,
                10.0,
            ),
            (
                "po_sent_a",
                mock_store_a().id,
                PurchaseOrderStatus::Sent,
                80.0,
            ),
            (
                "po_sent_b",
                mock_store_b().id,
                PurchaseOrderStatus::Sent,
                40.0,
            ),
        ];
        for (number, (id, store_id, status, units)) in orders.into_iter().enumerate() {
            PurchaseOrderRowRepository::new(&connection)
                .upsert_one(&PurchaseOrderRow {
                    id: id.to_string(),
                    store_id: store_id.clone(),
                    supplier_name_id: mock_name_c().id,
                    created_datetime: chrono::Utc::now().naive_utc(),
                    status,
                    purchase_order_number: number as i64 + 1,
                    ..Default::default()
                })
                .unwrap();
            PurchaseOrderLineRowRepository::new(&connection)
                .upsert_one(&PurchaseOrderLineRow {
                    id: format!("{id}_line"),
                    purchase_order_id: id.to_string(),
                    store_id,
                    line_number: 1,
                    item_id: mock_item_a().id,
                    item_name: mock_item_a().name,
                    requested_number_of_units: units,
                    ..Default::default()
                })
                .unwrap();
        }

        let loader = UnitsInOtherPurchaseOrdersLoader { connection_manager };
        let result = loader
            .load(&["po_draft_a_line".to_string(), "po_sent_b_line".to_string()])
            .await
            .unwrap();

        // Store A's draft: store A's Sent order only, not store B's 40
        assert_eq!(result.get("po_draft_a_line"), Some(&80.0));
        // Store B's own Sent order is left out, and store A's never counts
        assert_eq!(result.get("po_sent_b_line"), Some(&0.0));
    }
}

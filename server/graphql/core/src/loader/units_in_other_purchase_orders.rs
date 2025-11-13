use async_graphql::dataloader::*;
use async_graphql::*;
use repository::{
    EqualFilter, PurchaseOrderFilter, PurchaseOrderLineFilter, PurchaseOrderLineRepository,
    PurchaseOrderLineStatus, PurchaseOrderStatus, RepositoryError, StorageConnectionManager,
};
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

            let other_confirmed_orders = repo.query_by_filter(
                PurchaseOrderLineFilter::new()
                    .item_id(EqualFilter::equal_to(item_row.id.to_string()))
                    .purchase_order(
                        PurchaseOrderFilter::new()
                            .id(EqualFilter::not_equal_to(line_row.purchase_order_id.to_string()))
                            .status(PurchaseOrderStatus::Sent.equal_to()),
                    )
                    .status(PurchaseOrderLineStatus::Sent.equal_to()),
            )?;

            // TODO: Reduce any other units received in GRs
            let units_in_other_orders: f64 = other_confirmed_orders
                .iter()
                .map(|l| {
                    l.purchase_order_line_row.requested_pack_size
                        * l.purchase_order_line_row
                            .adjusted_number_of_units
                            .unwrap_or(0.0)
                })
                .sum();

            // Prevent -0.0 from being returned
            let units_in_other_orders = units_in_other_orders + 0.0;
            result.insert(line_row.id.clone(), units_in_other_orders);
        }

        Ok(result)
    }
}

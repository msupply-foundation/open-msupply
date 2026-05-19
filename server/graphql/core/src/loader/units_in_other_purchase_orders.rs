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
                &item_row.id,
                &line_row.purchase_order_id,
                None,
            )?;

            result.insert(line_row.id.clone(), units);
        }

        Ok(result)
    }
}

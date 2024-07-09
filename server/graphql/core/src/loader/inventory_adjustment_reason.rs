use repository::{
    inventory_adjustment_reason::{
        InventoryAdjustmentReason, InventoryAdjustmentReasonFilter,
        InventoryAdjustmentReasonRepository,
    },
    EqualFilter,
};
use repository::{RepositoryError, StorageConnectionManager};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct InventoryAdjustmentReasonByIdLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for InventoryAdjustmentReasonByIdLoader {
    type Value = InventoryAdjustmentReason;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = InventoryAdjustmentReasonRepository::new(&connection);

        let result = repo.query_by_filter(
            InventoryAdjustmentReasonFilter::new().id(EqualFilter::equal_any(ids.to_owned())),
        )?;

        Ok(result
            .into_iter()
            .map(|inventory_adjustment_reason| {
                (
                    inventory_adjustment_reason
                        .inventory_adjustment_reason_row
                        .id
                        .clone(),
                    inventory_adjustment_reason,
                )
            })
            .collect())
    }
}

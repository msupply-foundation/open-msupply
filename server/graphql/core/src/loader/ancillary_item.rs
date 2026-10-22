use actix_web::web::Data;
use repository::ancillary_item::{AncillaryItemFilter, AncillaryItemRepository};
use repository::ancillary_item_row::AncillaryItemRow;
use repository::{EqualFilter, RepositoryError};

use async_graphql::dataloader::*;
use service::{item::ancillary_item::supply_wastage_rates, service_provider::ServiceProvider};
use std::collections::HashMap;

/// Loads ancillary items grouped by their principal `item_id`. The repository
/// layer resolves `item_link_id` → `item_id` via the `ancillary_item_view`, so
/// merged items are handled transparently here.
pub struct AncillaryItemsByItemIdLoader {
    pub service_provider: Data<ServiceProvider>,
}

impl Loader<String> for AncillaryItemsByItemIdLoader {
    type Value = Vec<AncillaryItemRow>;
    type Error = RepositoryError;

    async fn load(&self, item_ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;
        let repo = AncillaryItemRepository::new(&service_context.connection);

        let rows = repo.query_by_filter(
            AncillaryItemFilter::new().item_id(EqualFilter::equal_any(item_ids.to_vec())),
        )?;

        let mut map: HashMap<String, Vec<AncillaryItemRow>> = HashMap::new();
        for row in rows {
            map.entry(row.item_id.clone()).or_default().push(row);
        }
        Ok(map)
    }
}

/// Loads ancillary items grouped by their `ancillary_item_id` — i.e. links
/// where this item is the ancillary supply for some other principal item.
pub struct AncillaryItemsByAncillaryIdLoader {
    pub service_provider: Data<ServiceProvider>,
}

impl Loader<String> for AncillaryItemsByAncillaryIdLoader {
    type Value = Vec<AncillaryItemRow>;
    type Error = RepositoryError;

    async fn load(
        &self,
        ancillary_item_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;
        let repo = AncillaryItemRepository::new(&service_context.connection);

        let rows = repo.query_by_filter(
            AncillaryItemFilter::new()
                .ancillary_item_id(EqualFilter::equal_any(ancillary_item_ids.to_vec())),
        )?;

        let mut map: HashMap<String, Vec<AncillaryItemRow>> = HashMap::new();
        for row in rows {
            map.entry(row.ancillary_item_id.clone())
                .or_default()
                .push(row);
        }
        Ok(map)
    }
}

/// Loads each item's own wastage rate (%) as a supply, by item id. An item without one is
/// absent.
pub struct SupplyWastageRateByItemIdLoader {
    pub service_provider: Data<ServiceProvider>,
}

impl Loader<String> for SupplyWastageRateByItemIdLoader {
    type Value = f64;
    type Error = RepositoryError;

    async fn load(&self, item_ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;
        supply_wastage_rates(&service_context.connection, item_ids)
    }
}

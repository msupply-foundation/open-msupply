use actix_web::web::Data;
use repository::ancillary_item::{AncillaryItemFilter, AncillaryItemRepository};
use repository::ancillary_item_row::AncillaryItemRow;
use repository::{EqualFilter, RepositoryError};

use async_graphql::dataloader::*;
use service::service_provider::ServiceProvider;
use std::collections::HashMap;

/// Loads ancillary items grouped by their `item_link_id` (the principal side).
/// In the common case `item_link.id == item.id`, so callers may pass `item_id`
/// as the key. Items that have been merged (and therefore have multiple
/// `item_link` rows) are not yet supported here.
pub struct AncillaryItemsByItemLinkIdLoader {
    pub service_provider: Data<ServiceProvider>,
}

impl Loader<String> for AncillaryItemsByItemLinkIdLoader {
    type Value = Vec<AncillaryItemRow>;
    type Error = RepositoryError;

    async fn load(
        &self,
        item_link_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;
        let repo = AncillaryItemRepository::new(&service_context.connection);

        let rows = repo.query_by_filter(
            AncillaryItemFilter::new()
                .item_link_id(EqualFilter::equal_any(item_link_ids.to_vec())),
        )?;

        let mut map: HashMap<String, Vec<AncillaryItemRow>> = HashMap::new();
        for row in rows {
            map.entry(row.item_link_id.clone()).or_default().push(row);
        }
        Ok(map)
    }
}

/// Loads ancillary items grouped by their `ancillary_item_link_id` — i.e. links
/// where this item is the ancillary supply for some other principal item.
pub struct AncillaryItemsByAncillaryLinkIdLoader {
    pub service_provider: Data<ServiceProvider>,
}

impl Loader<String> for AncillaryItemsByAncillaryLinkIdLoader {
    type Value = Vec<AncillaryItemRow>;
    type Error = RepositoryError;

    async fn load(
        &self,
        ancillary_item_link_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;
        let repo = AncillaryItemRepository::new(&service_context.connection);

        let rows = repo.query_by_filter(
            AncillaryItemFilter::new()
                .ancillary_item_link_id(EqualFilter::equal_any(ancillary_item_link_ids.to_vec())),
        )?;

        let mut map: HashMap<String, Vec<AncillaryItemRow>> = HashMap::new();
        for row in rows {
            map.entry(row.ancillary_item_link_id.clone())
                .or_default()
                .push(row);
        }
        Ok(map)
    }
}

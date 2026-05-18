use actix_web::web::Data;
use repository::ancillary_item::{AncillaryItemFilter, AncillaryItemRepository};
use repository::ancillary_item_row::AncillaryItemRow;
use repository::{EqualFilter, RepositoryError};

use async_graphql::dataloader::*;
use service::service_provider::ServiceProvider;
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
        let service_provider = self.service_provider.clone();
        let item_ids = item_ids.to_vec();

        tokio::task::spawn_blocking(
            move || -> Result<HashMap<String, Vec<AncillaryItemRow>>, RepositoryError> {
                let service_context = service_provider.basic_context()?;
                let repo = AncillaryItemRepository::new(&service_context.connection);

                let rows = repo.query_by_filter(
                    AncillaryItemFilter::new().item_id(EqualFilter::equal_any(item_ids)),
                )?;

                let mut map: HashMap<String, Vec<AncillaryItemRow>> = HashMap::new();
                for row in rows {
                    map.entry(row.item_id.clone()).or_default().push(row);
                }
                Ok(map)
            },
        )
        .await
        .map_err(|e| RepositoryError::as_db_error("Loader blocking task failed", e))?
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
        let service_provider = self.service_provider.clone();
        let ancillary_item_ids = ancillary_item_ids.to_vec();

        tokio::task::spawn_blocking(
            move || -> Result<HashMap<String, Vec<AncillaryItemRow>>, RepositoryError> {
                let service_context = service_provider.basic_context()?;
                let repo = AncillaryItemRepository::new(&service_context.connection);

                let rows = repo.query_by_filter(
                    AncillaryItemFilter::new()
                        .ancillary_item_id(EqualFilter::equal_any(ancillary_item_ids)),
                )?;

                let mut map: HashMap<String, Vec<AncillaryItemRow>> = HashMap::new();
                for row in rows {
                    map.entry(row.ancillary_item_id.clone())
                        .or_default()
                        .push(row);
                }
                Ok(map)
            },
        )
        .await
        .map_err(|e| RepositoryError::as_db_error("Loader blocking task failed", e))?
    }
}

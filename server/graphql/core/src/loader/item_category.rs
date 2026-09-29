use std::collections::HashMap;

use async_graphql::dataloader::Loader;
use repository::{
    category_row::{CategoryRow, CategoryRowRepository},
    item_category::ItemCategoryFilter,
    item_category::ItemCategoryRepository,
    EqualFilter, RepositoryError, StorageConnectionManager,
};

pub struct ItemCategoryLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for ItemCategoryLoader {
    type Value = Vec<CategoryRow>;
    type Error = RepositoryError;

    async fn load(&self, item_ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let category_repo = CategoryRowRepository::new(&connection);
        let item_category_repo = ItemCategoryRepository::new(&connection);

        let mut result_map: HashMap<String, Vec<CategoryRow>> = HashMap::new();

        for item_id in item_ids {
            let item_categories = item_category_repo.query_by_filter(
                ItemCategoryFilter::new().item_id(EqualFilter::equal_to(item_id.clone())),
            )?;

            let mut categories = Vec::new();
            for ic in &item_categories {
                if let Some(row) =
                    category_repo.find_one_by_id(&ic.item_category_join_row.category_id)?
                {
                    if row.deleted_datetime.is_none() {
                        categories.push(row);
                    }
                }
            }

            if !categories.is_empty() {
                result_map.insert(item_id.clone(), categories);
            }
        }

        Ok(result_map)
    }
}

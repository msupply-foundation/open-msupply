use super::{
    item_category_row::{item_category_join, ItemCategoryJoinRow},
    DBType, StorageConnection,
};

use diesel::{dsl::IntoBoxed, prelude::*};

use crate::{
    diesel_macros::apply_equal_filter, repository_error::RepositoryError, EqualFilter, Pagination,
};

#[derive(PartialEq, Debug, Clone, Default)]
pub struct ItemCategory {
    pub item_category_join_row: ItemCategoryJoinRow,
}

#[derive(Clone, Default)]
pub struct ItemCategoryFilter {
    pub id: Option<EqualFilter<String>>,
    pub item_id: Option<EqualFilter<String>>,
}

impl ItemCategoryFilter {
    pub fn new() -> ItemCategoryFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn item_id(mut self, filter: EqualFilter<String>) -> Self {
        self.item_id = Some(filter);
        self
    }
}

pub struct ItemCategoryRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ItemCategoryRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ItemCategoryRepository { connection }
    }

    pub fn count(&self, filter: Option<ItemCategoryFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_one(
        &self,
        filter: ItemCategoryFilter,
    ) -> Result<Option<ItemCategory>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query_by_filter(
        &self,
        filter: ItemCategoryFilter,
    ) -> Result<Vec<ItemCategory>, RepositoryError> {
        self.query(Pagination::all(), Some(filter))
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<ItemCategoryFilter>,
    ) -> Result<Vec<ItemCategory>, RepositoryError> {
        let query = create_filtered_query(filter);

        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        // Debug diesel query
        //
        // println!(
        //    "{}",
        //     diesel::debug_query::<DBType, _>(&final_query).to_string()
        // );

        let result =
            final_query.load::<ItemCategoryJoinRow>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

fn to_domain(row: ItemCategoryJoinRow) -> ItemCategory {
    ItemCategory {
        item_category_join_row: row,
    }
}

type BoxedItemCategoryQuery = IntoBoxed<'static, item_category_join::table, DBType>;

fn create_filtered_query(filter: Option<ItemCategoryFilter>) -> BoxedItemCategoryQuery {
    let mut query = item_category_join::table.into_boxed();

    if let Some(f) = filter {
        let ItemCategoryFilter { id, item_id } = f;

        apply_equal_filter!(query, id, item_category_join::id);
        apply_equal_filter!(query, item_id, item_category_join::item_id);
    }

    query = query.filter(item_category_join::deleted_datetime.is_null());

    query
}

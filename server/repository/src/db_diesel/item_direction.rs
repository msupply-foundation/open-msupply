use super::{item_direction_row::item_direction, ItemDirectionRow, StorageConnection};

use crate::diesel_macros::apply_equal_filter;

use crate::{repository_error::RepositoryError, DBType, EqualFilter};
use diesel::{dsl::IntoBoxed, prelude::*};

pub type ItemDirection = ItemDirectionRow;

#[derive(Clone, Default, PartialEq, Debug)]
pub struct ItemDirectionFilter {
    pub id: Option<EqualFilter<String>>,
}

pub struct ItemDirectionRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ItemDirectionRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ItemDirectionRepository { connection }
    }

    pub fn count(&self, filter: Option<ItemDirectionFilter>) -> Result<i64, RepositoryError> {
        let query = Self::create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: ItemDirectionFilter,
    ) -> Result<Vec<ItemDirection>, RepositoryError> {
        self.query(Some(filter))
    }

    pub fn query(
        &self,
        filter: Option<ItemDirectionFilter>,
    ) -> Result<Vec<ItemDirection>, RepositoryError> {
        let query = Self::create_filtered_query(filter);

        let result = query.load::<ItemDirection>(self.connection.lock().connection())?;

        Ok(result)
    }

    pub fn create_filtered_query(filter: Option<ItemDirectionFilter>) -> BoxedItemDirectionQuery {
        let mut query = item_direction::table.into_boxed();

        if let Some(filter) = filter {
            apply_equal_filter!(query, filter.id, item_direction::id);
        }

        query
    }
}

type BoxedItemDirectionQuery = IntoBoxed<'static, item_direction::table, DBType>;

impl ItemDirectionFilter {
    pub fn new() -> ItemDirectionFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }
}

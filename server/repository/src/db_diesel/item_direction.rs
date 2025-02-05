use super::item_row::item;
use super::{item_direction_row::item_direction, ItemDirectionRow, StorageConnection};
use super::{item_link, ItemLinkRow, ItemRow};

use crate::diesel_macros::apply_equal_filter;

use crate::{repository_error::RepositoryError, DBType, EqualFilter};
use diesel::dsl::InnerJoin;
use diesel::{dsl::IntoBoxed, prelude::*};

#[derive(Clone, Default, PartialEq, Debug)]
pub struct ItemDirection {
    pub item_direction_row: ItemDirectionRow,
    pub item_row: ItemRow,
}

type ItemDirectionJoin = (ItemDirectionRow, (ItemLinkRow, ItemRow));

#[derive(Clone, Default, PartialEq, Debug)]
pub struct ItemDirectionFilter {
    pub id: Option<EqualFilter<String>>,
    pub item_id: Option<EqualFilter<String>>,
}

pub struct ItemDirectionRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ItemDirectionRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ItemDirectionRepository { connection }
    }

    pub fn count(&self, filter: Option<ItemDirectionFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

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
        let mut query = create_filtered_query(filter);
        query = query.order(item_direction::priority.asc());

        let result = query.load::<ItemDirectionJoin>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

fn to_domain((item_direction_row, (_, item_row)): ItemDirectionJoin) -> ItemDirection {
    ItemDirection {
        item_direction_row,
        item_row,
    }
}

type BoxedItemDirectionQuery = IntoBoxed<
    'static,
    InnerJoin<item_direction::table, InnerJoin<item_link::table, item::table>>,
    DBType,
>;

fn create_filtered_query(filter: Option<ItemDirectionFilter>) -> BoxedItemDirectionQuery {
    let mut query = item_direction::table
        .inner_join(item_link::table.inner_join(item::table))
        .into_boxed();

    if let Some(filter) = filter {
        apply_equal_filter!(query, filter.id, item_direction::id);
        apply_equal_filter!(query, filter.item_id, item::id);
    }

    query
}

impl ItemDirectionFilter {
    pub fn new() -> ItemDirectionFilter {
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

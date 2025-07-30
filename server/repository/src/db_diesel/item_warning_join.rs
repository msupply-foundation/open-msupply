use super::{
    item_warning_join_row::item_warning_join, warning_row::warning, ItemRow, ItemWarningJoinRow,
    StorageConnection, WarningRow,
};

use crate::{
    db_diesel::item_row::item, diesel_macros::apply_equal_filter, item_link,
    repository_error::RepositoryError, DBType, EqualFilter, ItemLinkRow,
};
use diesel::dsl::InnerJoin;
use diesel::{dsl::IntoBoxed, prelude::*};

#[derive(Clone, Default, PartialEq, Debug)]
pub struct ItemWarning {
    pub warning_row: WarningRow,
    pub item_row: ItemRow,
    pub item_warning_join_row: ItemWarningJoinRow,
}

type ItemWarningQueryJoin = (ItemWarningJoinRow, (ItemLinkRow, ItemRow), WarningRow);

#[derive(Clone, Default)]
pub struct ItemWarningJoinFilter {
    pub id: Option<EqualFilter<String>>,
    pub item_id: Option<EqualFilter<String>>,
    pub item_warning_join_id: Option<EqualFilter<String>>,
}

impl ItemWarningJoinFilter {
    pub fn new() -> ItemWarningJoinFilter {
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
    pub fn item_warning_join_id(mut self, filter: EqualFilter<String>) -> Self {
        self.item_warning_join_id = Some(filter);
        self
    }
}

pub struct ItemWarningJoinRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ItemWarningJoinRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ItemWarningJoinRepository { connection }
    }

    pub fn count(&self, filter: Option<ItemWarningJoinFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: ItemWarningJoinFilter,
    ) -> Result<Vec<ItemWarning>, RepositoryError> {
        self.query(Some(filter))
    }

    pub fn query(
        &self,
        filter: Option<ItemWarningJoinFilter>,
    ) -> Result<Vec<ItemWarning>, RepositoryError> {
        let mut query = create_filtered_query(filter);
        query = query.order(item_warning_join::id.asc());

        // Load results into the correct tuple type
        let result = query.load::<ItemWarningQueryJoin>(self.connection.lock().connection())?;

        let final_result = result.into_iter().map(to_domain).collect();
        Ok(final_result)
    }
}
fn to_domain(
    (item_warning_join_row, (_item_link_row, item_row), warning_row): ItemWarningQueryJoin,
) -> ItemWarning {
    ItemWarning {
        warning_row,
        item_row,
        item_warning_join_row,
    }
}

type BoxedItemWarningJoinQuery = IntoBoxed<
    'static,
    InnerJoin<
        InnerJoin<item_warning_join::table, InnerJoin<item_link::table, item::table>>,
        warning::table,
    >,
    DBType,
>;

fn create_filtered_query(filter: Option<ItemWarningJoinFilter>) -> BoxedItemWarningJoinQuery {
    let mut query = item_warning_join::table
        .inner_join(item_link::table.inner_join(item::table))
        .inner_join(warning::table)
        .into_boxed();

    if let Some(f) = filter {
        let ItemWarningJoinFilter {
            id,
            item_id,
            item_warning_join_id,
        } = f;

        apply_equal_filter!(query, id, item_warning_join::id);
        apply_equal_filter!(query, item_id, item::id);
        apply_equal_filter!(query, item_warning_join_id, item::id);
    }
    query
}

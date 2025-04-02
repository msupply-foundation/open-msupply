use super::{
    item_warning_link_row::item_warning_link, warning_row::warning, ItemRow, ItemWarningLinkRow,
    StorageConnection, WarningRow,
};

use crate::{
    db_diesel::item_row::item, diesel_macros::apply_equal_filter, item_link,
    repository_error::RepositoryError, DBType, EqualFilter, ItemLinkRow,
};
use diesel::dsl::InnerJoin;
use diesel::{dsl::IntoBoxed, prelude::*};

#[derive(Clone, Default, PartialEq, Debug)]
pub struct ItemWarningLink {
    pub warning_row: WarningRow,
    pub item_row: ItemRow,
    pub item_warning_link_row: ItemWarningLinkRow,
    // pub priority: bool,
}

type ItemWarningLinkJoin = (ItemWarningLinkRow, (ItemLinkRow, ItemRow), WarningRow);

#[derive(Clone, Default)]
pub struct ItemWarningLinkFilter {
    pub id: Option<EqualFilter<String>>,
    pub item_id: Option<EqualFilter<String>>,
    pub item_warning_link_id: Option<EqualFilter<String>>,
}

impl ItemWarningLinkFilter {
    pub fn new() -> ItemWarningLinkFilter {
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
    pub fn item_warning_link_id(mut self, filter: EqualFilter<String>) -> Self {
        self.item_warning_link_id = Some(filter);
        self
    }
}

pub struct ItemWarningLinkRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ItemWarningLinkRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ItemWarningLinkRepository { connection }
    }

    pub fn count(&self, filter: Option<ItemWarningLinkFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: ItemWarningLinkFilter,
    ) -> Result<Vec<ItemWarningLink>, RepositoryError> {
        self.query(Some(filter))
    }

    pub fn query_one(
        &self,
        filter: ItemWarningLinkFilter,
    ) -> Result<Option<ItemWarningLink>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query(
        &self,
        filter: Option<ItemWarningLinkFilter>,
    ) -> Result<Vec<ItemWarningLink>, RepositoryError> {
        let mut query = create_filtered_query(filter);
        query = query.order(item_warning_link::id.asc());

        // Load results into the correct tuple type
        let result = query.load::<ItemWarningLinkJoin>(self.connection.lock().connection())?;

        let final_result = result.into_iter().map(to_domain).collect();
        Ok(final_result)
    }
}
fn to_domain(
    (item_warning_link_row, (_item_link_row, item_row), warning_row): ItemWarningLinkJoin,
) -> ItemWarningLink {
    ItemWarningLink {
        warning_row,
        item_row,
        item_warning_link_row,
        // priority: item_warning_link_row.priority,
    }
}

type BoxedItemWarningLinkQuery = IntoBoxed<
    'static,
    InnerJoin<
        InnerJoin<item_warning_link::table, InnerJoin<item_link::table, item::table>>,
        warning::table,
    >,
    DBType,
>;

// query the warnings on an item via item link
fn create_filtered_query(filter: Option<ItemWarningLinkFilter>) -> BoxedItemWarningLinkQuery {
    let mut query = item_warning_link::table
        .inner_join(item_link::table.inner_join(item::table))
        .inner_join(warning::table)
        .into_boxed();

    if let Some(f) = filter {
        let ItemWarningLinkFilter {
            id,
            item_id,
            item_warning_link_id,
        } = f;

        apply_equal_filter!(query, id, item_warning_link::id);
        apply_equal_filter!(query, item_id, item::id);
        apply_equal_filter!(query, item_warning_link_id, item::id);
    }
    query
}

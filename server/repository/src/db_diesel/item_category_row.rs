use super::{category_row::category, item_row::item, StorageConnection};
use crate::diesel_macros::define_linked_tables;
use crate::{repository_error::RepositoryError, Upsert};

use chrono::NaiveDateTime;
use diesel::prelude::*;

define_linked_tables! {
    view: item_category_join = "item_category_join_view",
    core: item_category_join_with_links = "item_category_join",
    struct: ItemCategoryJoinRow,
    repo: ItemCategoryJoinRowRepository,
    shared: {
        category_id -> Text,
        deleted_datetime -> Nullable<Timestamp>,
    },
    links: {
        item_link_id -> item_id,
    },
    optional_links: {
    }
}

joinable!(item_category_join -> category (category_id));
joinable!(item_category_join -> item (item_id));
allow_tables_to_appear_in_same_query!(item_category_join, category);
allow_tables_to_appear_in_same_query!(item_category_join, item);

#[derive(Clone, Queryable, Debug, PartialEq, Eq, Default)]
#[diesel(table_name = item_category_join)]
pub struct ItemCategoryJoinRow {
    pub id: String,
    pub category_id: String,
    pub deleted_datetime: Option<NaiveDateTime>,
    // Resolved from item_link - must be last to match view column order
    pub item_id: String,
}

pub struct ItemCategoryJoinRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ItemCategoryJoinRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ItemCategoryJoinRowRepository { connection }
    }

    pub fn upsert_one(
        &self,
        item_category_join_row: &ItemCategoryJoinRow,
    ) -> Result<(), RepositoryError> {
        self._upsert(item_category_join_row)?;
        Ok(())
    }

    pub fn find_one_by_id(
        &self,
        item_category_join_id: &str,
    ) -> Result<Option<ItemCategoryJoinRow>, RepositoryError> {
        let result = item_category_join::table
            .filter(item_category_join::id.eq(item_category_join_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, item_category_join_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(
            item_category_join_with_links::table
                .filter(item_category_join_with_links::id.eq(item_category_join_id)),
        )
        .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for ItemCategoryJoinRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        ItemCategoryJoinRowRepository::new(con).upsert_one(self)?;
        Ok(None)
    }

    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            ItemCategoryJoinRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

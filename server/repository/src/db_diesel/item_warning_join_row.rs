use super::{item_link, item_row::item, warning_row::warning};
use crate::{RepositoryError, StorageConnection, Upsert};

use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    item_warning_join (id) {
        id -> Text,
        item_link_id -> Text,
        warning_id -> Text,
        priority -> Bool,
    }
}

joinable!(item_warning_join -> warning (warning_id));
joinable!(item_warning_join -> item_link (item_link_id));
allow_tables_to_appear_in_same_query!(item_warning_join, item_link);
allow_tables_to_appear_in_same_query!(item_warning_join, item);
allow_tables_to_appear_in_same_query!(item_warning_join, warning);

#[derive(
    Clone, Default, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize,
)]
#[diesel(table_name = item_warning_join)]
#[diesel(treat_none_as_null = true)]
pub struct ItemWarningJoinRow {
    pub id: String,
    pub item_link_id: String,
    pub warning_id: String,
    pub priority: bool,
}

pub struct ItemWarningJoinRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ItemWarningJoinRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ItemWarningJoinRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &ItemWarningJoinRow) -> Result<(), RepositoryError> {
        diesel::insert_into(item_warning_join::table)
            .values(row)
            .on_conflict(item_warning_join::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_one_by_id(
        &self,
        item_warning_join_id: &str,
    ) -> Result<Option<ItemWarningJoinRow>, RepositoryError> {
        let result = item_warning_join::table
            .filter(item_warning_join::id.eq(item_warning_join_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }
}

impl Upsert for ItemWarningJoinRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        ItemWarningJoinRowRepository::new(con).upsert_one(self)?;
        Ok(None) // Table not in Changelog
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            ItemWarningJoinRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

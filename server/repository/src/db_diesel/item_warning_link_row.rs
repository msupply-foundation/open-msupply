use super::item_link;
use crate::Delete;
use crate::RepositoryError;
use crate::StorageConnection;
use crate::Upsert;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    item_warning_link (id) {
        id -> Text,
        item_link_id -> Text,
        warning_id -> Text,
        priority -> Bool,
    }
}
joinable!(item_warning_link -> item_link (item_link_id));
allow_tables_to_appear_in_same_query!(item_warning_link, item_link);

#[derive(
    Clone, Default, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize,
)]
#[diesel(table_name = item_warning_link)]
#[diesel(treat_none_as_null = true)]
pub struct ItemWarningLinkRow {
    pub id: String,
    pub item_link_id: String,
    pub warning_id: String,
    pub priority: bool,
}

pub struct ItemWarningLinkRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ItemWarningLinkRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ItemWarningLinkRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &ItemWarningLinkRow) -> Result<(), RepositoryError> {
        diesel::insert_into(item_warning_link::table)
            .values(row)
            .on_conflict(item_warning_link::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn insert_one_or_ignore(&self, row: &ItemWarningLinkRow) -> Result<(), RepositoryError> {
        diesel::insert_into(item_warning_link::table)
            .values(row)
            .on_conflict(item_warning_link::id)
            .do_nothing()
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_one_by_id(
        &self,
        item_warning_link_id: &str,
    ) -> Result<Option<ItemWarningLinkRow>, RepositoryError> {
        let result = item_warning_link::table
            .filter(item_warning_link::id.eq(item_warning_link_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }
    pub fn find_many_by_item_id(
        &self,
        item_link_id: &str,
    ) -> Result<Vec<ItemWarningLinkRow>, RepositoryError> {
        let result = item_warning_link::table
            .filter(item_warning_link::item_link_id.eq(item_link_id))
            .load::<ItemWarningLinkRow>(self.connection.lock().connection())?;

        Ok(result)
    }

    pub fn delete(&self, item_warning_link_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(
            item_warning_link::table.filter(item_warning_link::id.eq(item_warning_link_id)),
        )
        .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for ItemWarningLinkRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        ItemWarningLinkRowRepository::new(con).upsert_one(self)?;
        Ok(None)
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            ItemWarningLinkRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[derive(Debug)]
pub struct ItemWarningLinkRowDelete(pub String);
impl Delete for ItemWarningLinkRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        ItemWarningLinkRowRepository::new(con).delete(&self.0)?;
        Ok(None)
    }

    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            ItemWarningLinkRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

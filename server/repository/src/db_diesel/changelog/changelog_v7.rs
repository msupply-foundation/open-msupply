use super::changelog::changelog;
use crate::{ChangelogTableName, RepositoryError, RowActionType, StorageConnection};
use diesel::prelude::*;

#[derive(Debug, PartialEq, Insertable, Default)]
#[diesel(table_name = changelog)]
pub struct ChangeLogInsertRowV7 {
    #[diesel(deserialize_as = String)]
    pub table_name: ChangelogTableName,
    pub record_id: String,
    pub row_action: RowActionType,
    pub name_link_id: Option<String>,
    pub store_id: Option<String>,
    pub source_site_id: Option<i32>,
}

impl ChangeLogInsertRowV7 {
    pub fn insert(&self, connection: &StorageConnection) -> Result<(), RepositoryError> {
        // Insert the record, and then return the cursor of the inserted record
        // SQLite docs say this is safe if you don't have different threads sharing a single connection
        diesel::insert_into(changelog::table)
            .values(self)
            .execute(connection.lock().connection())?;
        Ok(())
    }
}

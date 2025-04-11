use super::{item_link, item_row::item, StorageConnection};
use crate::{RepositoryError, Upsert};

use diesel::prelude::*;

table! {
  warning (id) {
    id -> Text,
    warning_text -> Text,
    code  -> Text,
  }

}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default)]
#[diesel(table_name = warning)]
pub struct WarningRow {
    pub id: String,
    pub warning_text: String,
    pub code: String,
}

allow_tables_to_appear_in_same_query!(warning, item_link);
allow_tables_to_appear_in_same_query!(warning, item);

pub struct WarningRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> WarningRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        WarningRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &WarningRow) -> Result<(), RepositoryError> {
        diesel::insert_into(warning::table)
            .values(row)
            .on_conflict(warning::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_one_by_id(&self, row_id: &str) -> Result<Option<WarningRow>, RepositoryError> {
        let result = warning::table
            .filter(warning::id.eq(row_id))
            .first(self.connection.lock().connection())
            .optional();
        result.map_err(RepositoryError::from)
    }
}

impl Upsert for WarningRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        WarningRowRepository::new(con).upsert_one(self)?;
        Ok(None) // Table not in Changelog
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            WarningRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

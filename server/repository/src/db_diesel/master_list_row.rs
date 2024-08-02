use super::{
    item_link_row::item_link, master_list_row::master_list::dsl::*, name_link_row::name_link,
    StorageConnection,
};

use crate::{repository_error::RepositoryError, Delete, Upsert};

use diesel::prelude::*;

table! {
    master_list (id) {
        id -> Text,
        name -> Text,
        code -> Text,
        description -> Text,
        is_active -> Bool,
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, Eq, AsChangeset, Default)]
#[diesel(table_name = master_list)]
pub struct MasterListRow {
    pub id: String,
    pub name: String,
    pub code: String,
    pub description: String,
    pub is_active: bool,
}

allow_tables_to_appear_in_same_query!(master_list, item_link);
allow_tables_to_appear_in_same_query!(master_list, name_link);

pub struct MasterListRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> MasterListRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        MasterListRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &MasterListRow) -> Result<(), RepositoryError> {
        diesel::insert_into(master_list)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_one_by_id(
        &self,
        master_list_id: &str,
    ) -> Result<Option<MasterListRow>, RepositoryError> {
        let result = master_list
            .filter(id.eq(master_list_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, master_list_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(master_list.filter(id.eq(master_list_id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for MasterListRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        MasterListRowRepository::new(con).upsert_one(self)?;
        Ok(None) // Table not in Changelog
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            MasterListRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[derive(Debug, Clone)]
pub struct MasterListRowDelete(pub String);
impl Delete for MasterListRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        MasterListRowRepository::new(con).delete(&self.0)?;
        Ok(None) // Table not in Changelog
    }

    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            MasterListRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

use super::{
    item_link_row::item_link, master_list_name_join::master_list_name_join::dsl::*,
    master_list_row::master_list, name_link_row::name_link, StorageConnection,
};

use crate::repository_error::RepositoryError;
use crate::{Delete, Upsert};
use diesel::prelude::*;

table! {
    master_list_name_join (id) {
        id -> Text,
        master_list_id -> Text,
        name_link_id -> Text,
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, Eq, AsChangeset)]
#[diesel(table_name = master_list_name_join)]
pub struct MasterListNameJoinRow {
    pub id: String,
    pub master_list_id: String,
    pub name_link_id: String,
}

joinable!(master_list_name_join -> master_list (master_list_id));
joinable!(master_list_name_join -> name_link (name_link_id));
allow_tables_to_appear_in_same_query!(master_list_name_join, item_link);
allow_tables_to_appear_in_same_query!(master_list_name_join, name_link);

pub struct MasterListNameJoinRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> MasterListNameJoinRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        MasterListNameJoinRepository { connection }
    }

    pub fn upsert_one(&self, row: &MasterListNameJoinRow) -> Result<(), RepositoryError> {
        diesel::insert_into(master_list_name_join)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_one_by_id(
        &self,
        record_id: &str,
    ) -> Result<Option<MasterListNameJoinRow>, RepositoryError> {
        let result = master_list_name_join
            .filter(id.eq(record_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, record_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(master_list_name_join.filter(id.eq(record_id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct MasterListNameJoinRowDelete(pub String);
impl Delete for MasterListNameJoinRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        MasterListNameJoinRepository::new(con).delete(&self.0)?;
        Ok(None) // Table not in Changelog
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            MasterListNameJoinRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for MasterListNameJoinRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        MasterListNameJoinRepository::new(con).upsert_one(self)?;
        Ok(None) // Table not in Changelog
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            MasterListNameJoinRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

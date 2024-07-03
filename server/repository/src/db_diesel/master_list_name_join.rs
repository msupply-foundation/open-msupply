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

#[derive(
    Clone,
    Insertable,
    Queryable,
    Debug,
    PartialEq,
    Eq,
    AsChangeset,
    serde::Serialize,
    serde::Deserialize,
)]
#[table_name = "master_list_name_join"]
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

    #[cfg(feature = "postgres")]
    fn _upsert_one(&self, row: &MasterListNameJoinRow) -> Result<(), RepositoryError> {
        diesel::insert_into(master_list_name_join)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    fn _upsert_one(&self, row: &MasterListNameJoinRow) -> Result<(), RepositoryError> {
        diesel::replace_into(master_list_name_join)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub async fn find_one_by_id_old(
        &self,
        record_id: &str,
    ) -> Result<MasterListNameJoinRow, RepositoryError> {
        let result = master_list_name_join
            .filter(id.eq(record_id))
            .first(&self.connection.connection)?;
        Ok(result)
    }

    pub fn find_one_by_id(
        &self,
        record_id: &str,
    ) -> Result<Option<MasterListNameJoinRow>, RepositoryError> {
        let result = master_list_name_join
            .filter(id.eq(record_id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, record_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(master_list_name_join.filter(id.eq(record_id)))
            .execute(&self.connection.connection)?;
        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct MasterListNameJoinRowDelete(pub String);
impl Delete for MasterListNameJoinRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        MasterListNameJoinRepository::new(con).delete(&self.0)
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            MasterListNameJoinRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

crate::create_central_upsert_trait!(
    MasterListNameJoinRow,
    MasterListNameJoinRepository,
    crate::ChangelogTableName::MasterListNameJoin
);

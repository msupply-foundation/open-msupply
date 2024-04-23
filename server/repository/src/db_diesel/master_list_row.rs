use super::{
    item_link_row::item_link, master_list_row::master_list::dsl::*, name_link_row::name_link,
    StorageConnection,
};

use crate::{repository_error::RepositoryError, Upsert};

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
#[table_name = "master_list"]
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

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &MasterListRow) -> Result<(), RepositoryError> {
        diesel::insert_into(master_list)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &MasterListRow) -> Result<(), RepositoryError> {
        diesel::replace_into(master_list)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(
        &self,
        master_list_id: &str,
    ) -> Result<Option<MasterListRow>, RepositoryError> {
        let result = master_list
            .filter(id.eq(master_list_id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, master_list_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(master_list.filter(id.eq(master_list_id)))
            .execute(&self.connection.connection)?;
        Ok(())
    }
}

impl Upsert for MasterListRow {
    fn upsert_sync(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        MasterListRowRepository::new(con).upsert_one(self)
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            MasterListRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

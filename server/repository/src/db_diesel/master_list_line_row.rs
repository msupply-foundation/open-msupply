use super::{
    item_link_row::item_link, master_list_line_row::master_list_line::dsl::*,
    master_list_row::master_list, name_link_row::name_link, StorageConnection,
};
use crate::repository_error::RepositoryError;
use crate::{Delete, Upsert};

use diesel::prelude::*;

table! {
    master_list_line (id) {
        id -> Text,
        item_link_id -> Text,
        master_list_id -> Text,
    }
}

joinable!(master_list_line -> master_list (master_list_id));
joinable!(master_list_line -> item_link (item_link_id));
allow_tables_to_appear_in_same_query!(master_list_line, item_link);
allow_tables_to_appear_in_same_query!(master_list_line, name_link);

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, Eq, AsChangeset)]
#[diesel(table_name = master_list_line)]
pub struct MasterListLineRow {
    pub id: String,
    pub item_link_id: String,
    pub master_list_id: String,
}

pub struct MasterListLineRowRepository<'a> {
    connection: &'a mut StorageConnection,
}

impl<'a> MasterListLineRowRepository<'a> {
    pub fn new(connection: &'a mut StorageConnection) -> Self {
        MasterListLineRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&mut self, row: &MasterListLineRow) -> Result<(), RepositoryError> {
        diesel::insert_into(master_list_line)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(&mut self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&mut self, row: &MasterListLineRow) -> Result<(), RepositoryError> {
        diesel::replace_into(master_list_line)
            .values(row)
            .execute(&mut self.connection.connection)?;
        Ok(())
    }

    pub async fn find_one_by_id(
        &mut self,
        line_id: &str,
    ) -> Result<MasterListLineRow, RepositoryError> {
        let result = master_list_line
            .filter(id.eq(line_id))
            .first(&mut self.connection.connection)?;
        Ok(result)
    }

    pub fn find_one_by_id_option(
        &mut self,
        line_id: &str,
    ) -> Result<Option<MasterListLineRow>, RepositoryError> {
        let result = master_list_line
            .filter(id.eq(line_id))
            .first(&mut self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn delete(&mut self, line_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(master_list_line.filter(id.eq(line_id)))
            .execute(&mut self.connection.connection)?;
        Ok(())
    }
}

impl Upsert for MasterListLineRow {
    fn upsert_sync(&self, con: &mut StorageConnection) -> Result<(), RepositoryError> {
        MasterListLineRowRepository::new(con).upsert_one(self)
    }

    // Test only
    fn assert_upserted(&self, con: &mut StorageConnection) {
        assert_eq!(
            MasterListLineRowRepository::new(con).find_one_by_id_option(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[derive(Debug, Clone)]
pub struct MasterListLineRowDelete(pub String);
impl Delete for MasterListLineRowDelete {
    fn delete(&self, con: &mut StorageConnection) -> Result<(), RepositoryError> {
        MasterListLineRowRepository::new(con).delete(&self.0)
    }
    // Test only
    fn assert_deleted(&self, con: &mut StorageConnection) {
        assert_eq!(
            MasterListLineRowRepository::new(con).find_one_by_id_option(&self.0),
            Ok(None)
        )
    }
}

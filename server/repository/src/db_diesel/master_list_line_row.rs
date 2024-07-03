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
#[table_name = "master_list_line"]
pub struct MasterListLineRow {
    pub id: String,
    pub item_link_id: String,
    pub master_list_id: String,
}

pub struct MasterListLineRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> MasterListLineRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        MasterListLineRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    fn _upsert_one(&self, row: &MasterListLineRow) -> Result<(), RepositoryError> {
        diesel::insert_into(master_list_line)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    fn _upsert_one(&self, row: &MasterListLineRow) -> Result<(), RepositoryError> {
        diesel::replace_into(master_list_line)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub async fn find_one_by_id_old(
        &self,
        line_id: &str,
    ) -> Result<MasterListLineRow, RepositoryError> {
        let result = master_list_line
            .filter(id.eq(line_id))
            .first(&self.connection.connection)?;
        Ok(result)
    }

    pub fn find_one_by_id(
        &self,
        line_id: &str,
    ) -> Result<Option<MasterListLineRow>, RepositoryError> {
        let result = master_list_line
            .filter(id.eq(line_id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, line_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(master_list_line.filter(id.eq(line_id)))
            .execute(&self.connection.connection)?;
        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct MasterListLineRowDelete(pub String);
impl Delete for MasterListLineRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        MasterListLineRowRepository::new(con).delete(&self.0)
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            MasterListLineRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

crate::create_central_upsert_trait!(
    MasterListLineRow,
    MasterListLineRowRepository,
    crate::ChangelogTableName::MasterListLine
);

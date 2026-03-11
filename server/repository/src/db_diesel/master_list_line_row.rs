use super::{
    item_row::item, master_list_line_row::master_list_line::dsl::*,
    master_list_row::master_list, StorageConnection,
};
use crate::diesel_macros::define_linked_tables;
use crate::repository_error::RepositoryError;
use crate::{Delete, Upsert};

use diesel::prelude::*;

define_linked_tables! {
    view: master_list_line = "master_list_line_view",
    core: master_list_line_with_links = "master_list_line",
    struct: MasterListLineRow,
    repo: MasterListLineRowRepository,
    shared: {
        master_list_id -> Text,
        price_per_unit -> Nullable<Double>,
    },
    links: {
        item_link_id -> item_id,
    },
    optional_links: {
    }
}

joinable!(master_list_line -> item (item_id));
joinable!(master_list_line -> master_list (master_list_id));

#[derive(Clone, Queryable, Debug, Default, PartialEq)]
#[diesel(table_name = master_list_line)]
pub struct MasterListLineRow {
    pub id: String,
    pub master_list_id: String,
    pub price_per_unit: Option<f64>,
    // Resolved from item_link - must be last to match view column order
    pub item_id: String,
}

pub struct MasterListLineRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> MasterListLineRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        MasterListLineRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &MasterListLineRow) -> Result<(), RepositoryError> {
        self._upsert(row)?;
        Ok(())
    }

    pub fn find_one_by_id(
        &self,
        line_id: &str,
    ) -> Result<Option<MasterListLineRow>, RepositoryError> {
        let result = master_list_line
            .filter(id.eq(line_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, line_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(
            master_list_line_with_links::table.filter(master_list_line_with_links::id.eq(line_id)),
        )
        .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for MasterListLineRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        MasterListLineRowRepository::new(con).upsert_one(self)?;
        Ok(None) // Table not in Changelog
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            MasterListLineRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[derive(Debug, Clone)]
pub struct MasterListLineRowDelete(pub String);
impl Delete for MasterListLineRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        MasterListLineRowRepository::new(con).delete(&self.0)?;
        Ok(None) // Table not in Changelog
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            MasterListLineRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

use super::{
    cold_storage_type_row::cold_storage_type::dsl as cold_storage_type_dsl, StorageConnection,
};
use crate::{repository_error::RepositoryError, Upsert};
use crate::{ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType};

use diesel::prelude::*;

table! {
    cold_storage_type (id) {
        id -> Text,
        name -> Text,
        min_temperature -> Double,
        max_temperature -> Double,
    }
}

#[derive(
    Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, serde::Serialize,
)]
#[diesel(table_name = cold_storage_type)]
pub struct ColdStorageTypeRow {
    pub id: String,
    pub name: String,
    pub min_temperature: f64,
    pub max_temperature: f64,
}

pub struct ColdStorageTypeRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ColdStorageTypeRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ColdStorageTypeRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &ColdStorageTypeRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(cold_storage_type_dsl::cold_storage_type)
            .values(row)
            .on_conflict(cold_storage_type_dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        self.insert_changelog(row, RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row: &ColdStorageTypeRow,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::ColdStorageType,
            record_id: row.id.clone(),
            row_action: action,
            store_id: None,
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<ColdStorageTypeRow>, RepositoryError> {
        let result = cold_storage_type_dsl::cold_storage_type
            .filter(cold_storage_type_dsl::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(
            cold_storage_type_dsl::cold_storage_type.filter(cold_storage_type_dsl::id.eq(id)),
        )
        .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for ColdStorageTypeRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = ColdStorageTypeRowRepository::new(con).upsert_one(self)?;
        Ok(Some(change_log_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            ColdStorageTypeRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

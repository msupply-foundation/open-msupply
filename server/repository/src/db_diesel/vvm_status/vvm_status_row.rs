use super::vvm_status_row::vvm_status::dsl::*;
use crate::db_diesel::{
    barcode_row::barcode, item_link_row::item_link, item_row::item,
    item_variant::item_variant_row::item_variant, location_row::location, name_link,
    name_row::name, stock_line_row::stock_line,
};
use crate::Delete;
use crate::RepositoryError;
use crate::StorageConnection;
use crate::Upsert;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    vvm_status (id) {
        id -> Text,
        description -> Text,
        code -> Text,
        level -> Integer,
        is_active -> Bool,
        unusable -> Bool,
        reason_id -> Nullable<Text>,
    }
}

allow_tables_to_appear_in_same_query!(vvm_status, item_link);
allow_tables_to_appear_in_same_query!(vvm_status, item);
allow_tables_to_appear_in_same_query!(vvm_status, location);
allow_tables_to_appear_in_same_query!(vvm_status, barcode);
allow_tables_to_appear_in_same_query!(vvm_status, item_variant);
allow_tables_to_appear_in_same_query!(vvm_status, name_link);
allow_tables_to_appear_in_same_query!(vvm_status, name);
allow_tables_to_appear_in_same_query!(vvm_status, stock_line);

#[derive(
    Clone, Default, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize,
)]
#[diesel(table_name = vvm_status)]
#[diesel(treat_none_as_null = true)]
pub struct VVMStatusRow {
    pub id: String,
    pub description: String,
    pub code: String,
    pub level: i32,
    pub is_active: bool,
    pub unusable: bool,
    pub reason_id: Option<String>,
}

pub struct VVMStatusRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> VVMStatusRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        VVMStatusRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &VVMStatusRow) -> Result<(), RepositoryError> {
        diesel::insert_into(vvm_status)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_many_by_ids(&self, ids: &[String]) -> Result<Vec<VVMStatusRow>, RepositoryError> {
        vvm_status::table
            .filter(id.eq_any(ids))
            .load(self.connection.lock().connection())
            .map_err(RepositoryError::from)
    }

    pub fn find_all_active(&self) -> Result<Vec<VVMStatusRow>, RepositoryError> {
        let result = vvm_status::table
            .filter(vvm_status::is_active.eq(true))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_one_by_id(
        &self,
        vvm_status_id: &str,
    ) -> Result<Option<VVMStatusRow>, RepositoryError> {
        let result = vvm_status
            .filter(id.eq(vvm_status_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, vvm_status_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(vvm_status.filter(id.eq(vvm_status_id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for VVMStatusRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        VVMStatusRowRepository::new(con).upsert_one(self)?;
        Ok(None) // Table not in Changelog
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            VVMStatusRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[derive(Debug)]
pub struct VVMStatusRowDelete(pub String);
impl Delete for VVMStatusRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        VVMStatusRowRepository::new(con).delete(&self.0)?;
        Ok(None)
    }

    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            VVMStatusRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

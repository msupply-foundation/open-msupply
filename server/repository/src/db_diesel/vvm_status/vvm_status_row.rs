use super::vvm_status_row::vvm_status::dsl::*;
use crate::db_diesel::{
    barcode_row::barcode, item_link_row::item_link, item_row::item,
    item_variant::item_variant_row::item_variant, location_row::location,
    name_row::name, stock_line_row::stock_line,
};
use crate::{
    diesel_macros::define_batch_table, ChangelogRepository, RepositoryError, RowActionType,
    SourceSiteId, StorageConnection,
};
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

define_batch_table! {
    struct: VVMStatusRow,
    repo: VVMStatusRowRepository,
    table: vvm_status (id) {
        id -> Text,
        description -> Text,
        code -> Text,
        priority -> Integer,
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
    pub priority: i32,
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

    pub(crate) fn _upsert_one(&self, row: &VVMStatusRow) -> Result<(), RepositoryError> {
        diesel::insert_into(vvm_status)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &VVMStatusRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = VVMStatusRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
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
            .order(vvm_status::priority.asc())
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

    pub fn check_exists_by_id(&self, vvm_status_id: &str) -> Result<bool, RepositoryError> {
        let exists: bool = diesel::select(diesel::dsl::exists(
            vvm_status::table.filter(vvm_status::id.eq(vvm_status_id)),
        ))
        .get_result(self.connection.lock().connection())?;
        Ok(exists)
    }

    fn _delete(&self, vvm_status_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(vvm_status.filter(id.eq(vvm_status_id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub(crate) fn _batch_delete(&self, ids: &[&str]) -> Result<(), RepositoryError> {
        if ids.is_empty() {
            return Ok(());
        }
        diesel::delete(vvm_status.filter(id.eq_any(ids)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

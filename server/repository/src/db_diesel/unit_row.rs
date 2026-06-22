use super::{unit_row::unit::dsl::*, StorageConnection};
use crate::{
    db_diesel::changelog::ChangelogRepository, diesel_macros::define_batch_table,
    repository_error::RepositoryError, ChangelogTableName, RowActionType, SourceSiteId,
};
use diesel::prelude::*;

define_batch_table! {
    struct: UnitRow,
    repo: UnitRowRepository,
    table: unit (id) {
        id -> Text,
        name -> Text,
        description -> Nullable<Text>,
        index -> Integer,
        is_active -> Bool,
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
    Default,
    serde::Serialize,
    serde::Deserialize,
)]
#[diesel(table_name = unit)]
pub struct UnitRow {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub index: i32,
    pub is_active: bool,
}

impl UnitRow {
    pub fn table_name() -> ChangelogTableName {
        ChangelogTableName::Unit
    }
    pub fn record_id(&self) -> String {
        self.id.clone()
    }
}

pub struct UnitRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> UnitRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        UnitRowRepository { connection }
    }

    pub(crate) fn _upsert_one(&self, row: &UnitRow) -> Result<(), RepositoryError> {
        diesel::insert_into(unit)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &UnitRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = UnitRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub async fn find_active_by_id(&self, unit_id: &str) -> Result<UnitRow, RepositoryError> {
        let result = unit
            .filter(id.eq(unit_id))
            .first(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_one_by_id(&self, unit_id: &str) -> Result<Option<UnitRow>, RepositoryError> {
        let result = unit
            .filter(id.eq(unit_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn check_exists_by_id(&self, unit_id: &str) -> Result<bool, RepositoryError> {
        let exists: bool = diesel::select(diesel::dsl::exists(
            unit::table.filter(unit::id.eq(unit_id)),
        ))
        .get_result(self.connection.lock().connection())?;
        Ok(exists)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<UnitRow>, RepositoryError> {
        let result = unit
            .filter(id.eq_any(ids))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_inactive_by_id(&self, unit_id: &str) -> Result<Option<UnitRow>, RepositoryError> {
        let result = unit
            .filter(id.eq(unit_id).and(is_active.eq(false)))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    fn _mark_deleted(&self, unit_id: &str) -> Result<(), RepositoryError> {
        diesel::update(unit.filter(id.eq(unit_id)))
            .set(is_active.eq(false))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn mark_deleted(&self, unit_id: &str) -> Result<(), RepositoryError> {
        self._mark_deleted(unit_id)?;
        let changelog = UnitRow::generate_changelog(
            unit_id.to_string(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub(crate) fn delete_no_changelog(&self, record_id: &str) -> Result<(), RepositoryError> {
        self._mark_deleted(record_id)
    }

    pub(crate) fn _batch_delete(&self, ids: &[&str]) -> Result<(), RepositoryError> {
        if ids.is_empty() {
            return Ok(());
        }
        diesel::update(unit.filter(id.eq_any(ids)))
            .set(is_active.eq(false))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

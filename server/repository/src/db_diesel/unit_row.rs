use super::{unit_row::unit::dsl::*, StorageConnection};
use crate::{
    db_diesel::changelog::ChangelogRepository, repository_error::RepositoryError,
    ChangelogSyncType, ChangelogTableName, RowActionType, SourceSiteId, Upsert,
};
use diesel::prelude::*;

table! {
    unit (id) {
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

    fn _upsert_one(&self, row: &UnitRow) -> Result<(), RepositoryError> {
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
}

#[derive(Debug, Clone)]
pub struct UnitRowDelete(pub String);
impl Upsert for UnitRowDelete {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let repo = UnitRowRepository::new(con);
        repo._mark_deleted(&self.0)?;
        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => UnitRow::generate_changelog(
                self.0.clone(),
                con,
                RowActionType::Upsert,
                SourceSiteId::SourceSiteId(source_site_id),
            )?,
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }
    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert!(matches!(
            UnitRowRepository::new(con).find_one_by_id(&self.0),
            Ok(Some(UnitRow {
                is_active: false,
                ..
            })) | Ok(None)
        ));
    }
}

impl Upsert for UnitRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        UnitRowRepository::new(con)._upsert_one(self)?;
        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => UnitRow::generate_changelog(
                self.id.clone(),
                con,
                RowActionType::Upsert,
                SourceSiteId::SourceSiteId(source_site_id),
            )?,
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }
    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            UnitRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

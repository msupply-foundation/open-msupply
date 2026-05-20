use chrono::NaiveDateTime;
use program::deleted_datetime;

use crate::{
    db_diesel::{
        context_row::context, document::document, item_link_row::item_link,
        master_list_row::master_list,
    },
    repository_error::RepositoryError,
    ChangelogRepository, ChangelogSyncType, Delete, RowActionType, SourceSiteId, StorageConnection,
    Upsert,
};

use diesel::prelude::*;

table! {
    program (id) {
        id -> Text,
        master_list_id -> Nullable<Text>,
        name -> Text,
        context_id -> Text,
        is_immunisation -> Bool,
        elmis_code -> Nullable<Text>,
        deleted_datetime -> Nullable<Timestamp>,
    }
}

joinable!(program -> master_list (master_list_id));
joinable!(program -> context (context_id));
allow_tables_to_appear_in_same_query!(program, document);
allow_tables_to_appear_in_same_query!(program, item_link);

#[derive(
    Clone,
    Queryable,
    Insertable,
    AsChangeset,
    Debug,
    PartialEq,
    Eq,
    Default,
    serde::Serialize,
    serde::Deserialize,
)]
#[diesel(table_name = program)]
#[diesel(treat_none_as_null = true)]
pub struct ProgramRow {
    pub id: String, // Master list id
    pub master_list_id: Option<String>,
    pub name: String,
    pub context_id: String,
    pub is_immunisation: bool,
    pub elmis_code: Option<String>,
    pub deleted_datetime: Option<NaiveDateTime>,
}

pub struct ProgramRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ProgramRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ProgramRowRepository { connection }
    }

    fn _upsert_one(&self, row: &ProgramRow) -> Result<(), RepositoryError> {
        diesel::insert_into(program::table)
            .values(row)
            .on_conflict(program::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &ProgramRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = ProgramRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<ProgramRow>, RepositoryError> {
        let result = program::table
            .filter(program::id.eq(id))
            .filter(deleted_datetime.is_null())
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<ProgramRow>, RepositoryError> {
        Ok(program::table
            .filter(program::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    fn _mark_deleted(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::update(program::table.filter(program::id.eq(id)))
            .set(deleted_datetime.eq(Some(chrono::Utc::now().naive_utc())))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn mark_deleted(&self, id: &str) -> Result<(), RepositoryError> {
        self._mark_deleted(id)?;
        let changelog = ProgramRow::generate_changelog(
            id.to_string(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }
}

impl Upsert for ProgramRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        ProgramRowRepository::new(con)._upsert_one(self)?;

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => Self::generate_changelog(
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
            ProgramRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[derive(Debug, Clone)]
pub struct ProgramRowDelete(pub String);
impl Delete for ProgramRowDelete {
    fn delete_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let repo = ProgramRowRepository::new(con);

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => ProgramRow::generate_changelog(
                self.0.clone(),
                con,
                RowActionType::Upsert,
                SourceSiteId::SourceSiteId(source_site_id),
            )?,
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        repo._mark_deleted(&self.0)?;
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert!(matches!(
            ProgramRowRepository::new(con).find_one_by_id(&self.0),
            Ok(Some(ProgramRow {
                deleted_datetime: Some(_),
                ..
            })) | Ok(None)
        ));
    }
}

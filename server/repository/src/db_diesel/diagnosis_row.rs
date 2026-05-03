use super::diagnosis_row::diagnosis::dsl::*;
use crate::{
    ChangelogRepository, ChangelogSyncType, Delete, RepositoryError, RowActionType, SourceSiteId,
    StorageConnection, Upsert,
};
use chrono::NaiveDate;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    diagnosis (id) {
        id -> Text,
        code -> Text,
        description -> Text,
        notes -> Nullable<Text>,
        valid_till -> Nullable<Date>,
    }
}

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize,
)]
#[diesel(table_name = diagnosis)]
#[diesel(treat_none_as_null = true)]
pub struct DiagnosisRow {
    pub id: String,
    pub code: String,
    pub description: String,
    pub notes: Option<String>,
    pub valid_till: Option<NaiveDate>,
}

pub struct DiagnosisRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> DiagnosisRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        DiagnosisRowRepository { connection }
    }

    fn _upsert_one(&self, row: &DiagnosisRow) -> Result<(), RepositoryError> {
        diesel::insert_into(diagnosis)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &DiagnosisRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = DiagnosisRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_all(&self) -> Result<Vec<DiagnosisRow>, RepositoryError> {
        let result = diagnosis.load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_one_by_id(
        &self,
        diagnosis_id: &str,
    ) -> Result<Option<DiagnosisRow>, RepositoryError> {
        let result = diagnosis
            .filter(id.eq(diagnosis_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<DiagnosisRow>, RepositoryError> {
        Ok(diagnosis
            .filter(id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    fn _delete(&self, diagnosis_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(diagnosis.filter(id.eq(diagnosis_id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn delete(&self, diagnosis_id: &str) -> Result<(), RepositoryError> {
        self._delete(diagnosis_id)?;
        let changelog = DiagnosisRow::generate_changelog(
            diagnosis_id.to_string(),
            self.connection,
            RowActionType::Delete,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }
}

impl Upsert for DiagnosisRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        DiagnosisRowRepository::new(con)._upsert_one(self)?;

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
            DiagnosisRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[derive(Debug, Clone)]
pub struct DiagnosisRowDelete(pub String);
impl Delete for DiagnosisRowDelete {
    fn delete_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let repo = DiagnosisRowRepository::new(con);

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => DiagnosisRow::generate_changelog(
                self.0.clone(),
                con,
                RowActionType::Delete,
                SourceSiteId::SourceSiteId(source_site_id),
            )?,
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        repo._delete(&self.0)?;
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            DiagnosisRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

use super::diagnosis_row::diagnosis::dsl::*;
use crate::{
    ChangelogRepository, RepositoryError, RowActionType, SourceSiteId, StorageConnection,
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

    pub(crate) fn _upsert_one(&self, row: &DiagnosisRow) -> Result<(), RepositoryError> {
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

    pub fn check_exists_by_id(&self, diagnosis_id: &str) -> Result<bool, RepositoryError> {
        let exists: bool = diesel::select(diesel::dsl::exists(
            diagnosis.filter(id.eq(diagnosis_id)),
        ))
        .get_result(self.connection.lock().connection())?;
        Ok(exists)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<DiagnosisRow>, RepositoryError> {
        Ok(diagnosis
            .filter(id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    pub(crate) fn _delete(&self, diagnosis_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(diagnosis.filter(id.eq(diagnosis_id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub(crate) fn delete_no_changelog(&self, record_id: &str) -> Result<(), RepositoryError> {
        self._delete(record_id)
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


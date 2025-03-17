use super::diagnosis_row::diagnosis::dsl::*;
use crate::RepositoryError;
use crate::StorageConnection;
use crate::Upsert;
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

    pub fn upsert_one(&self, row: &DiagnosisRow) -> Result<(), RepositoryError> {
        diesel::insert_into(diagnosis)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
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

    pub fn delete(&self, diagnosis_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(diagnosis.filter(id.eq(diagnosis_id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for DiagnosisRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        DiagnosisRowRepository::new(con).upsert_one(self)?;
        Ok(None) // Table not in Changelog
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            DiagnosisRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

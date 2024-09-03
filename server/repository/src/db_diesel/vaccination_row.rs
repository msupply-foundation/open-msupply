use crate::{
    ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RepositoryError, RowActionType,
    StorageConnection, Upsert,
};

use super::{
    clinician_link_row::clinician_link, clinician_row::clinician,
    vaccination_row::vaccination::dsl::*,
    vaccine_course::vaccine_course_dose_row::vaccine_course_dose,
};

use chrono::{NaiveDate, NaiveDateTime};
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

use diesel::prelude::*;

table! {
    vaccination (id) {
        id -> Text,
        store_id -> Text,
        program_id -> Text,
        encounter_id -> Text,
        user_id -> Text,
        vaccine_course_dose_id -> Text,
        created_datetime -> Timestamp,
        invoice_id -> Nullable<Text>,
        clinician_link_id -> Nullable<Text>,
        vaccination_date -> Date,
        given -> Bool,
        not_given_reason -> Nullable<Text>,
        comment -> Nullable<Text>,
    }
}

joinable!(vaccination -> clinician_link (clinician_link_id));
joinable!(vaccination -> vaccine_course_dose (vaccine_course_dose_id));

allow_tables_to_appear_in_same_query!(vaccination, clinician_link);
allow_tables_to_appear_in_same_query!(vaccination, clinician);
allow_tables_to_appear_in_same_query!(vaccination, vaccine_course_dose);
allow_tables_to_appear_in_same_query!(vaccine_course_dose, clinician_link);
allow_tables_to_appear_in_same_query!(vaccine_course_dose, clinician);

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize, Default,
)]
#[diesel(table_name = vaccination)]
#[diesel(treat_none_as_null = true)]
pub struct VaccinationRow {
    pub id: String,
    pub store_id: String,
    pub program_id: String,
    pub encounter_id: String,
    pub user_id: String,
    pub vaccine_course_dose_id: String,
    pub created_datetime: NaiveDateTime,
    pub invoice_id: Option<String>,
    pub clinician_link_id: Option<String>,
    pub vaccination_date: NaiveDate,
    pub given: bool,
    pub not_given_reason: Option<String>,
    pub comment: Option<String>,
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum VaccinationStatus {
    #[default]
    Draft,
    Finalised,
}

pub struct VaccinationRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> VaccinationRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        VaccinationRowRepository { connection }
    }

    pub fn _upsert_one(&self, vaccination_row: &VaccinationRow) -> Result<(), RepositoryError> {
        diesel::insert_into(vaccination)
            .values(vaccination_row)
            .on_conflict(id)
            .do_update()
            .set(vaccination_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, vaccination_row: &VaccinationRow) -> Result<i64, RepositoryError> {
        self._upsert_one(vaccination_row)?;
        self.insert_changelog(vaccination_row.to_owned(), RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row: VaccinationRow,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::Vaccination,
            record_id: row.id,
            row_action: action,
            store_id: Some(row.store_id),
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_one_by_id(
        &self,
        vaccination_id: &str,
    ) -> Result<Option<VaccinationRow>, RepositoryError> {
        let result = vaccination
            .filter(id.eq(vaccination_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, vaccination_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(vaccination)
            .filter(id.eq(vaccination_id))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for VaccinationRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let cursor_id = VaccinationRowRepository::new(con).upsert_one(self)?;
        Ok(Some(cursor_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            VaccinationRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

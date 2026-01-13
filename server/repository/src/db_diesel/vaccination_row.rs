use crate::{
    ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RepositoryError, RowActionType,
    StorageConnection, Upsert,
};
use crate::diesel_macros::define_linked_tables;

use super::{
    clinician_link_row::clinician_link, clinician_row::clinician, item_link_row::item_link,
    item_row::item, name_row::name, name_store_join::name_store_join,
    store_row::store,
    vaccine_course::vaccine_course_dose_row::vaccine_course_dose,
};

use chrono::{NaiveDate, NaiveDateTime};
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

use diesel::prelude::*;

define_linked_tables! {
    view: vaccination = "vaccination_view",
    core: vaccination_with_links = "vaccination",
    struct: VaccinationRow,
    repo: VaccinationRowRepository,
    shared: {
        store_id -> Text,
        given_store_id -> Nullable<Text>,
        program_enrolment_id -> Text,
        encounter_id -> Text,
        user_id -> Text,
        vaccine_course_dose_id -> Text,
        created_datetime -> Timestamp,
        facility_free_text -> Nullable<Text>,
        invoice_id -> Nullable<Text>,
        stock_line_id -> Nullable<Text>,
        item_link_id -> Nullable<Text>,
        clinician_link_id -> Nullable<Text>,
        vaccination_date -> Date,
        given -> Bool,
        not_given_reason -> Nullable<Text>,
        comment -> Nullable<Text>,
    },
    links: {
        patient_link_id -> patient_id,
    },
    optional_links: {
        facility_name_link_id -> facility_name_id,
    }
}

joinable!(vaccination -> clinician_link (clinician_link_id));
joinable!(vaccination -> item_link (item_link_id));
joinable!(vaccination -> vaccine_course_dose (vaccine_course_dose_id));

allow_tables_to_appear_in_same_query!(vaccination, name);
allow_tables_to_appear_in_same_query!(vaccination, clinician_link);
allow_tables_to_appear_in_same_query!(vaccination, clinician);
allow_tables_to_appear_in_same_query!(vaccination, item_link);
allow_tables_to_appear_in_same_query!(vaccination, item);
allow_tables_to_appear_in_same_query!(vaccination, vaccine_course_dose);
allow_tables_to_appear_in_same_query!(vaccination, name_store_join);
allow_tables_to_appear_in_same_query!(vaccination, store);

#[derive(
    Clone, Queryable, Debug, PartialEq, Eq, Serialize, Deserialize, Default,
)]
#[diesel(table_name = vaccination)]
pub struct VaccinationRow {
    pub id: String,
    // Store where record was originally created
    pub store_id: String,
    // Store where vaccination was marked as Given
    pub given_store_id: Option<String>,
    pub program_enrolment_id: String,
    pub encounter_id: String,
    pub user_id: String,
    pub vaccine_course_dose_id: String,
    pub created_datetime: NaiveDateTime,
    pub facility_free_text: Option<String>,
    pub invoice_id: Option<String>,
    pub stock_line_id: Option<String>,
    pub item_link_id: Option<String>,
    pub clinician_link_id: Option<String>,
    /// Event date (e.g. date given, or date marked not given)
    pub vaccination_date: NaiveDate,
    pub given: bool,
    pub not_given_reason: Option<String>,
    pub comment: Option<String>,
    // Resolved from name_link - must be last to match view column order
    pub patient_id: String,
    pub facility_name_id: Option<String>,
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
        self._upsert(vaccination_row)?;
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
            store_id: None,
            name_link_id: Some(row.patient_id),
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_one_by_id(
        &self,
        vaccination_id: &str,
    ) -> Result<Option<VaccinationRow>, RepositoryError> {
        let result = vaccination::table
            .filter(vaccination::id.eq(vaccination_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, vaccination_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(vaccination_with_links::table.filter(vaccination_with_links::id.eq(vaccination_id)))
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

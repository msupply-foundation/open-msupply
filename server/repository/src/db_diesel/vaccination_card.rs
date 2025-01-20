use super::StorageConnection;

use crate::{diesel_macros::apply_equal_filter, EqualFilter, RepositoryError};
use diesel::prelude::*;

table! {
    vaccination_card (id) {
        id -> Text,
        vaccine_course_id -> Text,
        vaccine_course_dose_id -> Text,
        label -> Text,
        min_interval_days -> Integer,
        min_age -> Double,
        max_age -> Double,
        custom_age_label -> Nullable<Text>,
        program_enrolment_id -> Text,
        vaccination_id -> Nullable<Text>,
        vaccination_date -> Nullable<Date>,
        given -> Nullable<Bool>,
        stock_line_id -> Nullable<Text>,
        facility_name_id -> Nullable<Text>,
        facility_free_text -> Nullable<Text>,
        batch -> Nullable<Text>,
    }
}

use chrono::NaiveDate;

#[derive(Clone, Queryable, Debug, PartialEq, Default)]
#[diesel(table_name = vaccination_card)]
pub struct VaccinationCardRow {
    pub id: String,
    pub vaccine_course_id: String,
    pub vaccine_course_dose_id: String,
    pub label: String,
    pub min_interval_days: i32,
    pub min_age: f64,
    pub max_age: f64,
    pub custom_age_label: Option<String>,
    pub program_enrolment_id: String,
    pub vaccination_id: Option<String>,
    pub vaccination_date: Option<NaiveDate>,
    pub given: Option<bool>,
    pub stock_line_id: Option<String>,
    pub facility_name_id: Option<String>,
    pub facility_free_text: Option<String>,
    pub batch: Option<String>,
}

pub struct VaccinationCardRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> VaccinationCardRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        VaccinationCardRepository { connection }
    }

    pub fn query_by_enrolment_id(
        &self,
        program_enrolment_id: String,
    ) -> Result<Vec<VaccinationCardRow>, RepositoryError> {
        let mut query = vaccination_card::table.into_boxed();

        apply_equal_filter!(
            query,
            Some(EqualFilter::equal_to(&program_enrolment_id)),
            vaccination_card::program_enrolment_id
        );

        Ok(query
            .order(vaccination_card::min_age.asc())
            .load::<VaccinationCardRow>(self.connection.lock().connection())?)
    }
}

use super::{ItemType, StorageConnection};

use crate::RepositoryError;
use diesel::prelude::*;

// This is a view
table! {
    vaccination_course (id) {
        id -> Text,
        vaccine_course_name -> Text,
        coverage_rate -> Double,
        wastage_rate -> Double,
        vaccine_course_dose_id -> Text,
        dose_label -> Text,
        min_interval_days -> Integer,
        min_age -> Double,
        max_age -> Double,
        custom_age_label -> Nullable<Text>,
        vaccine_course_item_id -> Text,
        item_id -> Text,
        item_link_id -> Text,
        item_name -> Text,
        item_code -> Text,
        item_type -> crate::db_diesel::item_row::ItemTypeMapping,
        default_pack_size -> Double,
        is_vaccine_item -> Bool,
        vaccine_doses -> Integer,
        unit_id -> Nullable<Text>,
        unit -> Nullable<Text>,
        unit_index -> Nullable<Integer>,
        demographic_id -> Nullable<Text>,
        demographic_name -> Nullable<Text>,
        population_percentage -> Nullable<Double>,
        program_id  -> Nullable<Text>,
        program_name -> Nullable<Text>,
    }
}

#[derive(Clone, Queryable, Selectable, Debug, PartialEq)]
#[diesel(table_name = vaccination_course)]
pub struct VaccinationCourseRow {
    pub id: String,
    pub vaccine_course_name: String,
    pub coverage_rate: f64,
    pub wastage_rate: f64,
    pub vaccine_course_dose_id: String,
    pub dose_label: String,
    pub min_interval_days: i32,
    pub min_age: f64,
    pub max_age: f64,
    pub custom_age_label: Option<String>,
    pub vaccine_course_item_id: String,
    pub item_link_id: String,
    pub item_id: String,
    pub item_name: String,
    pub item_code: String,
    pub item_type: ItemType,
    pub default_pack_size: f64,
    pub is_vaccine_item: bool,
    pub vaccine_doses: i32,
    pub unit_id: Option<String>,
    pub unit: Option<String>,
    pub unit_index: Option<i32>,
    pub demographic_id: Option<String>,
    pub demographic_name: Option<String>,
    pub population_percentage: Option<f64>,
    pub program_id: Option<String>,
    pub program_name: Option<String>,
}

pub struct VaccinationCourseRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> VaccinationCourseRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        VaccinationCourseRepository { connection }
    }

    pub fn query_by_item_id(
        &self,
        item_id: String,
    ) -> Result<Vec<VaccinationCourseRow>, RepositoryError> {
        let query = vaccination_course::table
            .filter(vaccination_course::item_id.eq(item_id.clone()))
            .select(VaccinationCourseRow::as_select());

        Ok(query
            .order(vaccination_course::min_age.asc())
            .load::<VaccinationCourseRow>(self.connection.lock().connection())?)
    }
}

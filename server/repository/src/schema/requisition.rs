use super::diesel_schema::requisition;
use chrono::{NaiveDate, NaiveDateTime};
use diesel_derive_enum::DbEnum;
use util::Defaults;

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum RequisitionRowType {
    Request,
    Response,
}
#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum RequisitionRowStatus {
    Draft,
    New,
    Sent,
    Finalised,
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq)]
#[table_name = "requisition"]
pub struct RequisitionRow {
    pub id: String,
    pub requisition_number: i64,
    pub name_id: String,
    pub store_id: String,
    pub user_id: Option<String>,
    #[column_name = "type_"]
    pub r#type: RequisitionRowType,
    pub status: RequisitionRowStatus,
    pub created_datetime: NaiveDateTime,
    pub sent_datetime: Option<NaiveDateTime>,
    pub finalised_datetime: Option<NaiveDateTime>,
    pub expected_delivery_date: Option<NaiveDate>,
    pub colour: Option<String>,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
    pub max_months_of_stock: f64,
    pub min_months_of_stock: f64,
    pub linked_requisition_id: Option<String>,
}

impl Default for RequisitionRow {
    fn default() -> Self {
        Self {
            r#type: RequisitionRowType::Request,
            status: RequisitionRowStatus::Draft,
            created_datetime: Defaults::naive_date_time(),
            // Defaults
            id: Default::default(),
            user_id: Default::default(),
            requisition_number: Default::default(),
            name_id: Default::default(),
            store_id: Default::default(),
            sent_datetime: Default::default(),
            finalised_datetime: Default::default(),
            expected_delivery_date: Default::default(),
            colour: Default::default(),
            comment: Default::default(),
            their_reference: Default::default(),
            max_months_of_stock: Default::default(),
            min_months_of_stock: Default::default(),
            linked_requisition_id: Default::default(),
        }
    }
}

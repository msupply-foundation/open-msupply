use super::diesel_schema::requisition;
use chrono::{NaiveDate, NaiveDateTime};
use diesel_derive_enum::DbEnum;

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
    #[column_name = "type_"]
    pub r#type: RequisitionRowType,
    pub status: RequisitionRowStatus,
    pub created_datetime: NaiveDateTime,
    pub sent_datetime: Option<NaiveDateTime>,
    pub finalised_datetime: Option<NaiveDateTime>,
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
            id: "".to_string(),
            requisition_number: 1,
            name_id: "".to_string(),
            store_id: "".to_string(),
            r#type: RequisitionRowType::Request,
            status: RequisitionRowStatus::Draft,
            created_datetime: NaiveDate::from_ymd(2022, 1, 22).and_hms(15, 16, 0),
            sent_datetime: None,
            finalised_datetime: None,
            colour: None,
            comment: None,
            their_reference: None,
            max_months_of_stock: 1.5,
            min_months_of_stock: 1.5,
            linked_requisition_id: None,
        }
    }
}

use super::diesel_schema::requisition;
use diesel_derive_enum::DbEnum;

#[derive(sqlx::Type)]
#[sqlx(rename = "requisition_type")]
#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
pub enum RequisitionRowType {
    #[sqlx(rename = "imprest")]
    Imprest,
    #[sqlx(rename = "stock_history")]
    StockHistory,
    #[sqlx(rename = "request")]
    Request,
    #[sqlx(rename = "response")]
    Response,
    #[sqlx(rename = "supply")]
    Supply,
    #[sqlx(rename = "report")]
    Report,
}

#[derive(Clone, Queryable, Insertable)]
#[table_name = "requisition"]
pub struct RequisitionRow {
    pub id: String,
    pub name_id: String,
    pub store_id: String,
    pub type_of: RequisitionRowType,
}

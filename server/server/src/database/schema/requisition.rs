use super::diesel_schema::requisition;
use diesel_derive_enum::DbEnum;

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
pub enum RequisitionRowType {
    Imprest,
    StockHistory,
    Request,
    Response,
    Supply,
    Report,
}

#[derive(Clone, Queryable, Insertable, Debug, PartialEq, Eq)]
#[table_name = "requisition"]
pub struct RequisitionRow {
    pub id: String,
    pub name_id: String,
    pub store_id: String,
    pub type_of: RequisitionRowType,
}

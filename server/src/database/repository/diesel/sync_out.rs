use super::diesel_schema::sync_out;
use diesel_derive_enum::DbEnum;

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
pub enum SyncOutRowTableType {
    Requisition,
    RequisitionLine,
    Item,
    ItemLine,
    Transact,
    TransactLine,
    Name,
    Store,
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
pub enum SyncOutRowActionType {
    Insert,
    Update,
    Delete,
    Patch,
}

#[derive(Clone, Queryable, Insertable, Debug, PartialEq, Eq)]
#[table_name = "sync_out"]
pub struct TransactRow {
    pub id: String,
    pub created_at: String,
    pub table_name: SyncOutRowTableType,
    pub record_id: String,
    pub store_id: String,
    pub site_id: String,
    pub action: SyncOutRowActionType,
}

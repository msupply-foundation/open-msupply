use diesel_derive_enum::DbEnum;

table! {
    sync_out (id) {
        id -> Text,
        created_at -> Date,
        table_name -> crate::schema::sync_out::SyncOutRowTableNameTypeMapping,
        record_id -> Text,
        store_id -> Text,
        site_id -> Integer,
        action -> crate::schema::sync_out::SyncOutRowActionTypeMapping,
    }
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
pub enum SyncOutRowTableNameType {
    Requisition,
    RequisitionLine,
    Item,
    StockLine,
    Invoice,
    InvoiceLine,
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
pub struct SyncOutRow {
    pub id: String,
    pub created_at: String,
    pub table_name: SyncOutRowTableNameType,
    pub record_id: String,
    pub store_id: String,
    pub site_id: i32,
    pub action: SyncOutRowActionType,
}

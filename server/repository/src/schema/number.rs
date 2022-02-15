use diesel_derive_enum::DbEnum;

use super::diesel_schema::number;

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum NumberRowType {
    InboundShipment,
    OutboundShipment,
    InventoryAdjustment,
    RequestRequisition,
    Stocktake,
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, Eq, AsChangeset)]
#[table_name = "number"]
pub struct NumberRow {
    pub id: String,
    pub value: i64,
    /// Note, store id will be needed mainly for sync.
    pub store_id: String,
    // Table
    #[column_name = "type_"]
    pub r#type: NumberRowType,
}

use diesel_derive_enum::DbEnum;

table! {
  user_permission (id) {
      id -> Text,
      user_id -> Text,
      store_id -> Nullable<Text>,
      permission -> crate::schema::user_permission::PermissionMapping,
  }
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Hash)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum Permission {
    ServerAdmin,

    /// User has access to the store this permission is associated with.
    /// This acts like a master switch to enable/disable all user's permissions associated with a store.
    StoreAccess,
    // location,
    LocationMutate,
    // stock line
    StockLineQuery,
    // stocktake
    StocktakeQuery,
    StocktakeMutate,
    // requisition
    RequisitionQuery,
    RequisitionMutate,
    // outbound shipment
    OutboundShipmentQuery,
    OutboundShipmentMutate,
    // inbound shipment
    InboundShipmentQuery,
    InboundShipmentMutate,
    // reporting
    Report,
}

#[derive(Clone, Queryable, Insertable, Debug, PartialEq, Eq, AsChangeset)]
#[table_name = "user_permission"]
pub struct UserPermissionRow {
    pub id: String,
    pub user_id: String,
    pub store_id: Option<String>,
    pub permission: Permission,
}

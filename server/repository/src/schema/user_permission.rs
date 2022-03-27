use diesel_derive_enum::DbEnum;

table! {
  user_permission (id) {
      id -> Text,
      user_id -> Text,
      store_id -> Nullable<Text>,
      resource -> crate::schema::user_permission::ResourceMapping,
      permission -> crate::schema::user_permission::PermissionMapping,
  }
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum Resource {
    Stocktake,
    InboundShipment,
    OutboundShipment,
    Requisition,
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum Permission {
    Query,
    /// Edit + Delete
    Mutate,
}

#[derive(Clone, Queryable, Insertable, Debug, PartialEq, Eq)]
#[table_name = "user_permission"]
pub struct UserPermissionRow {
    pub id: String,
    pub user_id: String,
    pub store_id: Option<String>,
    pub resource: Resource,
    pub permission: Permission,
}

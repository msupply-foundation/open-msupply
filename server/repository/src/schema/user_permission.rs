use diesel_derive_enum::DbEnum;

use crate::EqualFilter;

table! {
  user_permission (id) {
      id -> Text,
      user_id -> Text,
      store_id -> Nullable<Text>,
      resource -> crate::schema::user_permission::ResourceMapping,
      permission -> crate::schema::user_permission::PermissionMapping,
  }
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Hash)]
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

#[derive(Clone, Queryable, Insertable, Debug, PartialEq, Eq, AsChangeset)]
#[table_name = "user_permission"]
pub struct UserPermissionRow {
    pub id: String,
    pub user_id: String,
    pub store_id: Option<String>,
    pub resource: Resource,
    pub permission: Permission,
}

impl Resource {
    pub fn equal_to(&self) -> EqualFilter<Resource> {
        EqualFilter {
            equal_to: Some(self.clone()),
            not_equal_to: None,
            equal_any: None,
            not_equal_all: None,
        }
    }
}

impl Permission {
    pub fn equal_to(&self) -> EqualFilter<Permission> {
        EqualFilter {
            equal_to: Some(self.clone()),
            not_equal_to: None,
            equal_any: None,
            not_equal_all: None,
        }
    }
}

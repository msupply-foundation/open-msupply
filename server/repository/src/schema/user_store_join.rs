table! {
  user_store_join (id) {
      id -> Text,
      user_id -> Text,
      store_id -> Text,
      is_default -> Bool,
  }
}

#[derive(Clone, Queryable, Insertable, Debug, PartialEq, Eq, AsChangeset, Default)]
#[table_name = "user_store_join"]
pub struct UserStoreJoinRow {
    pub id: String,
    pub user_id: String,
    pub store_id: String,
    pub is_default: bool,
}

table! {
  user_store_join (id) {
      id -> Text,
      user_id -> Text,
      store_id -> Text,
  }
}

#[derive(Clone, Queryable, Insertable, Debug, PartialEq, Eq, AsChangeset, Default)]
#[table_name = "user_store_join"]
pub struct UserStoreJoinRow {
    pub id: String,
    pub user_id: String,
    pub store_id: String,
}

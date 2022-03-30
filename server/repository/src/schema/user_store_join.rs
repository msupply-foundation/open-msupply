use super::diesel_schema::{store, user_account};

table! {
  user_store_join (id) {
      id -> Text,
      user_id -> Text,
      store_id -> Text,
      is_default -> Bool,
  }
}

joinable!(user_store_join -> user_account (user_id));
joinable!(user_store_join -> store (store_id));

allow_tables_to_appear_in_same_query!(user_store_join, user_account);
allow_tables_to_appear_in_same_query!(user_store_join, store);

#[derive(Clone, Queryable, Insertable, Debug, PartialEq, Eq, AsChangeset, Default)]
#[table_name = "user_store_join"]
pub struct UserStoreJoinRow {
    pub id: String,
    pub user_id: String,
    pub store_id: String,
    pub is_default: bool,
}

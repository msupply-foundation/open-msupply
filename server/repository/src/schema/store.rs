table! {
    store (id) {
        id -> Text,
        name_id -> Text,
        code -> Text,
        remote_site_id -> Integer,
    }
}

#[derive(Clone, Queryable, Insertable, Debug, PartialEq, Eq, AsChangeset, Default)]
#[table_name = "store"]
pub struct StoreRow {
    pub id: String,
    pub name_id: String,
    pub code: String,
    pub remote_site_id: i32,
}
